import {
    NextResponse,
} from "next/server";
import {
    createClient,
    type SupabaseClient,
    type User,
} from "@supabase/supabase-js";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

type ProfileRow = {
    id: string;
    full_name:
        | string
        | null;
    email:
        | string
        | null;
    role:
        | string
        | null;
    platform_role:
        | string
        | null;
    company_id:
        | string
        | null;
};

type RequesterContext = {
    user: User;
    profile:
        | ProfileRow
        | null;
    isPlatformAdmin: boolean;
    isCompanyAdmin: boolean;
    companyId:
        | string
        | null;
};

type DeleteRequest = {
    userId?: unknown;
};

type CleanupResult = {
    table: string;
    column: string;
    affected:
        | number
        | null;
};

class DeleteUserError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(
            message,
        );
        this.name =
            "DeleteUserError";
        this.status =
            status;
    }
}

const COMPATIBILITY_CODES =
    new Set([
        "42P01",
        "42703",
        "PGRST116",
        "PGRST204",
        "PGRST205",
    ]);

function reply(
    body: Record<
        string,
        unknown
    >,
    status = 200,
) {
    return NextResponse.json(
        body,
        {
            status,
            headers: {
                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",
            },
        },
    );
}

function normalise(
    value: unknown,
) {
    return String(
        value ||
            "",
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            "_",
        );
}

function isUuid(
    value: string,
) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function isCompatibilityError(
    error:
        | {
              code?: unknown;
          }
        | null
        | undefined,
) {
    return COMPATIBILITY_CODES.has(
        String(
            error?.code ||
                "",
        ),
    );
}

function serviceClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (
        !url ||
        !serviceRoleKey
    ) {
        throw new DeleteUserError(
            "Supabase server configuration is incomplete.",
            500,
        );
    }

    return createClient(
        url,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken:
                    false,
                persistSession:
                    false,
            },
        },
    );
}

function bearerToken(
    request: Request,
) {
    const authorization =
        request.headers.get(
            "authorization",
        ) ||
        "";
    const match =
        authorization.match(
            /^Bearer\s+(.+)$/i,
        );

    return match?.[1]
        ?.trim() ||
        "";
}

async function readProfile(
    admin: SupabaseClient,
    userId: string,
) {
    const primary =
        await admin
            .from(
                "profiles",
            )
            .select(
                "id, full_name, email, role, platform_role, company_id",
            )
            .eq(
                "id",
                userId,
            )
            .maybeSingle();

    if (
        primary.error &&
        String(
            primary.error
                .code ||
                "",
        ) ===
            "42703"
    ) {
        const fallback =
            await admin
                .from(
                    "profiles",
                )
                .select(
                    "id, full_name, email, role, company_id",
                )
                .eq(
                    "id",
                    userId,
                )
                .maybeSingle();

        if (
            fallback.error &&
            !isCompatibilityError(
                fallback.error,
            )
        ) {
            throw new DeleteUserError(
                fallback.error
                    .message,
                500,
            );
        }

        if (
            !fallback.data
        ) {
            return null;
        }

        return {
            ...fallback.data,
            platform_role:
                null,
        } as unknown as ProfileRow;
    }

    if (
        primary.error
    ) {
        if (
            isCompatibilityError(
                primary.error,
            )
        ) {
            return null;
        }

        throw new DeleteUserError(
            primary.error
                .message,
            500,
        );
    }

    return (
        primary.data ||
        null
    ) as unknown as
        | ProfileRow
        | null;
}

async function requesterContext(
    request: Request,
    admin: SupabaseClient,
): Promise<RequesterContext> {
    const token =
        bearerToken(
            request,
        );

    if (
        !token
    ) {
        throw new DeleteUserError(
            "Your login session could not be verified.",
            401,
        );
    }

    const {
        data: {
            user,
        },
        error:
            userError,
    } =
        await admin.auth.getUser(
            token,
        );

    if (
        userError ||
        !user
    ) {
        throw new DeleteUserError(
            "Your login session has expired. Sign in again.",
            401,
        );
    }

    const profile =
        await readProfile(
            admin,
            user.id,
        );
    const platformRole =
        normalise(
            profile
                ?.platform_role,
        );
    const profileRole =
        normalise(
            profile?.role,
        );
    const companyId =
        profile?.company_id ||
        null;
    const isPlatformAdmin =
        [
            "super_admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            platformRole,
        ) ||
        (
            !companyId &&
            [
                "super_admin",
                "platform_admin",
            ].includes(
                profileRole,
            )
        );
    const isCompanyAdmin =
        Boolean(
            companyId,
        ) &&
        [
            "admin",
            "administrator",
            "owner",
            "company_admin",
            "company-admin",
        ].includes(
            profileRole,
        );

    if (
        !isPlatformAdmin &&
        !isCompanyAdmin
    ) {
        throw new DeleteUserError(
            "Only a RegiGo platform administrator or company administrator can delete users.",
            403,
        );
    }

    return {
        user,
        profile,
        isPlatformAdmin,
        isCompanyAdmin,
        companyId,
    };
}

async function authUserById(
    admin: SupabaseClient,
    userId: string,
) {
    const result =
        await admin.auth.admin.getUserById(
            userId,
        );

    if (
        result.error
    ) {
        const message =
            result.error.message
                .toLowerCase();

        if (
            message.includes(
                "not found",
            ) ||
            message.includes(
                "no user",
            )
        ) {
            return null;
        }

        throw new DeleteUserError(
            result.error
                .message,
            500,
        );
    }

    return (
        result.data.user ||
        null
    );
}

async function verifyAccess({
    requester,
    targetProfile,
}: {
    requester:
        RequesterContext;
    targetProfile:
        | ProfileRow
        | null;
}) {
    if (
        requester.isPlatformAdmin
    ) {
        return;
    }

    if (
        !requester.companyId
    ) {
        throw new DeleteUserError(
            "Your account is not assigned to an event company.",
            403,
        );
    }

    if (
        !targetProfile ||
        targetProfile.company_id !==
            requester.companyId
    ) {
        throw new DeleteUserError(
            "You can delete only users belonging to your own event company.",
            403,
        );
    }

    const targetPlatformRole =
        normalise(
            targetProfile
                .platform_role,
        );

    if (
        [
            "super_admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            targetPlatformRole,
        )
    ) {
        throw new DeleteUserError(
            "A company administrator cannot delete the RegiGo platform administrator.",
            403,
        );
    }
}

async function storageObjectCount(
    admin: SupabaseClient,
    userId: string,
) {
    const storage =
        admin.schema(
            "storage",
        );

    const ownerIdResult =
        await storage
            .from(
                "objects",
            )
            .select(
                "id",
                {
                    count:
                        "exact",
                    head:
                        true,
                },
            )
            .eq(
                "owner_id",
                userId,
            );

    if (
        !ownerIdResult.error
    ) {
        return ownerIdResult.count ||
            0;
    }

    if (
        !isCompatibilityError(
            ownerIdResult.error,
        )
    ) {
        throw new DeleteUserError(
            ownerIdResult.error
                .message,
            500,
        );
    }

    const ownerResult =
        await storage
            .from(
                "objects",
            )
            .select(
                "id",
                {
                    count:
                        "exact",
                    head:
                        true,
                },
            )
            .eq(
                "owner",
                userId,
            );

    if (
        ownerResult.error
    ) {
        if (
            isCompatibilityError(
                ownerResult.error,
            )
        ) {
            return 0;
        }

        throw new DeleteUserError(
            ownerResult.error
                .message,
            500,
        );
    }

    return ownerResult.count ||
        0;
}

async function deleteRows({
    admin,
    table,
    column,
    value,
}: {
    admin:
        SupabaseClient;
    table: string;
    column: string;
    value: string;
}): Promise<CleanupResult> {
    const result =
        await admin
            .from(
                table,
            )
            .delete({
                count:
                    "exact",
            })
            .eq(
                column,
                value,
            );

    if (
        result.error
    ) {
        if (
            isCompatibilityError(
                result.error,
            )
        ) {
            return {
                table,
                column,
                affected:
                    null,
            };
        }

        throw new DeleteUserError(
            `Unable to remove ${table}.${column}: ${result.error.message}`,
            500,
        );
    }

    return {
        table,
        column,
        affected:
            result.count ??
            0,
    };
}

async function clearCompanyOwnership(
    admin: SupabaseClient,
    userId: string,
) {
    const result =
        await admin
            .from(
                "companies",
            )
            .update({
                owner_user_id:
                    null,
                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                "owner_user_id",
                userId,
            );

    if (
        result.error &&
        !isCompatibilityError(
            result.error,
        )
    ) {
        throw new DeleteUserError(
            `Unable to clear company ownership: ${result.error.message}`,
            500,
        );
    }
}

async function cleanupReferences({
    admin,
    userId,
    email,
}: {
    admin:
        SupabaseClient;
    userId: string;
    email: string;
}) {
    await clearCompanyOwnership(
        admin,
        userId,
    );

    const userReferences = [
        [
            "event_members",
            "profile_id",
        ],
        [
            "event_members",
            "user_id",
        ],
        [
            "company_members",
            "user_id",
        ],
        [
            "company_members",
            "profile_id",
        ],
        [
            "staff",
            "profile_id",
        ],
        [
            "staff",
            "user_id",
        ],
        [
            "user_event_assignments",
            "user_id",
        ],
        [
            "user_event_assignments",
            "profile_id",
        ],
        [
            "event_user_permissions",
            "user_id",
        ],
        [
            "event_user_permissions",
            "profile_id",
        ],
        [
            "team_members",
            "user_id",
        ],
        [
            "team_members",
            "profile_id",
        ],
        [
            "profiles",
            "id",
        ],
    ] as const;

    const cleanup:
        CleanupResult[] =
        [];

    for (const [
        table,
        column,
    ] of userReferences) {
        cleanup.push(
            await deleteRows({
                admin,
                table,
                column,
                value:
                    userId,
            }),
        );
    }

    if (
        email
    ) {
        const emailReferences = [
            [
                "company_invitations",
                "email",
            ],
            [
                "user_invitations",
                "email",
            ],
            [
                "team_invitations",
                "email",
            ],
        ] as const;

        for (const [
            table,
            column,
        ] of emailReferences) {
            cleanup.push(
                await deleteRows({
                    admin,
                    table,
                    column,
                    value:
                        email,
                }),
            );
        }
    }

    return cleanup;
}

async function verifyDeleted(
    admin: SupabaseClient,
    userId: string,
) {
    const authResult =
        await admin.auth.admin.getUserById(
            userId,
        );
    const authDeleted =
        Boolean(
            authResult.error,
        ) ||
        !authResult.data
            .user;

    const profileResult =
        await admin
            .from(
                "profiles",
            )
            .select(
                "id",
            )
            .eq(
                "id",
                userId,
            )
            .maybeSingle();
    const profileDeleted =
        !profileResult.data;

    if (
        profileResult.error &&
        !isCompatibilityError(
            profileResult.error,
        )
    ) {
        throw new DeleteUserError(
            profileResult.error
                .message,
            500,
        );
    }

    return {
        authDeleted,
        profileDeleted,
    };
}

export async function DELETE(
    request: Request,
) {
    try {
        const admin =
            serviceClient();
        const requester =
            await requesterContext(
                request,
                admin,
            );
        const body =
            (await request.json()) as DeleteRequest;
        const userId =
            String(
                body.userId ||
                    "",
            ).trim();

        if (
            !userId ||
            !isUuid(
                userId,
            )
        ) {
            throw new DeleteUserError(
                "A valid user ID is required.",
            );
        }

        if (
            requester.user.id ===
            userId
        ) {
            throw new DeleteUserError(
                "You cannot delete the account currently signed in.",
                409,
            );
        }

        const [
            targetProfile,
            targetAuthUser,
        ] =
            await Promise.all([
                readProfile(
                    admin,
                    userId,
                ),
                authUserById(
                    admin,
                    userId,
                ),
            ]);

        if (
            !targetProfile &&
            !targetAuthUser
        ) {
            throw new DeleteUserError(
                "The user no longer exists.",
                404,
            );
        }

        await verifyAccess({
            requester,
            targetProfile,
        });

        const targetEmail =
            String(
                targetAuthUser
                    ?.email ||
                    targetProfile
                        ?.email ||
                    "",
            )
                .trim()
                .toLowerCase();

        const ownedStorageObjects =
            await storageObjectCount(
                admin,
                userId,
            );

        if (
            ownedStorageObjects >
            0
        ) {
            throw new DeleteUserError(
                `Deletion stopped because this user owns ${ownedStorageObjects} Storage file(s). Delete or reassign those files in Supabase Storage first.`,
                409,
            );
        }

        const cleanup =
            await cleanupReferences({
                admin,
                userId,
                email:
                    targetEmail,
            });

        let authDeleted =
            !targetAuthUser;

        if (
            targetAuthUser
        ) {
            const result =
                await admin.auth.admin.deleteUser(
                    userId,
                    false,
                );

            if (
                result.error
            ) {
                throw new DeleteUserError(
                    `The database references were cleared, but Supabase Auth could not delete the account: ${result.error.message}`,
                    500,
                );
            }

            authDeleted =
                true;
        }

        /*
         * Some older schemas do not cascade from auth.users to profiles.
         * Run a final profile cleanup after the Auth deletion.
         */
        await deleteRows({
            admin,
            table:
                "profiles",
            column:
                "id",
            value:
                userId,
        });

        const verification =
            await verifyDeleted(
                admin,
                userId,
            );

        if (
            !verification.authDeleted ||
            !verification.profileDeleted
        ) {
            throw new DeleteUserError(
                "The server could not confirm that the user was fully deleted.",
                500,
            );
        }

        return reply({
            success:
                true,
            message:
                targetEmail
                    ? `${targetEmail} was permanently deleted from RegiGo and Supabase Auth.`
                    : "The user was permanently deleted from RegiGo and Supabase Auth.",
            deletedUserId:
                userId,
            deletedEmail:
                targetEmail ||
                null,
            authDeleted,
            profileDeleted:
                verification.profileDeleted,
            cleanup,
        });
    } catch (error) {
        return reply(
            {
                success:
                    false,
                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to delete the user.",
            },
            error instanceof
            DeleteUserError
                ? error.status
                : 500,
        );
    }
}

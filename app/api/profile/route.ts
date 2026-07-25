import {
    NextResponse,
} from "next/server";
import {
    createClient,
    type SupabaseClient,
    type User,
} from "@supabase/supabase-js";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

class ProfileError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(
            message,
        );
        this.name =
            "ProfileError";
        this.status =
            status;
    }
}

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

function fail(
    error: unknown,
) {
    return reply(
        {
            error:
                error instanceof
                    Error
                    ? error.message
                    : "Unable to load the profile.",
        },
        error instanceof
        ProfileError
            ? error.status
            : 500,
    );
}

function adminClient() {
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
        throw new ProfileError(
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

function clean(
    value: unknown,
    maximum: number,
) {
    return typeof value ===
        "string"
        ? value
              .trim()
              .slice(
                  0,
                  maximum,
              )
        : "";
}

function normaliseRole(
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

function roleLabel({
    profileRole,
    platformRole,
    companyRole,
}: {
    profileRole: unknown;
    platformRole: unknown;
    companyRole: unknown;
}) {
    const platform =
        normaliseRole(
            platformRole,
        );
    const company =
        normaliseRole(
            companyRole,
        );
    const profile =
        normaliseRole(
            profileRole,
        );

    if (
        [
            "super_admin",
            "super-admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            platform,
        )
    ) {
        return "RegiGo Platform Admin";
    }

    if (
        [
            "owner",
            "admin",
            "administrator",
            "company_admin",
            "company-admin",
        ].includes(
            company,
        ) ||
        [
            "owner",
            "admin",
            "administrator",
            "company_admin",
            "company-admin",
        ].includes(
            profile,
        )
    ) {
        return "Company Admin";
    }

    if (
        [
            "organizer",
            "organiser",
            "manager",
            "event_manager",
            "event-manager",
        ].includes(
            company,
        ) ||
        [
            "organizer",
            "organiser",
            "manager",
            "event_manager",
            "event-manager",
        ].includes(
            profile,
        )
    ) {
        return "Organizer";
    }

    if (
        profile ===
        "scanner"
    ) {
        return "Scanner";
    }

    if (
        profile ===
        "viewer"
    ) {
        return "Viewer";
    }

    if (!profile) {
        return "Member";
    }

    return profile
        .split(
            "_",
        )
        .map(
            (
                word,
            ) =>
                word
                    .charAt(0)
                    .toUpperCase() +
                word.slice(
                    1,
                ),
        )
        .join(
            " ",
        );
}

function initials(
    fullName: string,
    email: string,
) {
    const parts =
        fullName
            .split(
                /\s+/,
            )
            .filter(
                Boolean,
            );

    if (
        parts.length >=
        2
    ) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    if (
        parts.length ===
        1
    ) {
        return parts[0]
            .slice(
                0,
                2,
            )
            .toUpperCase();
    }

    return email
        .slice(
            0,
            2,
        )
        .toUpperCase();
}

async function authenticatedUser() {
    const supabaseServer =
        await createSupabaseServerClient();
    const {
        data: {
            user,
        },
        error,
    } =
        await supabaseServer.auth.getUser();

    if (
        error ||
        !user
    ) {
        throw new ProfileError(
            "You must be logged in to view your profile.",
            401,
        );
    }

    return {
        user,
        admin:
            adminClient(),
    };
}

async function readProfileRow(
    admin: SupabaseClient,
    userId: string,
) {
    const primary =
        await admin
            .from(
                "profiles",
            )
            .select(
                "id, full_name, email, role, platform_role, company_id, created_at",
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
        ) === "42703"
    ) {
        const fallback =
            await admin
                .from(
                    "profiles",
                )
                .select(
                    "id, full_name, email, role, company_id, created_at",
                )
                .eq(
                    "id",
                    userId,
                )
                .maybeSingle();

        if (
            fallback.error
        ) {
            throw new ProfileError(
                fallback.error
                    .message,
            );
        }

        return {
            ...fallback.data,
            platform_role:
                null,
        };
    }

    if (
        primary.error
    ) {
        throw new ProfileError(
            primary.error
                .message,
        );
    }

    return primary.data;
}

async function loadProfile({
    admin,
    user,
}: {
    admin: SupabaseClient;
    user: User;
}) {
    const profile =
        await readProfileRow(
            admin,
            user.id,
        );
    const companyId =
        clean(
            profile?.company_id,
            80,
        );

    let companyName =
        "";
    let companyRole =
        "";
    let membershipStatus =
        "";

    if (companyId) {
        const [
            companyResult,
            membershipResult,
        ] =
            await Promise.all([
                admin
                    .from(
                        "companies",
                    )
                    .select(
                        "company_name",
                    )
                    .eq(
                        "id",
                        companyId,
                    )
                    .maybeSingle(),

                admin
                    .from(
                        "company_members",
                    )
                    .select(
                        "company_role, status",
                    )
                    .eq(
                        "company_id",
                        companyId,
                    )
                    .eq(
                        "user_id",
                        user.id,
                    )
                    .maybeSingle(),
            ]);

        if (
            !companyResult.error
        ) {
            companyName =
                clean(
                    companyResult.data
                        ?.company_name,
                    180,
                );
        }

        if (
            !membershipResult.error
        ) {
            companyRole =
                clean(
                    membershipResult.data
                        ?.company_role,
                    80,
                );
            membershipStatus =
                clean(
                    membershipResult.data
                        ?.status,
                    80,
                );
        }
    }

    const metadataName =
        clean(
            user.user_metadata
                ?.full_name ||
                user.user_metadata
                    ?.name,
            180,
        );
    const fullName =
        clean(
            profile?.full_name,
            180,
        ) ||
        metadataName;
    const email =
        clean(
            user.email ||
                profile?.email,
            320,
        );
    const label =
        roleLabel({
            profileRole:
                profile?.role,
            platformRole:
                profile?.platform_role,
            companyRole,
        });

    return {
        id:
            user.id,
        fullName,
        email,
        role:
            normaliseRole(
                profile?.role ||
                    companyRole,
            ),
        roleLabel:
            label,
        companyId:
            companyId ||
            null,
        companyName:
            companyName ||
            (
                label ===
                "RegiGo Platform Admin"
                    ? "RegiGo Platform"
                    : "No company assigned"
            ),
        membershipStatus:
            membershipStatus ||
            "active",
        initials:
            initials(
                fullName,
                email,
            ),
        createdAt:
            profile?.created_at ||
            user.created_at ||
            null,
    };
}

export async function GET() {
    try {
        const context =
            await authenticatedUser();
        const profile =
            await loadProfile(
                context,
            );

        return reply({
            success:
                true,
            profile,
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

export async function PATCH(
    request: Request,
) {
    try {
        const context =
            await authenticatedUser();
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const fullName =
            clean(
                body.fullName,
                180,
            );

        if (
            fullName.length <
            2
        ) {
            throw new ProfileError(
                "Enter your full name.",
            );
        }

        const current =
            await readProfileRow(
                context.admin,
                context.user.id,
            );
        const email =
            clean(
                context.user.email ||
                    current?.email,
                320,
            );

        if (current?.id) {
            const {
                error,
            } =
                await context.admin
                    .from(
                        "profiles",
                    )
                    .update({
                        full_name:
                            fullName,
                        email:
                            email ||
                            null,
                    })
                    .eq(
                        "id",
                        context.user.id,
                    );

            if (error) {
                throw new ProfileError(
                    error.message,
                );
            }
        } else {
            const {
                error,
            } =
                await context.admin
                    .from(
                        "profiles",
                    )
                    .insert({
                        id:
                            context.user.id,
                        full_name:
                            fullName,
                        email:
                            email ||
                            null,
                        role:
                            "organizer",
                    });

            if (error) {
                throw new ProfileError(
                    error.message,
                );
            }
        }

        const {
            error:
                metadataError,
        } =
            await context.admin.auth.admin.updateUserById(
                context.user.id,
                {
                    user_metadata: {
                        ...context.user
                            .user_metadata,
                        full_name:
                            fullName,
                        name:
                            fullName,
                    },
                },
            );

        const profile =
            await loadProfile(
                context,
            );

        return reply({
            success:
                true,
            profile,
            message:
                metadataError
                    ? "Profile name saved. Account metadata could not be synchronised."
                    : "Profile updated successfully.",
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

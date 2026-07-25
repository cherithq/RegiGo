import {
    NextResponse,
} from "next/server";
import {
    createClient,
    type SupabaseClient,
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

type ProfileRow = {
    id: string;
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

type MembershipRow = {
    company_id:
        | string
        | null;
    company_role:
        | string
        | null;
    status:
        | string
        | null;
};

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (
        !url ||
        !key
    ) {
        throw new Error(
            "Supabase service-role configuration is missing.",
        );
    }

    return createClient(
        url,
        key,
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

function isPlatformAdmin(
    profile:
        | ProfileRow
        | null,
) {
    return [
        "super_admin",
        "platform_admin",
        "platform-admin",
    ].includes(
        clean(
            profile?.platform_role,
        ),
    );
}

function isCompanyAdmin({
    profile,
    membership,
}: {
    profile:
        | ProfileRow
        | null;
    membership:
        | MembershipRow
        | null;
}) {
    const values = [
        clean(
            profile?.role,
        ),
        clean(
            membership?.company_role,
        ),
    ];

    return values.some(
        (
            value,
        ) =>
            [
                "admin",
                "administrator",
                "owner",
                "company_admin",
                "company-admin",
            ].includes(
                value,
            ),
    );
}

async function profileForUser(
    admin: SupabaseClient,
    userId: string,
) {
    const primary =
        await admin
            .from(
                "profiles",
            )
            .select(
                "id, role, platform_role, company_id",
            )
            .eq(
                "id",
                userId,
            )
            .maybeSingle();

    if (
        primary.error &&
        String(
            primary.error.code ||
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
                    "id, role, company_id",
                )
                .eq(
                    "id",
                    userId,
                )
                .maybeSingle();

        if (
            fallback.error
        ) {
            throw new Error(
                fallback.error
                    .message,
            );
        }

        return {
            ...fallback.data,
            platform_role:
                null,
        } as ProfileRow;
    }

    if (
        primary.error
    ) {
        throw new Error(
            primary.error
                .message,
        );
    }

    return primary.data as
        | ProfileRow
        | null;
}

async function membershipForUser(
    admin: SupabaseClient,
    userId: string,
    preferredCompanyId:
        | string
        | null,
) {
    let query =
        admin
            .from(
                "company_members",
            )
            .select(
                "company_id, company_role, status",
            )
            .eq(
                "user_id",
                userId,
            );

    if (
        preferredCompanyId
    ) {
        query =
            query.eq(
                "company_id",
                preferredCompanyId,
            );
    }

    const {
        data,
        error,
    } =
        await query
            .order(
                "created_at",
                {
                    ascending:
                        false,
                },
            )
            .limit(1)
            .maybeSingle();

    if (
        error &&
        ![
            "42P01",
            "42703",
            "PGRST205",
        ].includes(
            String(
                error.code ||
                    "",
            ),
        )
    ) {
        throw new Error(
            error.message,
        );
    }

    return (
        data ||
        null
    ) as
        | MembershipRow
        | null;
}

async function exactCount(
    query: any,
) {
    const {
        count,
        error,
    } =
        await query;

    if (error) {
        throw new Error(
            error.message,
        );
    }

    return count ||
        0;
}

async function globalSummary(
    admin: SupabaseClient,
) {
    const [
        events,
        users,
        companies,
        roleRows,
    ] =
        await Promise.all([
            exactCount(
                admin
                    .from(
                        "events",
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true,
                        },
                    ),
            ),
            exactCount(
                admin
                    .from(
                        "profiles",
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true,
                        },
                    ),
            ),
            exactCount(
                admin
                    .from(
                        "companies",
                    )
                    .select(
                        "id",
                        {
                            count:
                                "exact",
                            head:
                                true,
                        },
                    ),
            ),
            admin
                .from(
                    "company_role_module_permissions",
                )
                .select(
                    "role",
                ),
        ]);

    if (
        roleRows.error &&
        ![
            "42P01",
            "PGRST205",
        ].includes(
            String(
                roleRows.error
                    .code ||
                    "",
            ),
        )
    ) {
        throw new Error(
            roleRows.error
                .message,
        );
    }

    const roles =
        new Set(
            (
                roleRows.data ||
                []
            )
                .map(
                    (
                        row,
                    ) =>
                        clean(
                            row.role,
                        ),
                )
                .filter(
                    Boolean,
                ),
        ).size ||
        4;

    return {
        scope:
            "platform",
        scopeLabel:
            "RegiGo Platform",
        isPlatformAdmin:
            true,
        isCompanyAdmin:
            false,
        cards: {
            events: {
                value:
                    events,
                description:
                    "Total events across RegiGo",
            },
            users: {
                value:
                    users,
                description:
                    "Registered dashboard accounts",
            },
            companies: {
                value:
                    companies,
                description:
                    "Company workspaces configured",
            },
            roles: {
                value:
                    roles,
                description:
                    "Permission groups available",
            },
        },
    };
}

async function companySummary({
    admin,
    userId,
    companyId,
    profile,
    membership,
}: {
    admin: SupabaseClient;
    userId: string;
    companyId: string;
    profile:
        | ProfileRow
        | null;
    membership:
        | MembershipRow
        | null;
}) {
    const [
        companyResult,
        eventResult,
        memberResult,
        profileResult,
        roleResult,
        eventMemberResult,
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
                    "events",
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
                    "company_id",
                    companyId,
                ),

            admin
                .from(
                    "company_members",
                )
                .select(
                    "user_id, company_role, status",
                )
                .eq(
                    "company_id",
                    companyId,
                ),

            admin
                .from(
                    "profiles",
                )
                .select(
                    "id, role",
                )
                .eq(
                    "company_id",
                    companyId,
                ),

            admin
                .from(
                    "company_role_module_permissions",
                )
                .select(
                    "role",
                )
                .eq(
                    "company_id",
                    companyId,
                ),

            admin
                .from(
                    "event_members",
                )
                .select(
                    "event_id",
                )
                .eq(
                    "profile_id",
                    userId,
                ),
        ]);

    for (const result of [
        companyResult,
        eventResult,
        memberResult,
        profileResult,
        roleResult,
        eventMemberResult,
    ]) {
        if (
            result.error &&
            ![
                "42P01",
                "42703",
                "PGRST205",
            ].includes(
                String(
                    result.error.code ||
                        "",
                ),
            )
        ) {
            throw new Error(
                result.error
                    .message,
            );
        }
    }

    const companyName =
        String(
            companyResult.data
                ?.company_name ||
                "Company Workspace",
        );

    const activeMemberRows =
        (
            memberResult.data ||
            []
        ).filter(
            (
                row,
            ) =>
                !row.status ||
                clean(
                    row.status,
                ) ===
                    "active",
        );

    const userIds =
        new Set<string>();

    for (const row of
        activeMemberRows) {
        if (
            row.user_id
        ) {
            userIds.add(
                String(
                    row.user_id,
                ),
            );
        }
    }

    for (const row of
        profileResult.data ||
        []) {
        if (
            row.id
        ) {
            userIds.add(
                String(
                    row.id,
                ),
            );
        }
    }

    const roleNames =
        new Set<string>();

    for (const row of
        roleResult.data ||
        []) {
        const role =
            clean(
                row.role,
            );

        if (role) {
            roleNames.add(
                role,
            );
        }
    }

    for (const row of
        activeMemberRows) {
        const role =
            clean(
                row.company_role,
            );

        if (role) {
            roleNames.add(
                role,
            );
        }
    }

    for (const row of
        profileResult.data ||
        []) {
        const role =
            clean(
                row.role,
            );

        if (role) {
            roleNames.add(
                role,
            );
        }
    }

    const companyAdmin =
        isCompanyAdmin({
            profile,
            membership,
        });

    const assignedEventIds =
        new Set(
            (
                eventMemberResult.data ||
                []
            )
                .map(
                    (
                        row,
                    ) =>
                        String(
                            row.event_id ||
                                "",
                        ),
                )
                .filter(
                    Boolean,
                ),
        );

    const eventCount =
        companyAdmin
            ? eventResult.count ||
              0
            : assignedEventIds.size;

    return {
        scope:
            companyAdmin
                ? "company"
                : "assigned",
        scopeLabel:
            companyName,
        isPlatformAdmin:
            false,
        isCompanyAdmin:
            companyAdmin,
        cards: {
            events: {
                value:
                    eventCount,
                description:
                    companyAdmin
                        ? `Events under ${companyName}`
                        : "Events assigned to your account",
            },
            users: {
                value:
                    userIds.size,
                description:
                    `Active accounts in ${companyName}`,
            },
            companies: {
                value:
                    1,
                description:
                    "Current company workspace",
            },
            roles: {
                value:
                    roleNames.size ||
                    4,
                description:
                    `Permission groups in ${companyName}`,
            },
        },
    };
}

export async function GET() {
    try {
        const supabaseServer =
            await createSupabaseServerClient();
        const {
            data: {
                user,
            },
            error:
                userError,
        } =
            await supabaseServer.auth.getUser();

        if (
            userError ||
            !user
        ) {
            return NextResponse.json(
                {
                    error:
                        "You must be logged in.",
                },
                {
                    status:
                        401,
                },
            );
        }

        const admin =
            adminClient();
        const profile =
            await profileForUser(
                admin,
                user.id,
            );

        if (
            isPlatformAdmin(
                profile,
            )
        ) {
            return NextResponse.json(
                await globalSummary(
                    admin,
                ),
                {
                    headers: {
                        "Cache-Control":
                            "no-store",
                    },
                },
            );
        }

        const membership =
            await membershipForUser(
                admin,
                user.id,
                profile?.company_id ||
                    null,
            );
        const companyId =
            profile?.company_id ||
            membership?.company_id ||
            null;

        if (!companyId) {
            return NextResponse.json(
                {
                    error:
                        "Your account is not assigned to an event company.",
                },
                {
                    status:
                        409,
                },
            );
        }

        return NextResponse.json(
            await companySummary({
                admin,
                userId:
                    user.id,
                companyId,
                profile,
                membership,
            }),
            {
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof
                    Error
                        ? error.message
                        : "Unable to load dashboard totals.",
            },
            {
                status:
                    500,
            },
        );
    }
}

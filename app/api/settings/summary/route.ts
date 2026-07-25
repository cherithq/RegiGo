import {
    NextResponse,
} from "next/server";
import {
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

function isAdminRole(
    value: unknown,
) {
    return [
        "admin",
        "administrator",
        "owner",
        "company_admin",
        "company-admin",
        "super_admin",
        "platform_admin",
        "platform-admin",
    ].includes(
        clean(
            value,
        ),
    );
}

function isPlatformRole(
    value: unknown,
) {
    return [
        "super_admin",
        "platform_admin",
        "platform-admin",
    ].includes(
        clean(
            value,
        ),
    );
}

function noStore(
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

async function loadProfile(
    supabase:
        SupabaseClient,
    userId: string,
) {
    const primary =
        await supabase
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
            await supabase
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

async function membershipByColumn({
    supabase,
    userId,
    companyId,
    userColumn,
}: {
    supabase:
        SupabaseClient;
    userId: string;
    companyId:
        | string
        | null;
    userColumn:
        | "user_id"
        | "profile_id";
}) {
    let query =
        supabase
            .from(
                "company_members",
            )
            .select(
                "company_id, company_role, status",
            )
            .eq(
                userColumn,
                userId,
            );

    if (
        companyId
    ) {
        query =
            query.eq(
                "company_id",
                companyId,
            );
    }

    return query
        .limit(1)
        .maybeSingle();
}

async function loadMembership(
    supabase:
        SupabaseClient,
    userId: string,
    companyId:
        | string
        | null,
) {
    const primary =
        await membershipByColumn({
            supabase,
            userId,
            companyId,
            userColumn:
                "user_id",
        });

    if (
        !primary.error
    ) {
        return (
            primary.data ||
            null
        ) as
            | MembershipRow
            | null;
    }

    if (
        ![
            "42P01",
            "42703",
            "PGRST204",
            "PGRST205",
        ].includes(
            String(
                primary.error
                    .code ||
                    "",
            ),
        )
    ) {
        throw new Error(
            primary.error
                .message,
        );
    }

    const fallback =
        await membershipByColumn({
            supabase,
            userId,
            companyId,
            userColumn:
                "profile_id",
        });

    if (
        fallback.error &&
        ![
            "42P01",
            "42703",
            "PGRST204",
            "PGRST205",
        ].includes(
            String(
                fallback.error
                    .code ||
                    "",
            ),
        )
    ) {
        throw new Error(
            fallback.error
                .message,
        );
    }

    return (
        fallback.data ||
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

    if (
        error
    ) {
        throw new Error(
            error.message,
        );
    }

    return count ||
        0;
}

function relationUnavailable(
    error: unknown,
) {
    const value =
        error as
            | {
                  code?: unknown;
              }
            | null;

    return [
        "42P01",
        "42703",
        "PGRST204",
        "PGRST205",
    ].includes(
        String(
            value?.code ||
                "",
        ),
    );
}

async function platformSummary(
    supabase:
        SupabaseClient,
) {
    const [
        eventCount,
        userCount,
        companyCount,
        roleResult,
    ] =
        await Promise.all([
            exactCount(
                supabase
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
                supabase
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
                supabase
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
            supabase
                .from(
                    "company_role_module_permissions",
                )
                .select(
                    "role",
                ),
        ]);

    if (
        roleResult.error &&
        !relationUnavailable(
            roleResult.error,
        )
    ) {
        throw new Error(
            roleResult.error
                .message,
        );
    }

    const roles =
        new Set(
            (
                roleResult.data ||
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
        ).size;

    return {
        scope:
            "platform",
        scopeLabel:
            "RegiGo Platform",
        cards: {
            events: {
                value:
                    eventCount,
                description:
                    "Events available to your account",
            },
            users: {
                value:
                    userCount,
                description:
                    "Registered dashboard accounts",
            },
            companies: {
                value:
                    companyCount,
                description:
                    "Company workspaces available",
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
    supabase,
    companyId,
}: {
    supabase:
        SupabaseClient;
    companyId: string;
}) {
    const [
        companyResult,
        eventCountResult,
        profileResult,
        memberResult,
        permissionResult,
    ] =
        await Promise.all([
            supabase
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

            supabase
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

            supabase
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

            supabase
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

            supabase
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
        ]);

    for (const result of [
        companyResult,
        eventCountResult,
        profileResult,
        memberResult,
        permissionResult,
    ]) {
        if (
            result.error &&
            !relationUnavailable(
                result.error,
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

    const activeMembers =
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

    for (const row of
        activeMembers) {
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

    const roleNames =
        new Set<string>();

    for (const row of
        permissionResult.data ||
            []) {
        const role =
            clean(
                row.role,
            );

        if (
            role
        ) {
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

        if (
            role
        ) {
            roleNames.add(
                role,
            );
        }
    }

    for (const row of
        activeMembers) {
        const role =
            clean(
                row.company_role,
            );

        if (
            role
        ) {
            roleNames.add(
                role,
            );
        }
    }

    return {
        scope:
            "company",
        scopeLabel:
            companyName,
        cards: {
            events: {
                value:
                    eventCountResult.count ||
                    0,
                description:
                    `Events available to ${companyName}`,
            },
            users: {
                value:
                    userIds.size,
                description:
                    `Active dashboard accounts in ${companyName}`,
            },
            companies: {
                value:
                    1,
                description:
                    "Current company workspace",
            },
            roles: {
                value:
                    roleNames.size,
                description:
                    `Permission groups in ${companyName}`,
            },
        },
    };
}

export async function GET() {
    try {
        // This is intentionally the authenticated server client used by the
        // dashboard. It keeps RLS and the current login session in effect.
        const supabase =
            await createSupabaseServerClient();
        const {
            data: {
                user,
            },
            error:
                userError,
        } =
            await supabase.auth.getUser();

        if (
            userError ||
            !user
        ) {
            return noStore(
                {
                    error:
                        "You must be logged in.",
                },
                401,
            );
        }

        const profile =
            await loadProfile(
                supabase,
                user.id,
            );
        const membership =
            await loadMembership(
                supabase,
                user.id,
                profile?.company_id ||
                    null,
            );

        // Company assignment always wins. This prevents an event-company admin
        // with an old or incorrect platform_role value from seeing RegiGo-wide
        // totals.
        const companyId =
            profile?.company_id ||
            membership?.company_id ||
            null;

        if (
            companyId
        ) {
            const companyAdmin =
                isAdminRole(
                    profile?.role,
                ) ||
                isAdminRole(
                    membership
                        ?.company_role,
                );

            if (
                !companyAdmin
            ) {
                return noStore(
                    {
                        error:
                            "Only company administrators can view workspace settings.",
                    },
                    403,
                );
            }

            return noStore(
                await companySummary({
                    supabase,
                    companyId,
                }),
            );
        }

        const platformAdmin =
            isPlatformRole(
                profile
                    ?.platform_role,
            ) ||
            isAdminRole(
                profile?.role,
            );

        if (
            !platformAdmin
        ) {
            return noStore(
                {
                    error:
                        "Your account is not assigned to an event company.",
                },
                409,
            );
        }

        return noStore(
            await platformSummary(
                supabase,
            ),
        );
    } catch (error) {
        return noStore(
            {
                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load Settings totals.",
            },
            500,
        );
    }
}

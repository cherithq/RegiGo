import "server-only";

import {
    createClient,
    type SupabaseClient,
} from "@supabase/supabase-js";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";
import {
    cleanModuleMap,
    companyModuleKeys,
    defaultCompanyModules,
    defaultRoleModules,
    normalizeCompanyRole,
    type CompanyModuleKey,
    type CompanyUserRole,
} from "@/lib/company-modules";

export class CompanyModuleError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "CompanyModuleError";
        this.status = status;
    }
}

const missingCodes =
    new Set([
        "42P01",
        "42703",
        "PGRST200",
        "PGRST204",
        "PGRST205",
    ]);

function missingObject(
    error:
        | {
              code?: string | null;
          }
        | null
        | undefined,
) {
    return missingCodes.has(
        String(error?.code || ""),
    );
}

export function getCompanyAdminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new CompanyModuleError(
            "Supabase service-role configuration is missing.",
            500,
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

async function loadCompanyUserActor() {
    const supabaseServer =
        await createSupabaseServerClient();
    const db =
        supabaseServer as any;

    const {
        data: { user },
        error: authError,
    } =
        await supabaseServer.auth
            .getUser();

    if (authError || !user) {
        throw new CompanyModuleError(
            "You must be logged in.",
            401,
        );
    }

    const {
        data: profile,
        error,
    } = await db
        .from("profiles")
        .select(
            "id, full_name, email, role, company_id, platform_role",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        throw new CompanyModuleError(
            error.message,
        );
    }

    if (!profile) {
        throw new CompanyModuleError(
            "Profile not found.",
            404,
        );
    }

    const isPlatformAdmin =
        profile.platform_role ===
        "super_admin";
    const role =
        normalizeCompanyRole(
            profile.role,
        );
    const isCompanyAdmin =
        role === "admin";

    if (
        !isPlatformAdmin &&
        !profile.company_id
    ) {
        throw new CompanyModuleError(
            "Your account is not linked to an event company.",
            403,
        );
    }

    return {
        user,
        profile: {
            ...profile,
            role,
        },
        role,
        isPlatformAdmin,
        isCompanyAdmin,
        supabaseServer,
        admin:
            getCompanyAdminClient(),
    };
}

export async function getCompanyUserActor() {
    return loadCompanyUserActor();
}

export async function getCompanyActor() {
    const actor =
        await loadCompanyUserActor();

    if (
        !actor.isPlatformAdmin &&
        !actor.isCompanyAdmin
    ) {
        throw new CompanyModuleError(
            "Only administrators can manage company settings.",
            403,
        );
    }

    return actor;
}

export function assertCompanyScope({
    actor,
    companyId,
}: {
    actor: Awaited<
        ReturnType<
            typeof getCompanyActor
        >
    >;
    companyId: string;
}) {
    if (
        !actor.isPlatformAdmin &&
        String(
            actor.profile
                .company_id ||
                "",
        ) !== companyId
    ) {
        throw new CompanyModuleError(
            "You cannot manage another event company.",
            403,
        );
    }
}

export async function loadCompanyModuleMap({
    admin,
    companyId,
}: {
    admin: SupabaseClient;
    companyId: string;
}) {
    const {
        data,
        error,
    } = await admin
        .from(
            "company_module_settings",
        )
        .select(
            "module_key, enabled",
        )
        .eq(
            "company_id",
            companyId,
        );

    if (error) {
        if (
            missingObject(error)
        ) {
            return {
                ...defaultCompanyModules,
            };
        }

        throw new CompanyModuleError(
            error.message,
        );
    }

    const map = {
        ...defaultCompanyModules,
    };

    for (const row of
        data || []) {
        const key =
            row.module_key as CompanyModuleKey;

        if (
            companyModuleKeys.includes(
                key,
            )
        ) {
            map[key] =
                Boolean(
                    row.enabled,
                );
        }
    }

    return map;
}

export async function loadRoleModuleMap({
    admin,
    companyId,
    role,
}: {
    admin: SupabaseClient;
    companyId: string;
    role:
        | CompanyUserRole
        | string;
}) {
    const normalizedRole =
        normalizeCompanyRole(
            role,
        );
    const fallback =
        defaultRoleModules(
            normalizedRole,
        );

    const {
        data,
        error,
    } = await admin
        .from(
            "company_role_module_permissions",
        )
        .select(
            "module_key, enabled",
        )
        .eq(
            "company_id",
            companyId,
        )
        .eq(
            "role",
            normalizedRole,
        );

    if (error) {
        if (
            missingObject(error)
        ) {
            return fallback;
        }

        throw new CompanyModuleError(
            error.message,
        );
    }

    const map = {
        ...fallback,
    };

    for (const row of
        data || []) {
        const key =
            row.module_key as CompanyModuleKey;

        if (
            companyModuleKeys.includes(
                key,
            )
        ) {
            map[key] =
                Boolean(
                    row.enabled,
                );
        }
    }

    return map;
}

export async function loadEffectiveCompanyPermissions({
    admin,
    companyId,
    role,
    platformAdmin,
}: {
    admin: SupabaseClient;
    companyId: string;
    role: string;
    platformAdmin: boolean;
}) {
    if (platformAdmin) {
        return {
            ...defaultCompanyModules,
        };
    }

    const [
        companyModules,
        roleModules,
    ] = await Promise.all([
        loadCompanyModuleMap({
            admin,
            companyId,
        }),
        loadRoleModuleMap({
            admin,
            companyId,
            role,
        }),
    ]);

    return Object.fromEntries(
        companyModuleKeys.map(
            (key) => [
                key,
                companyModules[key] &&
                    roleModules[key],
            ],
        ),
    ) as Record<
        CompanyModuleKey,
        boolean
    >;
}

export async function requireCompanyPermission({
    actor,
    companyId,
    permission,
    message,
}: {
    actor: Awaited<
        ReturnType<
            typeof getCompanyActor
        >
    >;
    companyId: string;
    permission: CompanyModuleKey;
    message?: string;
}) {
    assertCompanyScope({
        actor,
        companyId,
    });

    if (
        actor.isPlatformAdmin
    ) {
        return;
    }

    const permissions =
        await loadEffectiveCompanyPermissions(
            {
                admin:
                    actor.admin,
                companyId,
                role:
                    actor.role,
                platformAdmin:
                    false,
            },
        );

    if (
        permissions[
            permission
        ] === false
    ) {
        throw new CompanyModuleError(
            message ||
                "Your company role does not have access to this feature.",
            403,
        );
    }
}

export async function loadEffectiveModules({
    admin,
    companyId,
    role,
    eventId,
    platformAdmin,
}: {
    admin: SupabaseClient;
    companyId: string;
    role: string;
    eventId?:
        | string
        | null;
    platformAdmin: boolean;
}) {
    if (platformAdmin) {
        return {
            ...defaultCompanyModules,
        };
    }

    const base =
        await loadEffectiveCompanyPermissions(
            {
                admin,
                companyId,
                role,
                platformAdmin:
                    false,
            },
        );

    let eventModules = {
        ...defaultCompanyModules,
    };

    const addonModules:
        Record<
            CompanyModuleKey,
            boolean
        > = {
            ...defaultCompanyModules,
        };

    const addonToModule:
        Record<
            string,
            CompanyModuleKey
        > = {
            guest_invitations:
                "invitations",
            stripe_payments:
                "payments",
            guest_table_selection:
                "table_selection",
            badge_designer:
                "badges",
            direct_printing:
                "direct_printing",
        };

    if (eventId) {
        const [
            settingsResult,
            addonsResult,
        ] = await Promise.all([
            admin
                .from(
                    "event_settings",
                )
                .select(
                    "enabled_modules",
                )
                .eq(
                    "event_id",
                    eventId,
                )
                .maybeSingle(),

            admin
                .from(
                    "event_addons",
                )
                .select(
                    "addon_key, enabled",
                )
                .eq(
                    "event_id",
                    eventId,
                ),
        ]);

        if (
            settingsResult.error &&
            !missingObject(
                settingsResult.error,
            )
        ) {
            throw new CompanyModuleError(
                settingsResult.error
                    .message,
            );
        }

        eventModules =
            cleanModuleMap(
                settingsResult.data
                    ?.enabled_modules,
            );

        for (const moduleKey of
            Object.values(
                addonToModule,
            )) {
            addonModules[
                moduleKey
            ] = false;
        }

        if (
            addonsResult.error
        ) {
            if (
                !missingObject(
                    addonsResult.error,
                )
            ) {
                throw new CompanyModuleError(
                    addonsResult.error
                        .message,
                );
            }

            for (const moduleKey of
                Object.values(
                    addonToModule,
                )) {
                addonModules[
                    moduleKey
                ] = true;
            }
        } else {
            for (const row of
                addonsResult.data ||
                []) {
                const moduleKey =
                    addonToModule[
                        String(
                            row.addon_key,
                        )
                    ];

                if (moduleKey) {
                    addonModules[
                        moduleKey
                    ] =
                        Boolean(
                            row.enabled,
                        );
                }
            }
        }
    }

    return Object.fromEntries(
        companyModuleKeys.map(
            (key) => [
                key,
                base[key] &&
                    eventModules[key] &&
                    addonModules[key],
            ],
        ),
    ) as Record<
        CompanyModuleKey,
        boolean
    >;
}

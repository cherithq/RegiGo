import {
    NextResponse,
} from "next/server";
import {
    CompanyModuleError,
    getCompanyActor,
    loadCompanyModuleMap,
    loadRoleModuleMap,
    requireCompanyPermission,
} from "@/lib/company-module-server";
import {
    companyModuleCatalog,
    isCompanyModuleKey,
    normalizeCompanyRole,
} from "@/lib/company-modules";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

const editableRoles = [
    "admin",
    "organizer",
    "viewer",
    "scanner",
] as const;

function reply(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(
        body,
        {
            status,
            headers: {
                "Cache-Control":
                    "no-store",
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
                error instanceof Error
                    ? error.message
                    : "Unable to manage roles.",
        },
        error instanceof
        CompanyModuleError
            ? error.status
            : 500,
    );
}

function clean(
    value: unknown,
) {
    return typeof value ===
        "string"
        ? value.trim()
        : "";
}

async function visibleCompanies(
    actor: Awaited<
        ReturnType<
            typeof getCompanyActor
        >
    >,
) {
    let query =
        actor.admin
            .from("companies")
            .select(
                "id, company_name",
            )
            .order(
                "company_name",
                {
                    ascending: true,
                },
            );

    if (
        !actor.isPlatformAdmin
    ) {
        query = query.eq(
            "id",
            actor.profile
                .company_id,
        );
    }

    const {
        data,
        error,
    } = await query;

    if (error) {
        throw new CompanyModuleError(
            error.message,
        );
    }

    return data || [];
}

export async function GET(
    request: Request,
) {
    try {
        const actor =
            await getCompanyActor();
        const requested =
            new URL(
                request.url,
            ).searchParams.get(
                "companyId",
            );
        const companies =
            await visibleCompanies(
                actor,
            );
        const companyId =
            requested ||
            String(
                actor.profile
                    .company_id ||
                companies[0]?.id ||
                "",
            );

        if (!companyId) {
            throw new CompanyModuleError(
                "Choose a company.",
            );
        }

        await requireCompanyPermission({
            actor,
            companyId,
            permission:
                "manage_roles",
            message:
                "Your Company Admin role cannot manage Roles & Permissions.",
        });

        const company =
            companies.find(
                (item) =>
                    String(
                        item.id,
                    ) ===
                    companyId,
            );

        if (!company) {
            throw new CompanyModuleError(
                "Company not found.",
                404,
            );
        }

        const companyModules =
            await loadCompanyModuleMap(
                {
                    admin:
                        actor.admin,
                    companyId,
                },
            );

        const permissions =
            Object.fromEntries(
                await Promise.all(
                    editableRoles.map(
                        async (
                            role,
                        ) => [
                            role,
                            await loadRoleModuleMap(
                                {
                                    admin:
                                        actor.admin,
                                    companyId,
                                    role,
                                },
                            ),
                        ],
                    ),
                ),
            );

        return reply({
            success: true,
            companies,
            company,
            companyModules,
            moduleCatalog:
                companyModuleCatalog,
            permissions,
            access: {
                isPlatformAdmin:
                    actor.isPlatformAdmin,
                canEditAdmin:
                    actor.isPlatformAdmin,
            },
        });
    } catch (error) {
        return fail(error);
    }
}

export async function PATCH(
    request: Request,
) {
    try {
        const actor =
            await getCompanyActor();
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const companyId =
            clean(
                body.companyId,
            );
        const role =
            normalizeCompanyRole(
                clean(
                    body.role,
                ),
            );
        const moduleKey =
            body.moduleKey;

        if (!companyId) {
            throw new CompanyModuleError(
                "Choose a company.",
            );
        }

        await requireCompanyPermission({
            actor,
            companyId,
            permission:
                "manage_roles",
            message:
                "Your Company Admin role cannot edit role permissions.",
        });

        if (
            !editableRoles.includes(
                role as
                    (typeof editableRoles)[number],
            )
        ) {
            throw new CompanyModuleError(
                "Choose a valid role.",
            );
        }

        if (
            role === "admin" &&
            !actor.isPlatformAdmin
        ) {
            throw new CompanyModuleError(
                "Only the RegiGo platform administrator can edit Company Admin access.",
                403,
            );
        }

        if (
            !isCompanyModuleKey(
                moduleKey,
            )
        ) {
            throw new CompanyModuleError(
                "Choose a valid module.",
            );
        }

        if (
            typeof body.enabled !==
            "boolean"
        ) {
            throw new CompanyModuleError(
                "Enabled must be true or false.",
            );
        }

        const companyModules =
            await loadCompanyModuleMap(
                {
                    admin:
                        actor.admin,
                    companyId,
                },
            );

        if (
            body.enabled &&
            !companyModules[
                moduleKey
            ]
        ) {
            throw new CompanyModuleError(
                "Enable this module for the company before granting it to a role.",
                409,
            );
        }

        const { error } =
            await actor.admin
                .from(
                    "company_role_module_permissions",
                )
                .upsert(
                    {
                        company_id:
                            companyId,
                        role,
                        module_key:
                            moduleKey,
                        enabled:
                            body.enabled,
                        updated_by:
                            actor.user.id,
                        updated_at:
                            new Date().toISOString(),
                    },
                    {
                        onConflict:
                            "company_id,role,module_key",
                    },
                );

        if (error) {
            throw new CompanyModuleError(
                error.message,
            );
        }

        return reply({
            success: true,
            message:
                `${role === "admin" ? "Company Admin" : role} permission updated.`,
        });
    } catch (error) {
        return fail(error);
    }
}

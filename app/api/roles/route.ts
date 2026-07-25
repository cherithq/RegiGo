import { NextResponse } from "next/server";
import {
    CompanyModuleError,
    assertCompanyScope,
    getCompanyActor,
    loadCompanyModuleMap,
    loadRoleModuleMap,
} from "@/lib/company-module-server";
import {
    companyModuleCatalog,
    isCompanyModuleKey,
} from "@/lib/company-modules";

export const dynamic = "force-dynamic";

const editableRoles = ["organizer", "viewer", "scanner"] as const;

function reply(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function fail(error: unknown) {
    return reply(
        { error: error instanceof Error ? error.message : "Unable to manage roles." },
        error instanceof CompanyModuleError ? error.status : 500,
    );
}

export async function GET(request: Request) {
    try {
        const actor = await getCompanyActor();
        const requested = new URL(request.url).searchParams.get("companyId");
        const companyId = requested || actor.profile.company_id;
        if (!companyId) throw new CompanyModuleError("Choose a company.");
        assertCompanyScope({ actor, companyId });

        const { data: company, error } = await actor.admin
            .from("companies")
            .select("id, company_name")
            .eq("id", companyId)
            .maybeSingle();
        if (error) throw new CompanyModuleError(error.message);
        if (!company) throw new CompanyModuleError("Company not found.", 404);

        const companyModules = await loadCompanyModuleMap({ admin: actor.admin, companyId });
        const permissions = Object.fromEntries(
            await Promise.all(
                editableRoles.map(async (role) => [
                    role,
                    await loadRoleModuleMap({
                        admin: actor.admin,
                        companyId,
                        role,
                    }),
                ]),
            ),
        );

        return reply({
            success: true,
            company,
            companyModules,
            moduleCatalog: companyModuleCatalog,
            permissions,
        });
    } catch (error) {
        return fail(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const actor = await getCompanyActor();
        const body = (await request.json()) as Record<string, unknown>;
        const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
        const role = typeof body.role === "string" ? body.role.trim() : "";
        const moduleKey = body.moduleKey;

        if (!companyId) throw new CompanyModuleError("Choose a company.");
        assertCompanyScope({ actor, companyId });
        if (!editableRoles.includes(role as any)) throw new CompanyModuleError("Choose a valid role.");
        if (!isCompanyModuleKey(moduleKey)) throw new CompanyModuleError("Choose a valid module.");
        if (typeof body.enabled !== "boolean") throw new CompanyModuleError("Enabled must be true or false.");

        const companyModules = await loadCompanyModuleMap({ admin: actor.admin, companyId });
        if (body.enabled && !companyModules[moduleKey]) {
            throw new CompanyModuleError(
                "Enable this module for the company before granting it to a role.",
                409,
            );
        }

        const { error } = await actor.admin
            .from("company_role_module_permissions")
            .upsert(
                {
                    company_id: companyId,
                    role,
                    module_key: moduleKey,
                    enabled: body.enabled,
                    updated_by: actor.user.id,
                },
                { onConflict: "company_id,role,module_key" },
            );
        if (error) throw new CompanyModuleError(error.message);

        return reply({ success: true, message: "Role permission updated." });
    } catch (error) {
        return fail(error);
    }
}

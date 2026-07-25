import {
    NextResponse,
} from "next/server";
import {
    getCompanyActor,
} from "@/lib/company-module-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    try {
        const actor =
            await getCompanyActor();

        const tables = [
            "companies",
            "profiles",
            "company_members",
            "event_members",
            "company_module_settings",
            "company_role_module_permissions",
        ] as const;

        const checks =
            await Promise.all(
                tables.map(
                    async (table) => {
                        const {
                            count,
                            error,
                        } =
                            await actor.admin
                                .from(table)
                                .select("*", {
                                    count:
                                        "exact",
                                    head: true,
                                });

                        return {
                            table,
                            available:
                                !error,
                            count:
                                count || 0,
                            error:
                                error?.message ||
                                null,
                        };
                    },
                ),
            );

        return NextResponse.json({
            success:
                checks.every(
                    (check) =>
                        check.available,
                ),
            actor: {
                userId:
                    actor.user.id,
                companyId:
                    actor.profile
                        .company_id ||
                    null,
                role:
                    actor.profile.role,
                platformRole:
                    actor.profile
                        .platform_role ||
                    null,
                isPlatformAdmin:
                    actor.isPlatformAdmin,
                isCompanyAdmin:
                    actor.isCompanyAdmin,
            },
            routes: {
                users:
                    "/api/company/users",
                roles:
                    "/api/company/roles",
                companies:
                    "/api/platform/companies",
            },
            checks,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Management health check failed.",
            },
            {
                status: 500,
            },
        );
    }
}

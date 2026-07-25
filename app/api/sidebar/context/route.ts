import {
    NextResponse,
} from "next/server";
import {
    CompanyModuleError,
    getCompanyUserActor,
    loadEffectiveCompanyPermissions,
    loadEffectiveModules,
} from "@/lib/company-module-server";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

function response(
    body: Record<string, unknown>,
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

function cleanEventId(
    value:
        | string
        | null,
) {
    const clean =
        value?.trim() ||
        "";

    if (
        !clean ||
        clean === "new" ||
        clean === "create"
    ) {
        return null;
    }

    return clean.slice(
        0,
        120,
    );
}

export async function GET(
    request: Request,
) {
    try {
        const actor =
            await getCompanyUserActor();
        const eventId =
            cleanEventId(
                new URL(
                    request.url,
                ).searchParams.get(
                    "eventId",
                ),
            );

        let event:
            | {
                  id: string;
                  name: string;
                  companyId: string;
                  companyName:
                      | string
                      | null;
              }
            | null = null;

        let companyId =
            String(
                actor.profile
                    .company_id ||
                "",
            );

        if (eventId) {
            const {
                data: eventRow,
                error,
            } = await actor.admin
                .from("events")
                .select(
                    "id, event_name, company_id",
                )
                .eq("id", eventId)
                .maybeSingle();

            if (
                error ||
                !eventRow
            ) {
                throw new CompanyModuleError(
                    error?.message ||
                        "The event could not be found.",
                    error ? 400 : 404,
                );
            }

            companyId =
                String(
                    eventRow.company_id ||
                    "",
                );

            if (
                !actor.isPlatformAdmin &&
                String(
                    actor.profile
                        .company_id ||
                        "",
                ) !== companyId
            ) {
                throw new CompanyModuleError(
                    "This event belongs to another company.",
                    403,
                );
            }

            if (
                !actor.isPlatformAdmin &&
                actor.role !==
                    "admin"
            ) {
                const {
                    data: assignment,
                    error:
                        assignmentError,
                } = await actor.admin
                    .from(
                        "event_members",
                    )
                    .select(
                        "event_id",
                    )
                    .eq(
                        "event_id",
                        eventId,
                    )
                    .eq(
                        "profile_id",
                        actor.user.id,
                    )
                    .maybeSingle();

                if (
                    assignmentError ||
                    !assignment
                ) {
                    throw new CompanyModuleError(
                        assignmentError
                            ?.message ||
                            "This event is not assigned to your account.",
                        assignmentError
                            ? 400
                            : 403,
                    );
                }
            }

            const {
                data: eventCompany,
            } = await actor.admin
                .from("companies")
                .select(
                    "company_name",
                )
                .eq(
                    "id",
                    companyId,
                )
                .maybeSingle();

            event = {
                id:
                    String(
                        eventRow.id,
                    ),
                name:
                    String(
                        eventRow.event_name ||
                        "Event",
                    ),
                companyId,
                companyName:
                    eventCompany
                        ?.company_name
                        ? String(
                              eventCompany.company_name,
                          )
                        : null,
            };
        }

        let company:
            | {
                  id: string;
                  name: string;
                  slug:
                      | string
                      | null;
              }
            | null = null;

        if (companyId) {
            const {
                data: companyRow,
                error,
            } = await actor.admin
                .from("companies")
                .select(
                    "id, company_name, company_slug",
                )
                .eq("id", companyId)
                .maybeSingle();

            if (
                error &&
                error.code !==
                    "PGRST116"
            ) {
                throw new CompanyModuleError(
                    error.message,
                );
            }

            if (companyRow) {
                company = {
                    id:
                        String(
                            companyRow.id,
                        ),
                    name:
                        String(
                            companyRow.company_name ||
                            "Event company",
                        ),
                    slug:
                        companyRow.company_slug
                            ? String(
                                  companyRow.company_slug,
                              )
                            : null,
                };
            }
        }

        const companyPermissions =
            companyId
                ? await loadEffectiveCompanyPermissions(
                      {
                          admin:
                              actor.admin,
                          companyId,
                          role:
                              actor.role,
                          platformAdmin:
                              actor.isPlatformAdmin,
                      },
                  )
                : null;

        const modules =
            companyId
                ? await loadEffectiveModules(
                      {
                          admin:
                              actor.admin,
                          companyId,
                          role:
                              actor.role,
                          eventId,
                          platformAdmin:
                              actor.isPlatformAdmin,
                      },
                  )
                : null;

        const allowed = (
            key:
                | "create_events"
                | "manage_users"
                | "manage_roles"
                | "stripe_setup"
                | "workspace_settings",
        ) => {
            if (
                actor.isPlatformAdmin
            ) {
                return true;
            }

            if (
                actor.role !==
                "admin" &&
                (
                    key ===
                        "manage_users" ||
                    key ===
                        "manage_roles" ||
                    key ===
                        "workspace_settings" ||
                    key ===
                        "stripe_setup"
                )
            ) {
                return false;
            }

            // Missing legacy permission rows default to visible.
            // Explicit false values still hide the item.
            return (
                companyPermissions?.[
                    key
                ] !== false
            );
        };

        return response({
            success: true,
            profile: {
                id:
                    actor.user.id,
                fullName:
                    actor.profile
                        .full_name ||
                    null,
                email:
                    actor.profile
                        .email ||
                    actor.user.email ||
                    null,
                role:
                    actor.role,
                platformRole:
                    actor.profile
                        .platform_role ||
                    null,
                isPlatformAdmin:
                    actor.isPlatformAdmin,
            },
            company,
            event,
            modules,
            permissions: {
                canCreateEvent:
                    allowed(
                        "create_events",
                    ),
                canManageUsers:
                    allowed(
                        "manage_users",
                    ),
                canManageRoles:
                    allowed(
                        "manage_roles",
                    ),
                canManageStripe:
                    allowed(
                        "stripe_setup",
                    ),
                canManageWorkspace:
                    allowed(
                        "workspace_settings",
                    ),
                canManageEvent:
                    actor.isPlatformAdmin ||
                    actor.role ===
                        "admin" ||
                    actor.role ===
                        "organizer",
                canScan:
                    actor.isPlatformAdmin ||
                    actor.role ===
                        "admin" ||
                    actor.role ===
                        "organizer" ||
                    actor.role ===
                        "scanner",
                canViewReports:
                    actor.isPlatformAdmin ||
                    actor.role !==
                        "scanner",
            },
        });
    } catch (error) {
        return response(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load the sidebar.",
            },
            error instanceof
            CompanyModuleError
                ? error.status
                : 500,
        );
    }
}

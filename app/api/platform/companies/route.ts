import {
    NextResponse,
} from "next/server";
import {
    createCompanyAdministrator,
} from "@/lib/company-account-admin";
import {
    CompanyModuleError,
    assertCompanyScope,
    getCompanyActor,
    loadCompanyModuleMap,
} from "@/lib/company-module-server";
import {
    companyModuleCatalog,
    companyModuleKeys,
    defaultRoleModules,
    isCompanyModuleKey,
} from "@/lib/company-modules";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

function reply(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store",
        },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage companies.",
        },
        error instanceof
        CompanyModuleError
            ? error.status
            : 500,
    );
}

function text(
    value: unknown,
    max = 200,
) {
    return typeof value === "string"
        ? value
              .trim()
              .slice(0, max)
        : "";
}

function slugify(value: string) {
    return value
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

function email(
    value: unknown,
) {
    return text(value, 320)
        .toLowerCase();
}

function positiveInteger(
    value: unknown,
    fallback: number,
) {
    const parsed =
        Number(value);

    return Number.isInteger(parsed)
        ? parsed
        : fallback;
}

function addOneYear(
    value = new Date(),
) {
    const output =
        new Date(value);
    output.setUTCFullYear(
        output.getUTCFullYear() +
            1,
    );
    return output;
}

async function loadPlans(
    admin: any,
) {
    const result = await admin
        .from("rental_plans")
        .select(
            "id, code, plan_name, rental_type, price_amount, currency, event_limit, team_member_limit, features, is_active",
        )
        .eq("is_active", true)
        .order("rental_type", {
            ascending: true,
        })
        .order("plan_name", {
            ascending: true,
        });

    if (
        result.error &&
        ![
            "42P01",
            "PGRST205",
        ].includes(
            String(
                result.error.code ||
                    "",
            ),
        )
    ) {
        throw new CompanyModuleError(
            result.error.message,
        );
    }

    return result.data || [];
}

export async function GET() {
    try {
        const actor =
            await getCompanyActor();

        let query = actor.admin
            .from("companies")
            .select("*")
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

        const [
            companyResult,
            plans,
        ] = await Promise.all([
            query,
            loadPlans(actor.admin),
        ]);

        if (
            companyResult.error
        ) {
            throw new CompanyModuleError(
                companyResult.error
                    .message,
            );
        }

        const companies =
            companyResult.data || [];
        const companyIds =
            companies.map((item) =>
                String(item.id),
            );

        let profiles: any[] =
            [];
        let events: any[] = [];

        if (
            companyIds.length
        ) {
            const [
                profileResult,
                eventResult,
            ] =
                await Promise.all([
                    actor.admin
                        .from(
                            "profiles",
                        )
                        .select("*")
                        .in(
                            "company_id",
                            companyIds,
                        ),

                    actor.admin
                        .from(
                            "events",
                        )
                        .select("*")
                        .in(
                            "company_id",
                            companyIds,
                        ),
                ]);

            if (
                profileResult.error
            ) {
                throw new CompanyModuleError(
                    profileResult.error
                        .message,
                );
            }

            if (
                eventResult.error
            ) {
                throw new CompanyModuleError(
                    eventResult.error
                        .message,
                );
            }

            profiles =
                profileResult.data ||
                [];
            events =
                eventResult.data ||
                [];
        }

        const output =
            await Promise.all(
                companies.map(
                    async (
                        company,
                    ) => ({
                        ...company,
                        userCount:
                            profiles.filter(
                                (
                                    profile,
                                ) =>
                                    String(
                                        profile.company_id,
                                    ) ===
                                    String(
                                        company.id,
                                    ),
                            ).length,
                        eventCount:
                            events.filter(
                                (
                                    event,
                                ) =>
                                    String(
                                        event.company_id,
                                    ) ===
                                    String(
                                        company.id,
                                    ),
                            ).length,
                        modules:
                            await loadCompanyModuleMap(
                                {
                                    admin:
                                        actor.admin,
                                    companyId:
                                        String(
                                            company.id,
                                        ),
                                },
                            ),
                    }),
                ),
            );

        return reply({
            success: true,
            isPlatformAdmin:
                actor.isPlatformAdmin,
            moduleCatalog:
                companyModuleCatalog,
            rentalPlans: plans,
            companies: output,
        });
    } catch (error) {
        return fail(error);
    }
}

export async function POST(
    request: Request,
) {
    let createdCompanyId = "";
    let companySetupComplete =
        false;

    try {
        const actor =
            await getCompanyActor();

        if (
            !actor.isPlatformAdmin
        ) {
            throw new CompanyModuleError(
                "Only the platform super admin can create a company and its administrator account.",
                403,
            );
        }

        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;

        const companyName =
            text(
                body.companyName,
                160,
            );
        const companySlug =
            slugify(
                text(
                    body.companySlug,
                    100,
                ) ||
                    companyName,
            );
        const billingEmail =
            email(
                body.billingEmail,
            );
        const contactNumber =
            text(
                body.contactNumber,
                40,
            );
        const adminFullName =
            text(
                body.adminFullName,
                160,
            );
        const adminEmail =
            email(
                body.adminEmail,
            );
        const adminPassword =
            typeof body.adminPassword ===
            "string"
                ? body.adminPassword
                : "";
        const status =
            text(
                body.status,
                20,
            ) || "active";
        const planId =
            text(
                body.planId,
                80,
            );
        const licenceQuantity =
            positiveInteger(
                body.eventLicenseQuantity,
                1,
            );
        const subscriptionEndText =
            text(
                body.subscriptionEndsAt,
                80,
            );

        if (
            companyName.length <
            2
        ) {
            throw new CompanyModuleError(
                "Enter a company name with at least 2 characters.",
            );
        }

        if (
            companySlug.length <
            2
        ) {
            throw new CompanyModuleError(
                "Enter a valid company slug.",
            );
        }

        if (
            billingEmail &&
            !billingEmail.includes(
                "@",
            )
        ) {
            throw new CompanyModuleError(
                "Enter a valid billing email address.",
            );
        }

        if (
            adminFullName.length <
            2
        ) {
            throw new CompanyModuleError(
                "Enter the company administrator's full name.",
            );
        }

        if (
            !adminEmail.includes(
                "@",
            )
        ) {
            throw new CompanyModuleError(
                "Enter a valid company administrator email.",
            );
        }

        if (
            adminPassword.length <
            8
        ) {
            throw new CompanyModuleError(
                "The company administrator password must be at least 8 characters.",
            );
        }

        if (
            ![
                "active",
                "suspended",
                "cancelled",
            ].includes(status)
        ) {
            throw new CompanyModuleError(
                "Choose a valid company status.",
            );
        }

        if (!planId) {
            throw new CompanyModuleError(
                "Choose a rental plan.",
            );
        }

        const {
            data: existing,
            error:
                existingError,
        } = await actor.admin
            .from("companies")
            .select(
                "id, company_name, company_slug",
            )
            .ilike(
                "company_slug",
                companySlug,
            )
            .limit(1)
            .maybeSingle();

        if (existingError) {
            throw new CompanyModuleError(
                existingError.message,
            );
        }

        if (existing) {
            throw new CompanyModuleError(
                "A company with this slug already exists.",
                409,
            );
        }

        const {
            data:
                existingAdminProfile,
            error:
                adminProfileError,
        } = await actor.admin
            .from("profiles")
            .select(
                "id, email",
            )
            .ilike(
                "email",
                adminEmail,
            )
            .limit(1)
            .maybeSingle();

        if (adminProfileError) {
            throw new CompanyModuleError(
                adminProfileError.message,
            );
        }

        if (
            existingAdminProfile
        ) {
            throw new CompanyModuleError(
                "An account already exists for the company administrator email.",
                409,
            );
        }

        const {
            data: plan,
            error: planError,
        } = await actor.admin
            .from("rental_plans")
            .select(
                "id, code, plan_name, rental_type, event_limit, team_member_limit, is_active",
            )
            .eq("id", planId)
            .eq(
                "is_active",
                true,
            )
            .maybeSingle();

        if (
            planError ||
            !plan
        ) {
            throw new CompanyModuleError(
                planError?.message ||
                    "The selected rental plan is unavailable.",
                404,
            );
        }

        let subscriptionEndsAt:
            | string
            | null = null;

        if (
            plan.rental_type ===
            "annual"
        ) {
            const endDate =
                subscriptionEndText
                    ? new Date(
                          subscriptionEndText,
                      )
                    : addOneYear();

            if (
                Number.isNaN(
                    endDate.getTime(),
                ) ||
                endDate <=
                    new Date()
            ) {
                throw new CompanyModuleError(
                    "Choose a future annual subscription end date.",
                );
            }

            subscriptionEndsAt =
                endDate.toISOString();
        }

        if (
            plan.rental_type ===
                "per_event" &&
            (licenceQuantity < 1 ||
                licenceQuantity >
                    100)
        ) {
            throw new CompanyModuleError(
                "Event licence quantity must be between 1 and 100.",
            );
        }

        const companyInsert: Record<
            string,
            unknown
        > = {
            company_name:
                companyName,
            company_slug:
                companySlug,
            billing_email:
                billingEmail ||
                adminEmail,
            contact_number:
                contactNumber ||
                null,
            status,
            current_plan_id:
                plan.id,
            created_by:
                actor.user.id,
        };

        const {
            data: company,
            error:
                companyError,
        } = await actor.admin
            .from("companies")
            .insert(
                companyInsert,
            )
            .select("*")
            .single();

        if (
            companyError ||
            !company
        ) {
            throw new CompanyModuleError(
                companyError?.message ||
                    "Unable to create the company.",
            );
        }

        createdCompanyId =
            String(company.id);

        const moduleRows =
            companyModuleKeys.map(
                (moduleKey) => ({
                    company_id:
                        createdCompanyId,
                    module_key:
                        moduleKey,
                    enabled: true,
                    updated_by:
                        actor.user.id,
                }),
            );

        const roleRows = (
            [
                "organizer",
                "viewer",
                "scanner",
            ] as const
        ).flatMap((role) => {
            const map =
                defaultRoleModules(
                    role,
                );

            return companyModuleKeys.map(
                (moduleKey) => ({
                    company_id:
                        createdCompanyId,
                    role,
                    module_key:
                        moduleKey,
                    enabled:
                        map[moduleKey],
                    updated_by:
                        actor.user.id,
                }),
            );
        });

        const [
            moduleResult,
            roleResult,
        ] = await Promise.all([
            actor.admin
                .from(
                    "company_module_settings",
                )
                .upsert(
                    moduleRows,
                    {
                        onConflict:
                            "company_id,module_key",
                    },
                ),

            actor.admin
                .from(
                    "company_role_module_permissions",
                )
                .upsert(
                    roleRows,
                    {
                        onConflict:
                            "company_id,role,module_key",
                    },
                ),
        ]);

        if (
            moduleResult.error
        ) {
            throw new CompanyModuleError(
                moduleResult.error
                    .message,
            );
        }

        if (roleResult.error) {
            throw new CompanyModuleError(
                roleResult.error
                    .message,
            );
        }

        if (
            plan.rental_type ===
            "annual"
        ) {
            const {
                error:
                    subscriptionError,
            } = await actor.admin
                .from(
                    "company_subscriptions",
                )
                .insert({
                    company_id:
                        createdCompanyId,
                    plan_id:
                        plan.id,
                    status:
                        "active",
                    starts_at:
                        new Date().toISOString(),
                    ends_at:
                        subscriptionEndsAt,
                    created_by:
                        actor.user.id,
                });

            if (
                subscriptionError
            ) {
                throw new CompanyModuleError(
                    subscriptionError.message,
                );
            }
        } else {
            const {
                error:
                    licenceError,
            } = await actor.admin
                .from(
                    "event_licenses",
                )
                .insert(
                    Array.from(
                        {
                            length:
                                licenceQuantity,
                        },
                        () => ({
                            company_id:
                                createdCompanyId,
                            plan_id:
                                plan.id,
                            status:
                                "available",
                            starts_at:
                                new Date().toISOString(),
                            created_by:
                                actor.user.id,
                        }),
                    ),
                );

            if (
                licenceError
            ) {
                throw new CompanyModuleError(
                    licenceError.message,
                );
            }
        }

        const administrator =
            await createCompanyAdministrator(
                {
                    admin:
                        actor.admin,
                    companyId:
                        createdCompanyId,
                    fullName:
                        adminFullName,
                    email:
                        adminEmail,
                    password:
                        adminPassword,
                    createdBy:
                        actor.user.id,
                },
            );

        companySetupComplete =
            true;

        return reply(
            {
                success: true,
                message:
                    `Company and administrator account created. ${administrator.email} can sign in immediately using the password set by the platform admin.`,
                administrator: {
                    id:
                        administrator.userId,
                    fullName:
                        administrator.fullName,
                    email:
                        administrator.email,
                },
                company: {
                    ...company,
                    owner_user_id:
                        administrator.userId,
                    billing_email:
                        billingEmail ||
                        administrator.email,
                    plan,
                    userCount: 1,
                    eventCount: 0,
                },
            },
            201,
        );
    } catch (error) {
        if (
            createdCompanyId &&
            !companySetupComplete
        ) {
            try {
                const actor =
                    await getCompanyActor();

                if (
                    actor.isPlatformAdmin
                ) {
                    await actor.admin
                        .from(
                            "companies",
                        )
                        .delete()
                        .eq(
                            "id",
                            createdCompanyId,
                        );
                }
            } catch {
                // Keep the original creation error.
            }
        }

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
            typeof body.companyId ===
            "string"
                ? body.companyId.trim()
                : "";
        const moduleKey =
            body.moduleKey;

        if (!companyId) {
            throw new CompanyModuleError(
                "Choose a company.",
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

        assertCompanyScope({
            actor,
            companyId,
        });

        const { error } =
            await actor.admin
                .from(
                    "company_module_settings",
                )
                .upsert(
                    {
                        company_id:
                            companyId,
                        module_key:
                            moduleKey,
                        enabled:
                            body.enabled,
                        updated_by:
                            actor.user.id,
                    },
                    {
                        onConflict:
                            "company_id,module_key",
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
                body.enabled
                    ? "Module enabled for the company."
                    : "Module disabled for the company.",
            modules:
                await loadCompanyModuleMap(
                    {
                        admin:
                            actor.admin,
                        companyId,
                    },
                ),
        });
    } catch (error) {
        return fail(error);
    }
}

export async function DELETE(
    request: Request,
) {
    try {
        const actor =
            await getCompanyActor();

        if (
            !actor.isPlatformAdmin
        ) {
            throw new CompanyModuleError(
                "Only the platform super admin can delete a company.",
                403,
            );
        }

        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const companyId =
            typeof body.companyId ===
            "string"
                ? body.companyId.trim()
                : "";

        if (!companyId) {
            throw new CompanyModuleError(
                "Choose a company to delete.",
            );
        }

        const {
            data: company,
            error: lookupError,
        } = await actor.admin
            .from("companies")
            .select(
                "id, company_name",
            )
            .eq("id", companyId)
            .maybeSingle();

        if (lookupError) {
            throw new CompanyModuleError(
                lookupError.message,
            );
        }

        if (!company) {
            throw new CompanyModuleError(
                "The company could not be found.",
                404,
            );
        }

        const deletion =
            await actor.admin
                .from("companies")
                .delete()
                .eq("id", companyId)
                .select("id")
                .maybeSingle();

        if (deletion.error) {
            const isForeignKey =
                String(
                    deletion.error
                        .code || "",
                ) === "23503";

            throw new CompanyModuleError(
                isForeignKey
                    ? "This company still has events, users or other records attached. Remove or reassign them before deleting the company."
                    : deletion.error
                          .message,
                isForeignKey
                    ? 409
                    : 500,
            );
        }

        if (!deletion.data) {
            throw new CompanyModuleError(
                "The company was not deleted because it no longer exists.",
                404,
            );
        }

        return reply({
            success: true,
            message: `${company.company_name || "Company"} was permanently deleted.`,
        });
    } catch (error) {
        return fail(error);
    }
}

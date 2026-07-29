import {
    NextResponse,
} from "next/server";
import {
    cleanModuleMap,
    companyModuleCatalog,
    defaultCompanyModules,
    type CompanyModuleKey,
} from "@/lib/company-modules";
import {
    assertCompanyScope,
    CompanyModuleError,
    getCompanyActor,
    requireCompanyPermission,
} from "@/lib/company-module-server";
import {
    registrationMode as normalizeRegistrationMode,
} from "@/lib/event-configuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const addonCatalog = [
    {
        key: "guest_invitations",
        moduleKey: "invitations",
        name: "Guest Invitations & RSVP",
        description:
            "Send personalised invitation links and track RSVP responses.",
        route: "invitations",
    },
    {
        key: "stripe_payments",
        moduleKey: "payments",
        name: "Stripe Ticket Payments",
        description:
            "Create paid ticket tiers and receive payments through the event company.",
        route: "payments",
    },
    {
        key: "guest_table_selection",
        moduleKey: "table_selection",
        name: "Guest Table Selection",
        description:
            "Allow eligible guests to select an available table.",
        route: "table-selection",
    },
    {
        key: "badge_designer",
        moduleKey: "badges",
        name: "Badge Designer",
        description:
            "Design guest badges using registration, ticket, table and QR fields.",
        route: "badges",
    },
    {
        key: "direct_printing",
        moduleKey: "direct_printing",
        name: "Browser Badge Printing",
        description:
            "Print badges using any printer installed on the event computer.",
        route: "check-in-printing",
    },
] satisfies Array<{
    key: string;
    moduleKey: CompanyModuleKey;
    name: string;
    description: string;
    route: string;
}>;

function reply(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to create the event.",
        },
        error instanceof CompanyModuleError
            ? error.status
            : 500,
    );
}

function text(
    value: unknown,
    max = 4000,
) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
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
        .slice(0, 100);
}

function integer(
    value: unknown,
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed)
        ? parsed
        : null;
}

function missingObject(
    error: {
        code?: string | null;
    } | null,
) {
    return [
        "42P01",
        "42703",
        "PGRST200",
        "PGRST204",
        "PGRST205",
    ].includes(
        String(error?.code || ""),
    );
}

async function companyModules(
    admin: any,
    companyId: string,
) {
    const result = await admin
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

    if (result.error) {
        if (
            missingObject(
                result.error,
            )
        ) {
            return {
                ...defaultCompanyModules,
            };
        }

        throw new CompanyModuleError(
            result.error.message,
        );
    }

    const output = {
        ...defaultCompanyModules,
    };

    for (const row of
        result.data || []) {
        const key =
            row.module_key as CompanyModuleKey;

        if (
            key in output
        ) {
            output[key] =
                Boolean(
                    row.enabled,
                );
        }
    }

    return output;
}

async function uniqueSlug(
    admin: any,
    requested: string,
) {
    const base =
        slugify(requested) ||
        `event-${Date.now()}`;
    let candidate = base;
    let suffix = 2;

    while (true) {
        const result = await admin
            .from("events")
            .select("id")
            .eq(
                "event_slug",
                candidate,
            )
            .limit(1)
            .maybeSingle();

        if (result.error) {
            throw new CompanyModuleError(
                result.error.message,
            );
        }

        if (!result.data) {
            return candidate;
        }

        candidate =
            `${base.slice(
                0,
                90,
            )}-${suffix}`;
        suffix += 1;
    }
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
            const companyId =
                String(
                    actor.profile
                        .company_id ||
                        "",
                );

            if (!companyId) {
                throw new CompanyModuleError(
                    "Your account is not assigned to a company.",
                    403,
                );
            }

            await requireCompanyPermission({
                actor,
                companyId,
                permission:
                    "create_events",
                message:
                    "Your Company Admin role cannot create events.",
            });

            query = query.eq(
                "id",
                companyId,
            );
        }

        const {
            data: companies,
            error,
        } = await query;

        if (error) {
            throw new CompanyModuleError(
                error.message,
            );
        }

        const output =
            await Promise.all(
                (
                    companies || []
                ).map(
                    async (
                        company,
                    ) => {
                        const modules =
                            await companyModules(
                                actor.admin,
                                String(
                                    company.id,
                                ),
                            );

                        const eventCountResult =
                            await actor.admin
                                .from(
                                    "events",
                                )
                                .select(
                                    "id",
                                    {
                                        count:
                                            "exact",
                                        head: true,
                                    },
                                )
                                .eq(
                                    "company_id",
                                    company.id,
                                );

                        const active =
                            String(
                                company.status ||
                                    "active",
                            ) ===
                            "active";

                        return {
                            id:
                                String(
                                    company.id,
                                ),
                            companyName:
                                String(
                                    company.company_name ||
                                        company.name ||
                                        "Event company",
                                ),
                            companySlug:
                                String(
                                    company.company_slug ||
                                        "",
                                ),
                            status:
                                String(
                                    company.status ||
                                        "active",
                                ),
                            planName:
                                "Company access",
                            rentalType:
                                null,
                            eventCount:
                                eventCountResult.count ||
                                0,
                            eventLimit:
                                null,
                            availableLicenses:
                                0,
                            allowed:
                                actor.isPlatformAdmin ||
                                active,
                            reason:
                                actor.isPlatformAdmin ||
                                active
                                    ? null
                                    : "This company is not active.",
                            modules,
                        };
                    },
                ),
            );

        return reply({
            success: true,
            isPlatformAdmin:
                actor.isPlatformAdmin,
            companies: output,
            moduleCatalog:
                companyModuleCatalog,
            addonCatalog,
        });
    } catch (error) {
        return fail(error);
    }
}

export async function POST(
    request: Request,
) {
    let createdEventId = "";

    try {
        const actor =
            await getCompanyActor();
        const body =
            (await request.json()) as Record<
                string,
                any
            >;

        const role =
            String(
                actor.profile.role ||
                    "",
            ).toLowerCase();

        if (
            !actor.isPlatformAdmin &&
            role !==
            "admin"
        ) {
            throw new CompanyModuleError(
                "Only the platform admin or a Company Admin can create events.",
                403,
            );
        }

        const companyId =
            text(
                body.companyId,
                80,
            ) ||
            String(
                actor.profile
                    .company_id ||
                    "",
            );

        if (!companyId) {
            throw new CompanyModuleError(
                "Choose an event company.",
            );
        }

        assertCompanyScope({
            actor,
            companyId,
        });

        await requireCompanyPermission({
            actor,
            companyId,
            permission:
                "create_events",
            message:
                "Your Company Admin role cannot create events.",
        });

        const {
            data: company,
            error:
                companyError,
        } = await actor.admin
            .from("companies")
            .select("*")
            .eq(
                "id",
                companyId,
            )
            .maybeSingle();

        if (
            companyError ||
            !company
        ) {
            throw new CompanyModuleError(
                companyError?.message ||
                    "The event company could not be found.",
                companyError
                    ? 400
                    : 404,
            );
        }

        if (
            !actor.isPlatformAdmin &&
            String(
                company.status ||
                    "active",
            ) !== "active"
        ) {
            throw new CompanyModuleError(
                "The selected company is not active.",
                409,
            );
        }

        const eventName =
            text(
                body.eventName,
                180,
            );

        if (
            eventName.length <
            2
        ) {
            throw new CompanyModuleError(
                "Enter an event name with at least 2 characters.",
            );
        }

        const eventSlug =
            await uniqueSlug(
                actor.admin,
                text(
                    body.eventSlug,
                    120,
                ) ||
                    eventName,
            );

        const maxGuests =
            integer(
                body.maxGuests,
            );

        if (
            maxGuests !==
                null &&
            (
                maxGuests < 1 ||
                maxGuests >
                    20000
            )
        ) {
            throw new CompanyModuleError(
                "Maximum guests must be between 1 and 20,000.",
            );
        }

        const allowedModules =
            await companyModules(
                actor.admin,
                companyId,
            );
        const requestedModules =
            cleanModuleMap(
                body.enabledModules,
            );

        for (const moduleItem of
            companyModuleCatalog) {
            if (
                allowedModules[
                    moduleItem.key
                ] === false
            ) {
                requestedModules[
                    moduleItem.key
                ] = false;
            }
        }

        const requestedAddons =
            body.addons &&
            typeof body.addons ===
                "object"
                ? body.addons
                : {};

        // Whichever guest-access method the event is created with governs
        // the Guest Invitations & RSVP addon and registration-open state —
        // same forcing lib/event-configuration.ts applies when an admin
        // later switches mode from the settings page, so a freshly created
        // event never starts in an inconsistent state (mode set one way,
        // addon/registration-open left the other).
        const requestedRegistrationMode =
            allowedModules.invitations !==
            false
                ? normalizeRegistrationMode(
                      body.registrationMode,
                      "public_registration",
                  )
                : "public_registration";

        const addonRows =
            addonCatalog.map(
                (addon) => {
                    const enabled =
                        addon.key ===
                        "guest_invitations"
                            ? requestedRegistrationMode ===
                              "invitation_only"
                            : requestedAddons[
                                  addon.key
                              ] === true &&
                              allowedModules[
                                  addon.moduleKey
                              ] !== false;

                    requestedModules[
                        addon.moduleKey
                    ] = enabled;

                    return {
                        addon_key:
                            addon.key,
                        enabled,
                    };
                },
            );

        const registrationOpen =
            requestedRegistrationMode ===
                "public_registration" &&
            body.registrationOpen !==
            false;
        const now =
            new Date().toISOString();

        const insertPayload = {
            company_id:
                companyId,
            event_name:
                eventName,
            event_slug:
                eventSlug,
            event_date:
                text(
                    body.eventDate,
                    40,
                ) || null,
            event_time:
                text(
                    body.eventTime,
                    40,
                ) || null,
            venue:
                text(
                    body.venue,
                    300,
                ) || null,
            description:
                text(
                    body.description,
                    4000,
                ) || null,
            status:
                body.status ===
                "published"
                    ? "published"
                    : "draft",
            max_guests:
                maxGuests,
            registration_open:
                registrationOpen,
            created_by:
                actor.user.id,
            created_at: now,
            updated_at: now,
        };

        const {
            data: created,
            error:
                createError,
        } = await actor.admin
            .from("events")
            .insert(
                insertPayload,
            )
            .select("*")
            .single();

        if (
            createError ||
            !created
        ) {
            throw new CompanyModuleError(
                createError?.message ||
                    "Unable to create the event.",
            );
        }

        createdEventId =
            String(
                created.id,
            );

        const {
            error:
                settingsError,
        } = await actor.admin
            .from(
                "event_settings",
            )
            .upsert(
                {
                    event_id:
                        createdEventId,
                    enabled_modules:
                        requestedModules,
                    registration_mode:
                        requestedRegistrationMode,
                    registration_is_open:
                        registrationOpen,
                    registration_closed_message:
                        text(
                            body.registrationClosedMessage,
                            1000,
                        ) ||
                        "Registration for this event is currently closed.",
                    created_at: now,
                    updated_at: now,
                },
                {
                    onConflict:
                        "event_id",
                },
            );

        if (settingsError) {
            throw new CompanyModuleError(
                settingsError.message,
            );
        }

        const {
            error: addonError,
        } = await actor.admin
            .from("event_addons")
            .upsert(
                addonRows.map(
                    (addon) => ({
                        event_id:
                            createdEventId,
                        addon_key:
                            addon.addon_key,
                        enabled:
                            addon.enabled,
                        updated_by:
                            actor.user.id,
                        created_at:
                            now,
                        updated_at:
                            now,
                    }),
                ),
                {
                    onConflict:
                        "event_id,addon_key",
                },
            );

        if (addonError) {
            throw new CompanyModuleError(
                addonError.message,
            );
        }

        const assignment =
            await actor.admin
                .from(
                    "event_members",
                )
                .upsert(
                    {
                        event_id:
                            createdEventId,
                        profile_id:
                            actor.user.id,
                        role:
                            actor.isPlatformAdmin ||
                            role ===
                                "admin"
                                ? "admin"
                                : "organizer",
                        created_at:
                            now,
                        updated_at:
                            now,
                    },
                    {
                        onConflict:
                            "event_id,profile_id",
                    },
                );

        if (
            assignment.error &&
            !missingObject(
                assignment.error,
            )
        ) {
            throw new CompanyModuleError(
                assignment.error.message,
            );
        }

        return reply(
            {
                success: true,
                eventId:
                    createdEventId,
                eventSlug,
                redirectTo:
                    `/dashboard/events/${createdEventId}/settings`,
                message:
                    "Event created successfully.",
            },
            201,
        );
    } catch (error) {
        if (createdEventId) {
            try {
                const actor =
                    await getCompanyActor();

                await actor.admin
                    .from("events")
                    .delete()
                    .eq(
                        "id",
                        createdEventId,
                    );
            } catch {
                // Keep the original error.
            }
        }

        return fail(error);
    }
}

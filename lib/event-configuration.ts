import "server-only";

import {
    cleanModuleMap,
    companyModuleCatalog,
    type CompanyModuleKey,
} from "@/lib/company-modules";
import {
    getCompanyAdminClient,
    loadCompanyModuleMap,
} from "@/lib/company-module-server";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";

export type RegistrationMode =
    | "public_registration"
    | "invitation_only";

export type EventAddonKey =
    | "guest_invitations"
    | "stripe_payments"
    | "guest_table_selection"
    | "badge_designer"
    | "direct_printing";

export type EventAddonDefinition = {
    key: EventAddonKey;
    moduleKey: CompanyModuleKey;
    name: string;
    description: string;
    route: string;
};

export const eventAddonDefinitions:
    EventAddonDefinition[] = [
        {
            key:
                "guest_invitations",
            moduleKey:
                "invitations",
            name:
                "Guest Invitations & RSVP",
            description:
                "Send personalised invitation links and track guest responses.",
            route:
                "invitations",
        },
        {
            key:
                "stripe_payments",
            moduleKey:
                "payments",
            name:
                "Stripe Ticket Payments",
            description:
                "Sell paid ticket tiers and route payments to the event company.",
            route:
                "payments",
        },
        {
            key:
                "guest_table_selection",
            moduleKey:
                "table_selection",
            name:
                "Guest Table Selection",
            description:
                "Allow eligible guests to select an available table.",
            route:
                "table-selection",
        },
        {
            key:
                "badge_designer",
            moduleKey:
                "badges",
            name:
                "Badge Designer",
            description:
                "Design badges using guest, ticket, table and QR fields.",
            route:
                "badges",
        },
        {
            key:
                "direct_printing",
            moduleKey:
                "direct_printing",
            name:
                "Browser Badge Printing",
            description:
                "Print badges using any printer installed on the event computer.",
            route:
                "check-in-printing",
        },
    ];

export class EventConfigurationError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "EventConfigurationError";
        this.status = status;
    }
}

function missingRelation(
    error: unknown,
) {
    const code =
        error && typeof error === "object"
            ? (error as { code?: unknown }).code
            : undefined;

    return [
        "42P01",
        "42703",
        "PGRST200",
        "PGRST204",
        "PGRST205",
    ].includes(
        String(
            code ||
                "",
        ),
    );
}

function text(
    value: unknown,
    max = 4000,
) {
    return typeof value ===
        "string"
        ? value
              .trim()
              .slice(0, max)
        : "";
}

function nullableText(
    value: unknown,
    max = 4000,
) {
    const output =
        text(value, max);

    return output || null;
}

function integer(
    value: unknown,
    fallback:
        | number
        | null = null,
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    const parsed =
        Number(value);

    if (
        !Number.isInteger(
            parsed,
        )
    ) {
        return fallback;
    }

    return parsed;
}

function registrationMode(
    value: unknown,
    fallback:
        RegistrationMode,
): RegistrationMode {
    return value ===
        "invitation_only"
        ? "invitation_only"
        : value ===
            "public_registration"
          ? "public_registration"
          : fallback;
}

function slugify(
    value: string,
) {
    return value
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(
            /[^a-z0-9]+/g,
            "-",
        )
        .replace(
            /^-+|-+$/g,
            "",
        )
        .slice(0, 100);
}

export async function requireEventConfigurationActor(
    eventId: string,
) {
    const server =
        await createSupabaseServerClient();
    const db =
        server;
    const {
        data: { user },
    } =
        await server.auth
            .getUser();

    if (!user) {
        throw new EventConfigurationError(
            "You must be logged in.",
            401,
        );
    }

    const {
        data: profile,
        error: profileError,
    } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (
        profileError ||
        !profile
    ) {
        throw new EventConfigurationError(
            profileError
                ?.message ||
                "The user profile could not be found.",
            profileError
                ? 400
                : 404,
        );
    }

    const admin =
        getCompanyAdminClient();

    const {
        data: event,
        error: eventError,
    } = await admin
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

    if (
        eventError ||
        !event
    ) {
        throw new EventConfigurationError(
            eventError
                ?.message ||
                "The event could not be found.",
            eventError
                ? 400
                : 404,
        );
    }

    const isPlatformAdmin =
        profile.platform_role ===
        "super_admin";
    const isCompanyAdmin =
        profile.role ===
        "admin";
    const isOrganizer =
        profile.role ===
            "organizer" ||
        profile.role ===
            "organiser";

    if (
        !isPlatformAdmin &&
        String(
            profile.company_id ||
                "",
        ) !==
            String(
                event.company_id,
            )
    ) {
        throw new EventConfigurationError(
            "You cannot manage an event belonging to another company.",
            403,
        );
    }

    if (
        !isPlatformAdmin &&
        !isCompanyAdmin
    ) {
        const {
            data: assignment,
            error:
                assignmentError,
        } = await admin
            .from(
                "event_members",
            )
            .select(
                "event_id, profile_id, role",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "profile_id",
                user.id,
            )
            .maybeSingle();

        if (
            assignmentError ||
            !assignment
        ) {
            throw new EventConfigurationError(
                assignmentError
                    ?.message ||
                    "This event is not assigned to your account.",
                assignmentError
                    ? 400
                    : 403,
            );
        }
    }

    if (
        !isPlatformAdmin &&
        !isCompanyAdmin &&
        !isOrganizer
    ) {
        throw new EventConfigurationError(
            "Only event managers can open Settings & Add-ons.",
            403,
        );
    }

    return {
        user,
        profile,
        event,
        admin,
        isPlatformAdmin,
        isCompanyAdmin,
        isOrganizer,
        canManageSettings:
            isPlatformAdmin ||
            isCompanyAdmin,
        canManageAddons:
            isPlatformAdmin ||
            isCompanyAdmin ||
            isOrganizer,
    };
}

export async function loadEventConfiguration(
    eventId: string,
) {
    const actor =
        await requireEventConfigurationActor(
            eventId,
        );

    const [
        settingsResult,
        addonResult,
        companyModuleMap,
    ] = await Promise.all([
        actor.admin
            .from(
                "event_settings",
            )
            .select("*")
            .eq(
                "event_id",
                eventId,
            )
            .maybeSingle(),

        actor.admin
            .from(
                "event_addons",
            )
            .select(
                "addon_key, enabled, updated_at",
            )
            .eq(
                "event_id",
                eventId,
            ),

        loadCompanyModuleMap({
            admin:
                actor.admin,
            companyId:
                String(
                    actor.event
                        .company_id,
                ),
        }),
    ]);

    if (
        settingsResult.error &&
        !missingRelation(
            settingsResult.error,
        )
    ) {
        throw new EventConfigurationError(
            settingsResult.error
                .message,
        );
    }

    if (
        addonResult.error &&
        !missingRelation(
            addonResult.error,
        )
    ) {
        throw new EventConfigurationError(
            addonResult.error
                .message,
        );
    }

    const settings =
        settingsResult.data ||
        null;
    const eventModules =
        cleanModuleMap(
            settings
                ?.enabled_modules,
        );

    const addonState =
        new Map<
            string,
            {
                enabled: boolean;
                updatedAt:
                    | string
                    | null;
            }
        >();

    for (const row of
        addonResult.data ||
        []) {
        addonState.set(
            String(
                row.addon_key,
            ),
            {
                enabled:
                    Boolean(
                        row.enabled,
                    ),
                updatedAt:
                    row.updated_at ||
                    null,
            },
        );
    }

    const storedRegistrationOpen =
        settings
            ?.registration_is_open ??
        actor.event
            .registration_open !==
            false;
    const invitationsEnabled =
        addonState.get(
            "guest_invitations",
        )?.enabled ===
        true;
    const inferredRegistrationMode:
        RegistrationMode =
        storedRegistrationOpen
            ? "public_registration"
            : invitationsEnabled
              ? "invitation_only"
              : "public_registration";
    const effectiveRegistrationMode =
        registrationMode(
            settings
                ?.registration_mode,
            inferredRegistrationMode,
        );
    const effectiveRegistrationOpen =
        effectiveRegistrationMode ===
            "public_registration" &&
        storedRegistrationOpen;

    // The access method is the source of truth. This prevents legacy rows
    // from exposing public registration and invitations at the same time.
    eventModules.invitations =
        effectiveRegistrationMode ===
        "invitation_only";

    const addons =
        eventAddonDefinitions.map(
            (definition) => {
                const current =
                    addonState.get(
                        definition.key,
                    );

                return {
                    ...definition,
                    allowed:
                        actor
                            .isPlatformAdmin ||
                        companyModuleMap[
                            definition
                                .moduleKey
                        ] !==
                            false,
                    enabled:
                        definition.key ===
                        "guest_invitations"
                            ? effectiveRegistrationMode ===
                              "invitation_only"
                            : current
                                  ?.enabled ===
                              true,
                    updatedAt:
                        current
                            ?.updatedAt ||
                        null,
                };
            },
        );

    return {
        actor,
        event: {
            id:
                String(
                    actor.event.id,
                ),
            company_id:
                String(
                    actor.event
                        .company_id,
                ),
            event_name:
                String(
                    actor.event
                        .event_name ||
                        "",
                ),
            event_slug:
                String(
                    actor.event
                        .event_slug ||
                        "",
                ),
            event_date:
                actor.event
                    .event_date ||
                null,
            event_time:
                actor.event
                    .event_time ||
                null,
            venue:
                actor.event
                    .venue ||
                null,
            description:
                actor.event
                    .description ||
                null,
            status:
                actor.event
                    .status ||
                "draft",
            max_guests:
                actor.event
                    .max_guests ??
                null,
        },
        settings: {
            enabled_modules:
                eventModules,
            registration_mode:
                effectiveRegistrationMode,
            registration_is_open:
                effectiveRegistrationOpen,
            registration_closed_message:
                settings
                    ?.registration_closed_message ||
                "Registration for this event is currently closed.",
        },
        companyModules:
            companyModuleMap,
        moduleCatalog:
            companyModuleCatalog,
        addons,
        access: {
            isPlatformAdmin:
                actor
                    .isPlatformAdmin,
            canManageSettings:
                actor
                    .canManageSettings,
            canManageAddons:
                actor
                    .canManageAddons,
        },
    };
}

export async function saveEventConfiguration({
    eventId,
    body,
}: {
    eventId: string;
    body: Record<
        string,
        unknown
    >;
}) {
    const configuration =
        await loadEventConfiguration(
            eventId,
        );
    const {
        actor,
    } = configuration;

    const enabledModules =
        cleanModuleMap(
            body.enabledModules ??
                body.enabled_modules ??
                configuration
                    .settings
                    .enabled_modules,
        );

    for (const moduleItem of
        companyModuleCatalog) {
        if (
            configuration
                .companyModules[
                moduleItem.key
            ] === false
        ) {
            enabledModules[
                moduleItem.key
            ] = false;
        }
    }

    const rawAddonInput =
        body.addons &&
        typeof body.addons ===
            "object"
            ? body.addons
            : {};
    const addonInput:
        Record<string, unknown> = {
            ...rawAddonInput,
        };
    const registrationInput: Record<string, unknown> =
        body.registration &&
        typeof body.registration ===
            "object"
            ? (body.registration as Record<string, unknown>)
            : {};
    const requestedRegistrationMode =
        actor.canManageSettings
            ? registrationMode(
                  registrationInput.mode ??
                      body.registration_mode,
                  configuration
                      .settings
                      .registration_mode,
              )
            : configuration
                  .settings
                  .registration_mode;

    if (
        actor.canManageSettings
    ) {
        addonInput.guest_invitations =
            requestedRegistrationMode ===
            "invitation_only";
        enabledModules.invitations =
            requestedRegistrationMode ===
            "invitation_only";
    }

    if (
        requestedRegistrationMode ===
            "invitation_only" &&
        !(
            actor.isPlatformAdmin ||
            configuration.companyModules
                .invitations !==
                false
        )
    ) {
        throw new EventConfigurationError(
            "Guest Invitations & RSVP is disabled for this event company.",
            403,
        );
    }

    for (const definition of
        eventAddonDefinitions) {
        const requested =
            addonInput[
                definition.key
            ];

        if (
            requested === true &&
            !(
                actor
                    .isPlatformAdmin ||
                configuration
                    .companyModules[
                    definition
                        .moduleKey
                ] !== false
            )
        ) {
            throw new EventConfigurationError(
                `${definition.name} is disabled for the event company.`,
                403,
            );
        }

        if (
            typeof requested ===
            "boolean"
        ) {
            enabledModules[
                definition.moduleKey
            ] = requested;
        }
    }

    if (
        actor
            .canManageSettings
    ) {
        const eventInput: Record<string, unknown> =
            body.event &&
            typeof body.event ===
                "object"
                ? (body.event as Record<string, unknown>)
                : {};

        const eventName = actor.isPlatformAdmin
            ? text(
                eventInput.eventName ??
                    eventInput.event_name ??
                    configuration
                        .event
                        .event_name,
                180,
            )
            : text(
                configuration
                    .event
                    .event_name,
                180,
            );
        const eventSlug =
            slugify(
                text(
                    eventInput.eventSlug ??
                        eventInput.event_slug ??
                        configuration
                            .event
                            .event_slug ??
                        eventName,
                    120,
                ),
            );

        if (
            eventName.length <
            2
        ) {
            throw new EventConfigurationError(
                "Enter an event name with at least 2 characters.",
            );
        }

        if (
            eventSlug.length <
            2
        ) {
            throw new EventConfigurationError(
                "Enter a valid event slug.",
            );
        }

        const duplicate =
            await actor.admin
                .from("events")
                .select("id")
                .eq(
                    "event_slug",
                    eventSlug,
                )
                .neq(
                    "id",
                    eventId,
                )
                .limit(1)
                .maybeSingle();

        if (
            duplicate.error
        ) {
            throw new EventConfigurationError(
                duplicate.error
                    .message,
            );
        }

        if (
            duplicate.data
        ) {
            throw new EventConfigurationError(
                "Another event already uses this slug.",
                409,
            );
        }

        const requestedRegistrationOpen =
            typeof registrationInput.isOpen ===
            "boolean"
                ? registrationInput.isOpen
                : typeof body.registration_is_open ===
                    "boolean"
                  ? body.registration_is_open
                  : configuration
                        .settings
                        .registration_is_open;
        const registrationOpen =
            requestedRegistrationMode ===
                "public_registration" &&
            requestedRegistrationOpen;
        const closedMessage =
            text(
                registrationInput.closedMessage ??
                    body.registration_closed_message ??
                    configuration
                        .settings
                        .registration_closed_message,
                1000,
            ) ||
            "Registration for this event is currently closed.";

        const status =
            [
                "draft",
                "published",
            ].includes(
                text(
                    eventInput.status ??
                        configuration
                            .event
                            .status,
                    30,
                ).toLowerCase(),
            )
                ? text(
                      eventInput.status ??
                          configuration
                              .event
                              .status,
                      30,
                  ).toLowerCase()
                : "draft";

        const maxGuests =
            integer(
                eventInput.maxGuests ??
                    eventInput.max_guests,
                configuration
                    .event
                    .max_guests,
            );

        if (
            maxGuests !==
                null &&
            (maxGuests < 1 ||
                maxGuests >
                    1000000)
        ) {
            throw new EventConfigurationError(
                "Maximum guests must be between 1 and 1,000,000.",
            );
        }

        const {
            error:
                eventUpdateError,
        } = await actor.admin
            .from("events")
            .update({
                event_name:
                    eventName,
                event_slug:
                    eventSlug,
                event_date:
                    nullableText(
                        eventInput.eventDate ??
                            eventInput.event_date,
                        40,
                    ),
                event_time:
                    nullableText(
                        eventInput.eventTime ??
                            eventInput.event_time,
                        40,
                    ),
                venue:
                    nullableText(
                        eventInput.venue,
                        300,
                    ),
                description:
                    nullableText(
                        eventInput.description,
                        4000,
                    ),
                status,
                max_guests:
                    maxGuests,
                registration_open:
                    registrationOpen,
                updated_at:
                    new Date().toISOString(),
            })
            .eq("id", eventId);

        if (
            eventUpdateError
        ) {
            throw new EventConfigurationError(
                eventUpdateError.message,
            );
        }

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
                        eventId,
                    enabled_modules:
                        enabledModules,
                    registration_mode:
                        requestedRegistrationMode,
                    registration_is_open:
                        registrationOpen,
                    registration_closed_message:
                        closedMessage,
                    updated_at:
                        new Date().toISOString(),
                },
                {
                    onConflict:
                        "event_id",
                },
            );

        if (
            settingsError
        ) {
            throw new EventConfigurationError(
                settingsError.message,
            );
        }
    }

    if (
        actor
            .canManageAddons
    ) {
        const rows =
            eventAddonDefinitions
                .filter(
                    (
                        definition,
                    ) =>
                        typeof addonInput[
                            definition
                                .key
                        ] ===
                        "boolean" ||
                        (
                            actor.canManageSettings &&
                            definition.key ===
                                "guest_invitations"
                        ),
                )
                .map(
                    (
                        definition,
                    ) => ({
                        event_id:
                            eventId,
                        addon_key:
                            definition
                                .key,
                        enabled:
                            Boolean(
                                addonInput[
                                    definition
                                        .key
                                ],
                            ),
                        updated_by:
                            actor
                                .user
                                .id,
                        updated_at:
                            new Date().toISOString(),
                    }),
                );

        if (
            rows.length >
            0
        ) {
            const {
                error,
            } = await actor.admin
                .from(
                    "event_addons",
                )
                .upsert(
                    rows,
                    {
                        onConflict:
                            "event_id,addon_key",
                    },
                );

            if (error) {
                throw new EventConfigurationError(
                    error.message,
                );
            }
        }

        if (
            !actor
                .canManageSettings
        ) {
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
                            eventId,
                        enabled_modules:
                            enabledModules,
                        updated_at:
                            new Date().toISOString(),
                    },
                    {
                        onConflict:
                            "event_id",
                    },
                );

            if (
                settingsError
            ) {
                throw new EventConfigurationError(
                    settingsError.message,
                );
            }
        }
    }

    return loadEventConfiguration(
        eventId,
    );
}

export async function updateSingleAddon({
    eventId,
    addonKey,
    enabled,
}: {
    eventId: string;
    addonKey: EventAddonKey;
    enabled: boolean;
}) {
    const current =
        await loadEventConfiguration(
            eventId,
        );

    if (
        !current.actor
            .canManageAddons
    ) {
        throw new EventConfigurationError(
            "You do not have permission to change event add-ons.",
            403,
        );
    }

    if (
        addonKey ===
        "guest_invitations"
    ) {
        throw new EventConfigurationError(
            "Guest Invitations is controlled by Guest Access Method. Choose Public Registration or Invitation & RSVP in Settings & Add-ons.",
            409,
        );
    }

    const definition =
        eventAddonDefinitions.find(
            (item) =>
                item.key ===
                addonKey,
        );

    if (!definition) {
        throw new EventConfigurationError(
            "Choose a valid add-on.",
        );
    }

    if (
        enabled &&
        !(
            current.actor
                .isPlatformAdmin ||
            current
                .companyModules[
                definition
                    .moduleKey
            ] !== false
        )
    ) {
        throw new EventConfigurationError(
            "This add-on is disabled for the event company.",
            403,
        );
    }

    return saveEventConfiguration({
        eventId,
        body: {
            addons: {
                [addonKey]:
                    enabled,
            },
        },
    });
}

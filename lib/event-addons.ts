import "server-only";

import { redirect } from "next/navigation";
import {
    createClient,
    type SupabaseClient,
} from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type EventAddonKey =
    | "guest_invitations"
    | "stripe_payments"
    | "guest_table_selection"
    | "badge_designer"
    | "direct_printing";

export type EventAddonDefinition = {
    key: EventAddonKey;
    name: string;
    description: string;
    plannedRoute: string | null;
};

export const EVENT_ADDON_DEFINITIONS: EventAddonDefinition[] =
    [
        {
            key: "guest_invitations",
            name: "Guest Invitations & RSVP",
            description:
                "Send personalised invitations and track accept, decline, opened and pending responses.",
            plannedRoute: "invitations",
        },
        {
            key: "stripe_payments",
            name: "Stripe Ticket Payments",
            description:
                "Collect payment for ticket tiers through Stripe Checkout.",
            plannedRoute: "payments",
        },
        {
            key: "guest_table_selection",
            name: "Guest Table Selection",
            description:
                "Allow accepted and eligible guests to choose from tables with live capacity protection.",
            plannedRoute: "table-selection",
        },
        {
            key: "badge_designer",
            name: "Badge Designer",
            description:
                "Create event badge layouts using guest, ticket, table and QR data.",
            plannedRoute: null,
        },
        {
            key: "direct_printing",
            name: "Direct Badge Printing",
            description:
                "Send badge jobs directly to a supported local high-quality printer.",
            plannedRoute: null,
        },
    ];

type AddonActor = {
    userId: string;
    profile: {
        id: string;
        role: string;
        company_id: string | null;
        platform_role: string | null;
    };
    event: {
        id: string;
        company_id: string;
        event_name: string;
    };
    admin: SupabaseClient;
    isPlatformAdmin: boolean;
    canManage: boolean;
    planFeatures: Record<string, boolean>;
};

export class EventAddonError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "EventAddonError";
        this.status = status;
    }
}

function getAdminClient() {
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new EventAddonError(
            "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.",
            500,
        );
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}

function cleanFeatures(value: unknown) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return {};
    }

    const output: Record<string, boolean> =
        {};

    for (const [key, enabled] of Object.entries(
        value as Record<string, unknown>,
    )) {
        if (typeof enabled === "boolean") {
            output[key] = enabled;
        }
    }

    return output;
}

export function isAddonAllowedByFeatures(
    key: EventAddonKey,
    features: Record<string, boolean>,
) {
    if (features[key] === true) {
        return true;
    }

    if (
        key === "stripe_payments" &&
        features.payments === true
    ) {
        return true;
    }

    return false;
}

export async function getAddonActor(
    eventId: string,
): Promise<AddonActor> {
    const supabaseServer =
        await createSupabaseServerClient();
    const db = supabaseServer;

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        throw new EventAddonError(
            "You must be logged in.",
            401,
        );
    }

    const { data: profile, error: profileError } =
        await db
            .from("profiles")
            .select(
                "id, role, company_id, platform_role",
            )
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new EventAddonError(
            profileError.message,
        );
    }

    if (!profile) {
        throw new EventAddonError(
            "The user profile could not be found.",
            404,
        );
    }

    const admin = getAdminClient();

    const { data: event, error: eventError } =
        await admin
            .from("events")
            .select(
                "id, company_id, event_name",
            )
            .eq("id", eventId)
            .maybeSingle();

    if (eventError) {
        throw new EventAddonError(
            eventError.message,
        );
    }

    if (!event) {
        throw new EventAddonError(
            "The event could not be found.",
            404,
        );
    }

    const isPlatformAdmin =
        profile.platform_role === "super_admin";

    if (
        !isPlatformAdmin &&
        (
            !profile.company_id ||
            profile.company_id !==
                event.company_id
        )
    ) {
        throw new EventAddonError(
            "You cannot access add-ons for another company.",
            403,
        );
    }

    if (
        !isPlatformAdmin &&
        profile.role !== "admin"
    ) {
        const { data: assignment } =
            await admin
                .from("event_members")
                .select("id")
                .eq("event_id", eventId)
                .eq("profile_id", user.id)
                .maybeSingle();

        if (!assignment) {
            throw new EventAddonError(
                "This event is not assigned to your account.",
                403,
            );
        }
    }

    let planFeatures: Record<string, boolean> =
        {};

    if (isPlatformAdmin) {
        for (const definition of
            EVENT_ADDON_DEFINITIONS) {
            planFeatures[definition.key] =
                true;
        }
    } else {
        const { data: company, error } =
            await admin
                .from("companies")
                .select("current_plan_id")
                .eq("id", event.company_id)
                .maybeSingle();

        if (error) {
            throw new EventAddonError(
                error.message,
            );
        }

        if (company?.current_plan_id) {
            const { data: plan, error: planError } =
                await admin
                    .from("rental_plans")
                    .select("features")
                    .eq(
                        "id",
                        company.current_plan_id,
                    )
                    .maybeSingle();

            if (planError) {
                throw new EventAddonError(
                    planError.message,
                );
            }

            planFeatures = cleanFeatures(
                plan?.features,
            );
        }
    }

    return {
        userId: user.id,
        profile,
        event,
        admin,
        isPlatformAdmin,
        canManage:
            isPlatformAdmin ||
            ["admin", "organizer", "organiser"].includes(
                String(profile.role),
            ),
        planFeatures,
    };
}

export async function getEventAddonConfiguration(
    eventId: string,
) {
    const actor = await getAddonActor(eventId);

    const { data, error } = await actor.admin
        .from("event_addons")
        .select(
            "addon_key, enabled, updated_at",
        )
        .eq("event_id", eventId);

    if (error) {
        throw new EventAddonError(
            error.message,
        );
    }

    const state = new Map<
        string,
        {
            enabled: boolean;
            updatedAt: string | null;
        }
    >();

    for (const row of data || []) {
        state.set(String(row.addon_key), {
            enabled: Boolean(row.enabled),
            updatedAt: row.updated_at || null,
        });
    }

    const addons =
        EVENT_ADDON_DEFINITIONS.map(
            (definition) => {
                const current =
                    state.get(definition.key);

                return {
                    ...definition,
                    allowed:
                        actor.isPlatformAdmin ||
                        isAddonAllowedByFeatures(
                            definition.key,
                            actor.planFeatures,
                        ),
                    enabled:
                        current?.enabled || false,
                    updatedAt:
                        current?.updatedAt || null,
                };
            },
        );

    return {
        actor,
        event: actor.event,
        addons,
    };
}

export async function requireEventAddonEnabled(
    eventId: string,
    addonKey: EventAddonKey,
) {
    const configuration =
        await getEventAddonConfiguration(
            eventId,
        );

    const addon =
        configuration.addons.find(
            (item) =>
                item.key === addonKey,
        );

    if (
        !addon ||
        !addon.allowed ||
        !addon.enabled
    ) {
        redirect(
            `/dashboard/events/${eventId}/addons?required=${addonKey}`,
        );
    }

    return configuration;
}

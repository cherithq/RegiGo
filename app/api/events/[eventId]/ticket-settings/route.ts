import { NextResponse } from "next/server";
import {
    PaymentAccessError,
    requirePaymentManager,
} from "@/lib/payment-access";
import { resolveEventRegistrationMode } from "@/lib/event-analytics-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_SETTINGS = {
    allow_registration_sales: true,
    allow_rsvp_sales: true,
    page_title: null as string | null,
    page_subtitle: null as string | null,
    banner_color_from: "#4F46E5" as string | null,
    banner_color_to: "#EC4899" as string | null,
    banner_image_url: null as string | null,
};

function cleanText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function missingRelation(error: { message?: string } | null) {
    if (!error?.message) return false;

    const lowered = error.message.toLowerCase();

    return (
        lowered.includes("does not exist") ||
        lowered.includes("schema cache") ||
        lowered.includes("could not find")
    );
}

function json(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function handle(error: unknown) {
    return json(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage ticket settings.",
        },
        error instanceof PaymentAccessError
            ? error.status
            : 500,
    );
}

async function buildPayload(eventId: string) {
    const { actor } =
        await requirePaymentManager(eventId);
    const admin = actor.admin;

    const [settingsResult, registrationMode] =
        await Promise.all([
            // select("*") instead of an explicit column list so this keeps
            // working even before the page_title/page_subtitle/banner_color_*
            // appearance columns have been added to the database.
            admin
                .from("event_ticket_settings")
                .select("*")
                .eq("event_id", eventId)
                .maybeSingle(),

            resolveEventRegistrationMode(
                admin,
                eventId,
            ),
        ]);

    if (
        settingsResult.error &&
        !missingRelation(
            settingsResult.error,
        )
    ) {
        throw new PaymentAccessError(
            settingsResult.error.message,
        );
    }

    return {
        admin,
        settings:
            settingsResult.data ||
            DEFAULT_SETTINGS,
        registrationMode,
    };
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{ eventId: string }>;
    },
) {
    try {
        const { eventId } = await params;
        const payload = await buildPayload(eventId);

        return json({
            success: true,
            settings: payload.settings,
            registrationMode:
                payload.registrationMode,
        });
    } catch (error) {
        return handle(error);
    }
}

export async function PATCH(
    request: Request,
    {
        params,
    }: {
        params: Promise<{ eventId: string }>;
    },
) {
    try {
        const { eventId } = await params;
        const { actor } =
            await requirePaymentManager(eventId);
        const admin = actor.admin;
        const body = (await request.json()) as Record<
            string,
            unknown
        >;

        const current = await admin
            .from("event_ticket_settings")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle();

        if (
            current.error &&
            !missingRelation(current.error)
        ) {
            throw new PaymentAccessError(
                current.error.message,
            );
        }

        const base =
            current.data || DEFAULT_SETTINGS;

        const nextSettings = {
            allow_registration_sales:
                typeof body.allow_registration_sales ===
                "boolean"
                    ? body.allow_registration_sales
                    : base.allow_registration_sales,
            allow_rsvp_sales:
                typeof body.allow_rsvp_sales ===
                "boolean"
                    ? body.allow_rsvp_sales
                    : base.allow_rsvp_sales,
        };

        const appearanceProvided =
            "page_title" in body ||
            "page_subtitle" in body ||
            "banner_color_from" in body ||
            "banner_color_to" in body ||
            "banner_image_url" in body;

        const nextAppearance = {
            page_title:
                "page_title" in body
                    ? cleanText(body.page_title) || null
                    : (base.page_title ?? null),
            page_subtitle:
                "page_subtitle" in body
                    ? cleanText(body.page_subtitle) || null
                    : (base.page_subtitle ?? null),
            banner_color_from:
                "banner_color_from" in body
                    ? cleanText(body.banner_color_from) ||
                      "#4F46E5"
                    : (base.banner_color_from ?? "#4F46E5"),
            banner_color_to:
                "banner_color_to" in body
                    ? cleanText(body.banner_color_to) ||
                      "#EC4899"
                    : (base.banner_color_to ?? "#EC4899"),
            banner_image_url:
                "banner_image_url" in body
                    ? cleanText(body.banner_image_url) || null
                    : (base.banner_image_url ?? null),
        };

        const { error } = await admin
            .from("event_ticket_settings")
            .upsert(
                {
                    event_id: eventId,
                    ...nextSettings,
                    ...nextAppearance,
                    updated_at:
                        new Date().toISOString(),
                },
                { onConflict: "event_id" },
            );

        // The page_title/page_subtitle/banner_color_* appearance columns
        // are a newer addition — if they don't exist in this database yet,
        // retry without them rather than blocking the sales-channel toggles
        // from saving.
        if (error && missingRelation(error)) {
            const { error: fallbackError } = await admin
                .from("event_ticket_settings")
                .upsert(
                    {
                        event_id: eventId,
                        ...nextSettings,
                        updated_at:
                            new Date().toISOString(),
                    },
                    { onConflict: "event_id" },
                );

            if (fallbackError) {
                throw new PaymentAccessError(
                    `${fallbackError.message} Run sql/2026-07-30-event-ticket-settings.sql and restart Next.js.`,
                );
            }

            if (appearanceProvided) {
                throw new PaymentAccessError(
                    "Ticket sales settings were saved, but page appearance needs sql/2026-07-30-event-ticket-settings-appearance.sql to be run first.",
                );
            }
        } else if (error) {
            throw new PaymentAccessError(
                missingRelation(error)
                    ? `${error.message} Run sql/2026-07-30-event-ticket-settings.sql and restart Next.js.`
                    : error.message,
            );
        }

        const registrationMode =
            await resolveEventRegistrationMode(
                admin,
                eventId,
            );

        return json({
            success: true,
            message: "Ticket sales settings updated.",
            settings: {
                ...nextSettings,
                ...nextAppearance,
            },
            registrationMode,
        });
    } catch (error) {
        return handle(error);
    }
}

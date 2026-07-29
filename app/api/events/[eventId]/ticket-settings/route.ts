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
};

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
            admin
                .from("event_ticket_settings")
                .select(
                    "allow_registration_sales, allow_rsvp_sales",
                )
                .eq("event_id", eventId)
                .maybeSingle(),

            resolveEventRegistrationMode(
                admin,
                eventId,
            ),
        ]);

    if (settingsResult.error) {
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
            .select(
                "allow_registration_sales, allow_rsvp_sales",
            )
            .eq("event_id", eventId)
            .maybeSingle();

        if (current.error) {
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

        const { error } = await admin
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

        if (error) {
            throw new PaymentAccessError(
                error.message,
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
            settings: nextSettings,
            registrationMode,
        });
    } catch (error) {
        return handle(error);
    }
}

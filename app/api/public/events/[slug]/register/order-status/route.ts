import { NextResponse } from "next/server";
import {
    PaymentError,
    getPaymentAdmin,
} from "@/lib/stripe-payments";
import { activateQrPassIfReady } from "@/lib/qr-pass-activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            slug: string;
        }>;
    },
) {
    try {
        const { slug } = await params;
        const admin = getPaymentAdmin();

        const url = new URL(request.url);
        const registrationId = url.searchParams.get(
            "registrationId",
        );
        const sessionId =
            url.searchParams.get("session_id");
        const freeOrder =
            url.searchParams.get("free_order");

        if (!registrationId) {
            throw new PaymentError(
                "The registration reference is missing.",
            );
        }

        if (!sessionId && !freeOrder) {
            throw new PaymentError(
                "The order reference is missing.",
            );
        }

        const { data: event, error: eventError } =
            await admin
                .from("events")
                .select("id, event_slug")
                .eq("event_slug", slug)
                .maybeSingle();

        if (eventError || !event) {
            throw new PaymentError(
                eventError?.message ||
                    "The event could not be found.",
                eventError ? 400 : 404,
            );
        }

        let query = admin
            .from("orders")
            .select(
                "id, order_number, currency, total_cents, status, paid_at, order_items(ticket_name, quantity)",
            )
            .eq("registration_id", registrationId)
            .eq("event_id", event.id);

        query = sessionId
            ? query.eq(
                  "stripe_checkout_session_id",
                  sessionId,
              )
            : query.eq("id", freeOrder);

        const { data: order, error } =
            await query.maybeSingle();

        if (error) {
            throw new PaymentError(error.message);
        }

        if (!order) {
            throw new PaymentError(
                "The order could not be found.",
                404,
            );
        }

        const qrPassUrl =
            `/event/${encodeURIComponent(
                slug,
            )}/pass?registration=${encodeURIComponent(
                registrationId,
            )}`;

        let tableSelectionUrl: string | null = null;

        if (order.status === "paid") {
            // Self-heal fallback in case the browser reaches this success
            // check before the Stripe webhook has landed — idempotent, so
            // safe even if the webhook already activated the pass.
            await activateQrPassIfReady({
                admin,
                registrationId,
            });

            const [
                addonResult,
                tableCountResult,
                qrTicketResult,
            ] = await Promise.all([
                admin
                    .from("event_addons")
                    .select("enabled")
                    .eq("event_id", event.id)
                    .eq(
                        "addon_key",
                        "guest_table_selection",
                    )
                    .maybeSingle(),

                admin
                    .from("event_tables")
                    .select("id", {
                        count: "exact",
                        head: true,
                    })
                    .eq("event_id", event.id)
                    .eq("guest_selectable", true),

                // Not filtered by is_active: activation can itself depend
                // on table selection being completed first, so gating this
                // link on an already-active ticket would be circular.
                admin
                    .from("qr_tickets")
                    .select("qr_token")
                    .eq(
                        "registration_id",
                        registrationId,
                    )
                    .eq("event_id", event.id)
                    .maybeSingle(),
            ]);

            if (
                addonResult.data?.enabled &&
                (tableCountResult.count || 0) > 0 &&
                qrTicketResult.data?.qr_token
            ) {
                tableSelectionUrl =
                    `/event/${encodeURIComponent(
                        slug,
                    )}/registration/${encodeURIComponent(
                        qrTicketResult.data.qr_token,
                    )}/tables`;
            }
        }

        return NextResponse.json(
            {
                success: true,
                order,
                qrPassUrl,
                tableSelectionUrl,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate, max-age=0",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to check the order.",
            },
            {
                status:
                    error instanceof PaymentError
                        ? error.status
                        : 500,
            },
        );
    }
}

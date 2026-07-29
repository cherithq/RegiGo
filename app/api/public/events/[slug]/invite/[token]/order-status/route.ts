import { NextResponse } from "next/server";
import {
    PaymentError,
    getPublicTicketContext,
    reconcileOrderWithStripe,
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
            token: string;
        }>;
    },
) {
    try {
        const { slug, token } = await params;
        const context = await getPublicTicketContext({
            slug,
            token,
        });

        const url = new URL(request.url);
        const sessionId =
            url.searchParams.get("session_id");
        const freeOrder =
            url.searchParams.get("free_order");

        if (!sessionId && !freeOrder) {
            throw new PaymentError(
                "The order reference is missing.",
            );
        }

        let query = context.admin
            .from("orders")
            .select(
                "id, order_number, currency, total_cents, status, paid_at, stripe_checkout_session_id, stripe_account_id, order_items(ticket_name, quantity)",
            )
            .eq(
                "registration_id",
                context.registration.id,
            )
            .eq("event_id", context.event.id);

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

        if (order.status !== "paid") {
            // The Stripe webhook may be delayed, misconfigured, or never
            // arrive at all — ask Stripe directly so the guest isn't stuck
            // on "payment processing" forever.
            const reconciled =
                await reconcileOrderWithStripe({
                    admin: context.admin,
                    order,
                });

            if (reconciled) {
                order.status = "paid";
            }
        }

        const qrPassUrl =
            `/event/${encodeURIComponent(
                slug,
            )}/pass?registration=${encodeURIComponent(
                context.registration.id,
            )}`;

        let tableSelectionUrl: string | null = null;

        if (order.status === "paid") {
            // Self-heal fallback in case the browser reaches this success
            // check before the Stripe webhook has landed — idempotent, so
            // safe even if the webhook already activated the pass.
            await activateQrPassIfReady({
                admin: context.admin,
                registrationId: context.registration.id,
            });

            const [addonResult, tableCountResult] =
                await Promise.all([
                    context.admin
                        .from("event_addons")
                        .select("enabled")
                        .eq("event_id", context.event.id)
                        .eq(
                            "addon_key",
                            "guest_table_selection",
                        )
                        .maybeSingle(),

                    context.admin
                        .from("event_tables")
                        .select("id", {
                            count: "exact",
                            head: true,
                        })
                        .eq("event_id", context.event.id)
                        .eq("guest_selectable", true),
                ]);

            if (
                addonResult.data?.enabled &&
                (tableCountResult.count || 0) > 0
            ) {
                tableSelectionUrl =
                    `/event/${encodeURIComponent(
                        slug,
                    )}/invite/${encodeURIComponent(
                        token,
                    )}/tables`;
            }
        }

        return NextResponse.json(
            {
                success: true,
                order: {
                    id: order.id,
                    order_number:
                        order.order_number,
                    currency:
                        order.currency,
                    total_cents:
                        order.total_cents,
                    status: order.status,
                    paid_at: order.paid_at,
                    order_items:
                        order.order_items,
                },
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

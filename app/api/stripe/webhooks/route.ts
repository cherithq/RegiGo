import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
    getPaymentAdmin,
    getStripe,
} from "@/lib/stripe-payments";
import {
    syncStripeAccountFromWebhook,
} from "@/lib/company-stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function paymentIntentId(
    value:
        | string
        | Stripe.PaymentIntent
        | null,
) {
    if (!value) return null;

    return typeof value === "string"
        ? value
        : value.id;
}

function webhookSecrets() {
    return Array.from(
        new Set(
            [
                process.env
                    .STRIPE_CONNECT_WEBHOOK_SECRET,
                process.env
                    .STRIPE_WEBHOOK_SECRET,
            ].filter(
                (value): value is string =>
                    Boolean(value),
            ),
        ),
    );
}

function constructStripeEvent({
    rawBody,
    signature,
}: {
    rawBody: string;
    signature: string;
}) {
    const stripe = getStripe();
    const secrets = webhookSecrets();
    let lastError: unknown = null;

    if (secrets.length === 0) {
        throw new Error(
            "No Stripe webhook signing secret is configured.",
        );
    }

    for (const secret of secrets) {
        try {
            return stripe.webhooks.constructEvent(
                rawBody,
                signature,
                secret,
            );
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(
              "Invalid Stripe webhook signature.",
          );
}

async function assertOrderStripeAccount({
    orderId,
    stripeAccountId,
}: {
    orderId: string;
    stripeAccountId: string | null;
}) {
    const admin = getPaymentAdmin();

    const { data: order, error } = await admin
        .from("orders")
        .select(
            "id, order_number, stripe_account_id",
        )
        .eq("id", orderId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!order) {
        throw new Error(
            "The RegiGo order could not be found.",
        );
    }

    const expected =
        order.stripe_account_id || null;

    if (expected !== stripeAccountId) {
        throw new Error(
            `Stripe account mismatch for order ${order.order_number}.`,
        );
    }
}

export async function POST(request: Request) {
    const signature =
        request.headers.get(
            "stripe-signature",
        );

    if (!signature) {
        return NextResponse.json(
            {
                error:
                    "Missing Stripe-Signature header.",
            },
            { status: 400 },
        );
    }

    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
        event = constructStripeEvent({
            rawBody,
            signature,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Invalid webhook signature.",
            },
            { status: 400 },
        );
    }

    const stripeAccountId =
        typeof event.account === "string"
            ? event.account
            : null;

    const admin = getPaymentAdmin();

    const { error: insertError } =
        await admin
            .from(
                "stripe_webhook_events",
            )
            .insert({
                stripe_event_id: event.id,
                event_type: event.type,
                stripe_account_id:
                    stripeAccountId,
                processing_status:
                    "processing",
            });

    if (insertError?.code === "23505") {
        return NextResponse.json({
            received: true,
            duplicate: true,
        });
    }

    if (insertError) {
        return NextResponse.json(
            { error: insertError.message },
            { status: 500 },
        );
    }

    try {
        let state:
            | "processed"
            | "ignored" =
            "ignored";

        if (
            event.type ===
            "account.updated"
        ) {
            const account =
                event.data
                    .object as Stripe.Account;

            await syncStripeAccountFromWebhook(
                account,
            );
            state =
                "processed";
        }

        if (
            event.type ===
                "checkout.session.completed" ||
            event.type ===
                "checkout.session.async_payment_succeeded"
        ) {
            const session =
                event.data
                    .object as Stripe.Checkout.Session;

            const orderId =
                session.metadata
                    ?.regigo_order_id ||
                session.client_reference_id;

            if (
                orderId &&
                session.payment_status ===
                    "paid"
            ) {
                await assertOrderStripeAccount({
                    orderId,
                    stripeAccountId,
                });

                const { error } =
                    await admin.rpc(
                        "regigo_mark_ticket_order_paid_v2",
                        {
                            p_order_id:
                                orderId,
                            p_checkout_session_id:
                                session.id,
                            p_payment_intent_id:
                                paymentIntentId(
                                    session.payment_intent,
                                ),
                            p_stripe_event_id:
                                event.id,
                            p_stripe_account_id:
                                stripeAccountId,
                        },
                    );

                if (error) {
                    throw new Error(
                        error.message,
                    );
                }

                state = "processed";
            }
        }

        if (
            event.type ===
                "checkout.session.expired" ||
            event.type ===
                "checkout.session.async_payment_failed"
        ) {
            const session =
                event.data
                    .object as Stripe.Checkout.Session;

            const orderId =
                session.metadata
                    ?.regigo_order_id ||
                session.client_reference_id;

            if (orderId) {
                await assertOrderStripeAccount({
                    orderId,
                    stripeAccountId,
                });

                const { error } =
                    await admin.rpc(
                        "regigo_cancel_ticket_order_v1",
                        {
                            p_order_id:
                                orderId,
                            p_status:
                                event.type ===
                                "checkout.session.expired"
                                    ? "expired"
                                    : "failed",
                        },
                    );

                if (error) {
                    throw new Error(
                        error.message,
                    );
                }

                state = "processed";
            }
        }

        await admin
            .from(
                "stripe_webhook_events",
            )
            .update({
                processing_status: state,
                processed_at:
                    new Date().toISOString(),
            })
            .eq(
                "stripe_event_id",
                event.id,
            );

        return NextResponse.json({
            received: true,
            stripeAccountId,
        });
    } catch (error) {
        await admin
            .from(
                "stripe_webhook_events",
            )
            .update({
                processing_status:
                    "failed",
                error_message:
                    error instanceof Error
                        ? error.message
                        : "Webhook failed.",
                processed_at:
                    new Date().toISOString(),
            })
            .eq(
                "stripe_event_id",
                event.id,
            );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Webhook failed.",
            },
            { status: 500 },
        );
    }
}

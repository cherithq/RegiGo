import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
    PaymentError,
    checkoutUrls,
    getPaymentAdmin,
    getPublicTicketContext,
    getStripe,
} from "@/lib/stripe-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(
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

function directChargeApplicationFee({
    requestedFee,
    total,
}: {
    requestedFee: number;
    total: number;
}) {
    if (
        !Number.isInteger(requestedFee) ||
        requestedFee <= 0 ||
        total <= 1
    ) {
        return 0;
    }

    return Math.min(
        requestedFee,
        total - 1,
    );
}

export async function POST(
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
    let orderId: string | null = null;

    try {
        const { slug, token } = await params;
        const body = (await request.json()) as {
            ticketTypeId?: unknown;
            quantity?: unknown;
        };

        const ticketTypeId =
            typeof body.ticketTypeId ===
            "string"
                ? body.ticketTypeId.trim()
                : "";

        const quantity = Number(
            body.quantity || 1,
        );

        if (
            !ticketTypeId ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            throw new PaymentError(
                "Choose a valid ticket and quantity.",
            );
        }

        const context =
            await getPublicTicketContext({
                slug,
                token,
            });

        const ticket = context.tickets.find(
            (item) =>
                item.id === ticketTypeId,
        );

        if (!ticket) {
            throw new PaymentError(
                "The selected ticket is no longer available.",
                409,
            );
        }

        const expiresAt = new Date(
            Date.now() + 30 * 60 * 1000,
        );

        const {
            data: rows,
            error: orderError,
        } = await context.admin.rpc(
            "regigo_create_ticket_order_v1",
            {
                p_event_id:
                    context.event.id,
                p_registration_id:
                    context.registration.id,
                p_ticket_type_id:
                    ticketTypeId,
                p_quantity: quantity,
                p_expires_at:
                    expiresAt.toISOString(),
            },
        );

        if (orderError) {
            throw new PaymentError(
                orderError.message,
                409,
            );
        }

        const order = Array.isArray(rows)
            ? rows[0]
            : rows;

        if (!order?.order_id) {
            throw new PaymentError(
                "The ticket order could not be created.",
                500,
            );
        }

        orderId = String(order.order_id);

        const urls = checkoutUrls({
            slug,
            token,
        });

        if (Number(order.total_cents) === 0) {
            const { error: paidError } =
                await context.admin.rpc(
                    "regigo_mark_ticket_order_paid_v2",
                    {
                        p_order_id: orderId,
                        p_checkout_session_id:
                            null,
                        p_payment_intent_id:
                            null,
                        p_stripe_event_id:
                            `free_${orderId}`,
                        p_stripe_account_id:
                            null,
                    },
                );

            if (paidError) {
                throw new PaymentError(
                    paidError.message,
                );
            }

            return json({
                success: true,
                free: true,
                url:
                    `${urls.success.split("?")[0]}` +
                    `?free_order=${encodeURIComponent(orderId)}`,
            });
        }

        const connectedAccountId =
            context.company
                .stripe_connected_account_id ||
            null;

        if (
            !context.usesPlatformStripeAccount &&
            !connectedAccountId
        ) {
            throw new PaymentError(
                "The event company has not connected its Stripe account.",
                503,
            );
        }

        if (
            !context.usesPlatformStripeAccount &&
            !context.company
                .stripe_charges_enabled
        ) {
            throw new PaymentError(
                "The event company's Stripe account is not ready to accept payments.",
                503,
            );
        }

        const stripe = getStripe();

        const metadata: Record<
            string,
            string
        > = {
            regigo_order_id: orderId,
            regigo_event_id:
                String(context.event.id),
            regigo_company_id:
                String(context.company.id),
            regigo_registration_id:
                String(
                    context.registration.id,
                ),
            regigo_ticket_type_id:
                String(ticketTypeId),
            regigo_payment_recipient:
                context.usesPlatformStripeAccount
                    ? "platform_company"
                    : String(
                          connectedAccountId,
                      ),
        };

        const paymentIntentData:
            Stripe.Checkout.SessionCreateParams.PaymentIntentData =
            {
                metadata,
            };

        if (
            !context.usesPlatformStripeAccount
        ) {
            const applicationFee =
                directChargeApplicationFee({
                    requestedFee: Number(
                        order.platform_fee_cents ||
                            0,
                    ),
                    total: Number(
                        order.total_cents,
                    ),
                });

            if (applicationFee > 0) {
                paymentIntentData.application_fee_amount =
                    applicationFee;
            }
        }

        const sessionParams:
            Stripe.Checkout.SessionCreateParams =
            {
                mode: "payment",
                client_reference_id:
                    orderId,
                customer_email:
                    context.registration.email ||
                    undefined,
                line_items: [
                    {
                        quantity,
                        price_data: {
                            currency: String(
                                order.currency,
                            ).toLowerCase(),
                            unit_amount: Number(
                                order.unit_price_cents,
                            ),
                            product_data: {
                                name: String(
                                    order.ticket_name,
                                ),
                                description:
                                    ticket.description ||
                                    undefined,
                            },
                        },
                    },
                ],
                metadata,
                payment_intent_data:
                    paymentIntentData,
                success_url: urls.success,
                cancel_url: urls.cancel,
                expires_at: Math.floor(
                    expiresAt.getTime() /
                        1000,
                ),
            };

        const requestOptions:
            Stripe.RequestOptions =
            {
                idempotencyKey:
                    `regigo-ticket-order-${orderId}`,
                ...(context.usesPlatformStripeAccount
                    ? {}
                    : {
                          stripeAccount:
                              connectedAccountId!,
                      }),
            };

        const session =
            await stripe.checkout.sessions.create(
                sessionParams,
                requestOptions,
            );

        if (!session.url) {
            throw new PaymentError(
                "Stripe did not return a Checkout URL.",
                500,
            );
        }

        const { error: attachError } =
            await context.admin.rpc(
                "regigo_attach_checkout_session_v2",
                {
                    p_order_id: orderId,
                    p_checkout_session_id:
                        session.id,
                    p_stripe_account_id:
                        context.usesPlatformStripeAccount
                            ? null
                            : connectedAccountId,
                },
            );

        if (attachError) {
            throw new PaymentError(
                attachError.message,
            );
        }

        return json({
            success: true,
            url: session.url,
            sessionId: session.id,
            recipientCompanyId:
                context.company.id,
            recipientStripeAccount:
                context.usesPlatformStripeAccount
                    ? "platform"
                    : connectedAccountId,
        });
    } catch (error) {
        if (orderId) {
            try {
                await getPaymentAdmin().rpc(
                    "regigo_cancel_ticket_order_v1",
                    {
                        p_order_id: orderId,
                        p_status: "cancelled",
                    },
                );
            } catch {
                // Preserve the checkout error.
            }
        }

        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to start payment.",
            },
            error instanceof PaymentError
                ? error.status
                : 500,
        );
    }
}

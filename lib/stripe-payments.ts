import "server-only";

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    EventAddonError,
    getEventAddonConfiguration,
} from "@/lib/event-addons";
import {
    getPublicInvitation,
    getSiteUrl,
} from "@/lib/guest-invitations";
import { activateQrPassIfReady } from "@/lib/qr-pass-activation";

export class PaymentError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "PaymentError";
        this.status = status;
    }
}

export function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
        throw new PaymentError(
            "STRIPE_SECRET_KEY is missing from the server environment.",
            500,
        );
    }

    return new Stripe(
        key,
        {
            maxNetworkRetries: 2,
            timeout: 20_000,
        },
    );
}

export function getPaymentAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new PaymentError(
            "Supabase service-role configuration is missing.",
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

export function getPlatformCompanyId() {
    return (
        process.env.REGIGO_PLATFORM_COMPANY_ID ||
        "00000000-0000-0000-0000-000000000001"
    );
}

export function isPlatformCompany(companyId: string) {
    return companyId === getPlatformCompanyId();
}

export async function requirePaymentManager(
    eventId: string,
) {
    try {
        const configuration =
            await getEventAddonConfiguration(eventId);

        const addon = configuration.addons.find(
            (item) =>
                item.key === "stripe_payments",
        );

        if (
            !addon ||
            !addon.allowed ||
            !addon.enabled
        ) {
            throw new PaymentError(
                "Stripe Ticket Payments is not enabled for this event.",
                403,
            );
        }

        if (!configuration.actor.canManage) {
            throw new PaymentError(
                "You do not have permission to manage ticket payments.",
                403,
            );
        }

        return configuration;
    } catch (error) {
        if (error instanceof PaymentError) {
            throw error;
        }

        if (error instanceof EventAddonError) {
            throw new PaymentError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

export async function requireCompanyPaymentAdmin(
    requestedCompanyId?: string | null,
) {
    const supabaseServer =
        await createSupabaseServerClient();
    const db = supabaseServer;

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        throw new PaymentError(
            "You must be logged in.",
            401,
        );
    }

    const { data: profile, error } = await db
        .from("profiles")
        .select(
            "id, email, full_name, role, company_id, platform_role",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        throw new PaymentError(error.message);
    }

    const isPlatformAdmin =
        profile?.platform_role === "super_admin";

    if (
        !profile ||
        (
            !isPlatformAdmin &&
            profile.role !== "admin"
        ) ||
        !profile.company_id
    ) {
        throw new PaymentError(
            "Only a company administrator can configure Stripe.",
            403,
        );
    }

    const companyId =
        requestedCompanyId?.trim() ||
        profile.company_id;

    if (
        !isPlatformAdmin &&
        companyId !== profile.company_id
    ) {
        throw new PaymentError(
            "You cannot configure payments for another event company.",
            403,
        );
    }

    const admin = getPaymentAdmin();

    const { data: company, error: companyError } =
        await admin
            .from("companies")
            .select(
                "id, company_name, billing_email, stripe_connected_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted",
            )
            .eq("id", companyId)
            .maybeSingle();

    if (companyError) {
        throw new PaymentError(
            companyError.message,
        );
    }

    if (!company) {
        throw new PaymentError(
            "The event company could not be found.",
            404,
        );
    }

    return {
        user,
        profile,
        company,
        admin,
        isPlatformAdmin,
        usesPlatformStripeAccount:
            isPlatformCompany(company.id),
    };
}

export async function getPublicTicketContext({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    const { admin, invitation } =
        await getPublicInvitation({
            slug,
            token,
        });

    const event = Array.isArray(
        invitation.events,
    )
        ? invitation.events[0]
        : invitation.events;

    const registration = Array.isArray(
        invitation.registrations,
    )
        ? invitation.registrations[0]
        : invitation.registrations;

    if (!event || !registration) {
        throw new PaymentError(
            "The invitation could not be loaded.",
            404,
        );
    }

    if (!event.company_id) {
        throw new PaymentError(
            "The event is not connected to an event company.",
            500,
        );
    }

    if (invitation.status !== "accepted") {
        throw new PaymentError(
            "Accept the invitation before selecting a ticket.",
            403,
        );
    }

    const { data: addon } = await admin
        .from("event_addons")
        .select("enabled")
        .eq("event_id", event.id)
        .eq("addon_key", "stripe_payments")
        .maybeSingle();

    if (!addon?.enabled) {
        throw new PaymentError(
            "Ticket payments are not enabled for this event.",
            403,
        );
    }

    const { data: company, error } = await admin
        .from("companies")
        .select(
            "id, company_name, stripe_connected_account_id, stripe_charges_enabled, stripe_payouts_enabled",
        )
        .eq("id", event.company_id)
        .maybeSingle();

    if (error) {
        throw new PaymentError(error.message);
    }

    if (!company) {
        throw new PaymentError(
            "The event company could not be found.",
            404,
        );
    }

    const { data: tickets, error: ticketError } =
        await admin
            .from("ticket_types")
            .select(
                "id, event_id, ticket_name, description, price_cents, currency, quantity_available, quantity_reserved, quantity_sold, min_per_order, max_per_order, sales_start, sales_end, is_active, is_complimentary",
            )
            .eq("event_id", event.id)
            .eq("is_active", true)
            .order("price_cents", {
                ascending: true,
            });

    if (ticketError) {
        throw new PaymentError(
            ticketError.message,
        );
    }

    const now = Date.now();

    const availableTickets = (
        tickets || []
    ).filter((ticket) => {
        const salesStarted =
            !ticket.sales_start ||
            new Date(ticket.sales_start).getTime() <=
                now;

        const salesOpen =
            !ticket.sales_end ||
            new Date(ticket.sales_end).getTime() >
                now;

        const remaining =
            ticket.quantity_available == null
                ? null
                : ticket.quantity_available -
                  ticket.quantity_reserved -
                  ticket.quantity_sold;

        return (
            salesStarted &&
            salesOpen &&
            (
                remaining == null ||
                remaining > 0
            )
        );
    });

    return {
        admin,
        invitation,
        event,
        registration,
        company,
        usesPlatformStripeAccount:
            isPlatformCompany(company.id),
        tickets: availableTickets,
    };
}

export function checkoutUrls({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    const base = getSiteUrl();
    const route =
        `/event/${encodeURIComponent(
            slug,
        )}/invite/${encodeURIComponent(
            token,
        )}`;

    return {
        success:
            `${base}${route}/payment/success` +
            "?session_id={CHECKOUT_SESSION_ID}",
        cancel:
            `${base}${route}/tickets?cancelled=1`,
    };
}

export function registrationCheckoutUrls({
    slug,
    registrationId,
}: {
    slug: string;
    registrationId: string;
}) {
    const base = getSiteUrl();
    const route =
        `/event/${encodeURIComponent(
            slug,
        )}/register`;
    const registrationParam =
        `registration=${encodeURIComponent(
            registrationId,
        )}`;

    return {
        success:
            `${base}${route}/payment/success` +
            `?session_id={CHECKOUT_SESSION_ID}&${registrationParam}`,
        cancel:
            `${base}${route}/payment/cancelled` +
            `?${registrationParam}`,
    };
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

export type TicketCheckoutTicket = {
    description?: string | null;
    [key: string]: unknown;
};

export type TicketCheckoutCompany = {
    id: string;
    stripe_connected_account_id?: string | null;
    stripe_charges_enabled?: boolean | null;
};

export async function createTicketCheckoutSession({
    admin,
    eventId,
    company,
    usesPlatformStripeAccount,
    registrationId,
    recipientEmail,
    ticketTypeId,
    quantity,
    ticket,
    successUrl,
    cancelUrl,
    buildFreeSuccessUrl,
}: {
    admin: SupabaseClient;
    eventId: string;
    company: TicketCheckoutCompany;
    usesPlatformStripeAccount: boolean;
    registrationId: string;
    recipientEmail: string | null;
    ticketTypeId: string;
    quantity: number;
    ticket: TicketCheckoutTicket;
    successUrl: string;
    cancelUrl: string;
    buildFreeSuccessUrl: (orderId: string) => string;
}): Promise<{
    url: string;
    orderId: string;
    free: boolean;
    sessionId?: string;
}> {
    let orderId: string | null = null;

    try {
        const expiresAt = new Date(
            Date.now() + 30 * 60 * 1000,
        );

        const {
            data: rows,
            error: orderError,
        } = await admin.rpc(
            "regigo_create_ticket_order_v1",
            {
                p_event_id: eventId,
                p_registration_id: registrationId,
                p_ticket_type_id: ticketTypeId,
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

        if (Number(order.total_cents) === 0) {
            const { error: paidError } =
                await admin.rpc(
                    "regigo_mark_ticket_order_paid_v2",
                    {
                        p_order_id: orderId,
                        p_checkout_session_id: null,
                        p_payment_intent_id: null,
                        p_stripe_event_id:
                            `free_${orderId}`,
                        p_stripe_account_id: null,
                    },
                );

            if (paidError) {
                throw new PaymentError(
                    paidError.message,
                );
            }

            await activateQrPassIfReady({
                admin,
                registrationId,
            });

            return {
                free: true,
                orderId,
                url: buildFreeSuccessUrl(orderId),
            };
        }

        const connectedAccountId =
            company.stripe_connected_account_id ||
            null;

        if (
            !usesPlatformStripeAccount &&
            !connectedAccountId
        ) {
            throw new PaymentError(
                "The event company has not connected its Stripe account.",
                503,
            );
        }

        if (
            !usesPlatformStripeAccount &&
            !company.stripe_charges_enabled
        ) {
            throw new PaymentError(
                "The event company's Stripe account is not ready to accept payments.",
                503,
            );
        }

        const stripe = getStripe();

        const metadata: Record<string, string> = {
            regigo_order_id: orderId,
            regigo_event_id: String(eventId),
            regigo_company_id: String(company.id),
            regigo_registration_id:
                String(registrationId),
            regigo_ticket_type_id:
                String(ticketTypeId),
            regigo_payment_recipient:
                usesPlatformStripeAccount
                    ? "platform_company"
                    : String(connectedAccountId),
        };

        const paymentIntentData:
            Stripe.Checkout.SessionCreateParams.PaymentIntentData =
            {
                metadata,
            };

        if (!usesPlatformStripeAccount) {
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
                client_reference_id: orderId,
                customer_email:
                    recipientEmail || undefined,
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
                success_url: successUrl,
                cancel_url: cancelUrl,
                expires_at: Math.floor(
                    expiresAt.getTime() / 1000,
                ),
            };

        const requestOptions: Stripe.RequestOptions =
            {
                idempotencyKey:
                    `regigo-ticket-order-${orderId}`,
                ...(usesPlatformStripeAccount
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
            await admin.rpc(
                "regigo_attach_checkout_session_v2",
                {
                    p_order_id: orderId,
                    p_checkout_session_id:
                        session.id,
                    p_stripe_account_id:
                        usesPlatformStripeAccount
                            ? null
                            : connectedAccountId,
                },
            );

        if (attachError) {
            throw new PaymentError(
                attachError.message,
            );
        }

        return {
            free: false,
            orderId,
            url: session.url,
            sessionId: session.id,
        };
    } catch (error) {
        if (orderId) {
            try {
                await admin.rpc(
                    "regigo_cancel_ticket_order_v1",
                    {
                        p_order_id: orderId,
                        p_status: "cancelled",
                    },
                );
            } catch {
                // Preserve the original checkout error.
            }
        }

        throw error;
    }
}

export async function refreshConnectedAccount({
    companyId,
    accountId,
}: {
    companyId: string;
    accountId: string;
}) {
    const stripe = getStripe();
    const admin = getPaymentAdmin();

    const account =
        await stripe.accounts.retrieve(
            accountId,
        );

    const { error } = await admin
        .from("companies")
        .update({
            stripe_charges_enabled:
                Boolean(
                    account.charges_enabled,
                ),
            stripe_payouts_enabled:
                Boolean(
                    account.payouts_enabled,
                ),
            stripe_details_submitted:
                Boolean(
                    account.details_submitted,
                ),
        })
        .eq("id", companyId);

    if (error) {
        throw new PaymentError(
            error.message,
        );
    }

    return account;
}

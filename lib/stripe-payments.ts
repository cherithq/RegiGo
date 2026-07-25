import "server-only";

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    EventAddonError,
    getEventAddonConfiguration,
} from "@/lib/event-addons";
import {
    getPublicInvitation,
    getSiteUrl,
} from "@/lib/guest-invitations";

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
    const db = supabaseServer as any;

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

import "server-only";

import {
    createClient,
} from "@supabase/supabase-js";
import {
    PaymentError,
    isPlatformCompany,
} from "@/lib/stripe-payments";

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new PaymentError(
            "Supabase service-role configuration is missing.",
            500,
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

// Mirrors getPublicTicketContext (lib/stripe-payments.ts), which resolves
// the invite/RSVP guest via their invitation token. Public registration
// guests have no invitation row, so this resolves them the same way
// lib/registration-table-selection.ts does — via the qr_tickets row
// created at registration time, keyed by its qr_token.
export async function getPublicRegistrationTicketContext({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    const admin =
        adminClient();

    const {
        data: event,
        error: eventError,
    } = await admin
        .from("events")
        .select(
            "id, event_name, event_slug, event_date, event_time, venue, company_id",
        )
        .eq(
            "event_slug",
            slug,
        )
        .maybeSingle();

    if (
        eventError ||
        !event
    ) {
        throw new PaymentError(
            eventError?.message ||
                "The event could not be found.",
            eventError ? 400 : 404,
        );
    }

    const {
        data: ticket,
        error: ticketError,
    } = await admin
        .from("qr_tickets")
        .select(
            "id, event_id, registration_id, qr_token, is_active",
        )
        .eq(
            "event_id",
            event.id,
        )
        .eq(
            "qr_token",
            token,
        )
        .maybeSingle();

    if (
        ticketError ||
        !ticket
    ) {
        throw new PaymentError(
            ticketError?.message ||
                "This registration ticket link is invalid or expired.",
            ticketError ? 400 : 404,
        );
    }

    const {
        data: registration,
        error: registrationError,
    } = await admin
        .from("registrations")
        .select(
            "id, event_id, full_name, email, registration_status, payment_status, selected_ticket_quantity",
        )
        .eq(
            "id",
            ticket.registration_id,
        )
        .eq(
            "event_id",
            event.id,
        )
        .maybeSingle();

    if (
        registrationError ||
        !registration
    ) {
        throw new PaymentError(
            registrationError
                ?.message ||
                "The guest registration could not be found.",
            registrationError
                ? 400
                : 404,
        );
    }

    if (
        ![
            "confirmed",
            "registered",
            "approved",
        ].includes(
            String(
                registration.registration_status ||
                    "",
            ).toLowerCase(),
        )
    ) {
        throw new PaymentError(
            "Complete registration before selecting a ticket.",
            403,
        );
    }

    if (!event.company_id) {
        throw new PaymentError(
            "The event is not connected to an event company.",
            500,
        );
    }

    const {
        data: addon,
    } = await admin
        .from("event_addons")
        .select("enabled")
        .eq(
            "event_id",
            event.id,
        )
        .eq(
            "addon_key",
            "stripe_payments",
        )
        .maybeSingle();

    if (!addon?.enabled) {
        throw new PaymentError(
            "Ticket payments are not enabled for this event.",
            403,
        );
    }

    const {
        data: ticketSettings,
    } = await admin
        // select("*") instead of an explicit column list so this keeps
        // working even before the page_title/page_subtitle/banner_color_*
        // appearance columns have been added to the database.
        .from("event_ticket_settings")
        .select("*")
        .eq(
            "event_id",
            event.id,
        )
        .maybeSingle();

    if (
        ticketSettings?.allow_registration_sales ===
        false
    ) {
        throw new PaymentError(
            "Ticket sales are not enabled after public registration.",
            403,
        );
    }

    const {
        data: company,
        error: companyError,
    } = await admin
        .from("companies")
        .select(
            "id, company_name, stripe_connected_account_id, stripe_charges_enabled, stripe_payouts_enabled",
        )
        .eq(
            "id",
            event.company_id,
        )
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

    const {
        data: tickets,
        error: ticketTypesError,
    } = await admin
        .from("ticket_types")
        .select(
            "id, event_id, ticket_name, description, price_cents, currency, quantity_available, quantity_reserved, quantity_sold, min_per_order, max_per_order, sales_start, sales_end, is_active, is_complimentary",
        )
        .eq(
            "event_id",
            event.id,
        )
        .eq(
            "is_active",
            true,
        )
        .order(
            "price_cents",
            {
                ascending:
                    true,
            },
        );

    if (ticketTypesError) {
        throw new PaymentError(
            ticketTypesError.message,
        );
    }

    const {
        count: totalTicketCount,
    } = await admin
        .from("ticket_types")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq(
            "event_id",
            event.id,
        );

    const now = Date.now();

    const excludedTickets: {
        ticket_name: string;
        reason: string;
    }[] = [];

    const availableTickets = (
        tickets || []
    ).filter((ticket) => {
        const salesStarted =
            !ticket.sales_start ||
            new Date(
                ticket.sales_start,
            ).getTime() <= now;

        const salesOpen =
            !ticket.sales_end ||
            new Date(
                ticket.sales_end,
            ).getTime() > now;

        const remaining =
            ticket.quantity_available ==
            null
                ? null
                : ticket.quantity_available -
                  ticket.quantity_reserved -
                  ticket.quantity_sold;

        const included =
            salesStarted &&
            salesOpen &&
            (
                remaining == null ||
                remaining > 0
            );

        if (!included) {
            const reason =
                !salesStarted
                    ? `Sales have not started yet (opens ${ticket.sales_start}).`
                    : !salesOpen
                      ? `Sales have closed (closed ${ticket.sales_end}).`
                      : "Sold out.";

            excludedTickets.push({
                ticket_name:
                    ticket.ticket_name,
                reason,
            });
        }

        return included;
    });

    const diagnostics = {
        totalTicketCount:
            totalTicketCount || 0,
        rawActiveTicketCount:
            (tickets || []).length,
        excludedTickets,
    };

    return {
        admin,
        event,
        registration,
        company,
        usesPlatformStripeAccount:
            isPlatformCompany(
                company.id,
            ),
        tickets: availableTickets,
        diagnostics,
        partySize: Math.max(
            Number(
                registration.selected_ticket_quantity ||
                    1,
            ),
            1,
        ),
        ticketSettings:
            ticketSettings || null,
    };
}

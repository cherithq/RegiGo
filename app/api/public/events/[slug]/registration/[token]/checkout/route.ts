import { NextResponse } from "next/server";
import {
    PaymentError,
    createTicketCheckoutSession,
    registrationCheckoutUrls,
} from "@/lib/stripe-payments";
import { getPublicRegistrationTicketContext } from "@/lib/registration-payments";
import { getSiteUrl } from "@/lib/guest-invitations";

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
            await getPublicRegistrationTicketContext({
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

        const urls = registrationCheckoutUrls({
            slug,
            registrationId:
                context.registration.id,
        });

        // Send a cancelled checkout back to this ticket-selection page
        // (mirroring the invite/RSVP flow's checkoutUrls cancel target)
        // instead of the generic registrationId-based "payment cancelled"
        // message page, so the guest can simply retry ticket selection
        // rather than needing to register all over again.
        const cancelUrl =
            `${getSiteUrl()}/event/${encodeURIComponent(
                slug,
            )}/registration/${encodeURIComponent(
                token,
            )}/tickets?cancelled=1`;

        const result =
            await createTicketCheckoutSession({
                admin: context.admin,
                eventId: context.event.id,
                company: context.company,
                usesPlatformStripeAccount:
                    context.usesPlatformStripeAccount,
                registrationId:
                    context.registration.id,
                recipientEmail:
                    context.registration.email ||
                    null,
                ticketTypeId,
                quantity,
                ticket,
                successUrl: urls.success,
                cancelUrl,
                buildFreeSuccessUrl: (orderId) =>
                    `${urls.success.split("?")[0]}` +
                    `?free_order=${encodeURIComponent(orderId)}` +
                    `&registration=${encodeURIComponent(context.registration.id)}`,
            });

        if (result.free) {
            return json({
                success: true,
                free: true,
                url: result.url,
            });
        }

        return json({
            success: true,
            url: result.url,
            sessionId: result.sessionId,
            recipientCompanyId: context.company.id,
            recipientStripeAccount:
                context.usesPlatformStripeAccount
                    ? "platform"
                    : context.company
                          .stripe_connected_account_id,
        });
    } catch (error) {
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

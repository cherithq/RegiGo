import { NextResponse } from "next/server";
import {
    PaymentAccessError as PaymentError,
    requirePaymentManager,
} from "@/lib/payment-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function handle(error: unknown) {
    return json(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage ticket tiers.",
        },
        error instanceof PaymentError
            ? error.status
            : 500,
    );
}

function text(value: unknown) {
    return typeof value === "string"
        ? value.trim()
        : "";
}

function colour(
    value: unknown,
) {
    const clean =
        text(
            value,
        ).toUpperCase();

    return /^#[0-9A-F]{6}$/.test(
        clean,
    )
        ? clean
        : "#4F46E5";
}

function integer(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed)
        ? parsed
        : fallback;
}

function nullableInteger(value: unknown) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const parsed = Number(value);

    if (
        !Number.isInteger(parsed) ||
        parsed < 0
    ) {
        throw new PaymentError(
            "Ticket quantity must be a whole number.",
        );
    }

    return parsed;
}

function date(value: unknown) {
    const clean = text(value);

    if (!clean) return null;

    const parsed = new Date(clean);

    if (Number.isNaN(parsed.getTime())) {
        throw new PaymentError(
            "Enter a valid sales date.",
        );
    }

    return parsed.toISOString();
}

function payload(body: Record<string, unknown>) {
    const ticketName = text(
        body.ticketName,
    );

    if (!ticketName) {
        throw new PaymentError(
            "Enter a ticket name.",
        );
    }

    const priceCents = integer(
        body.priceCents,
        -1,
    );

    if (priceCents < 0) {
        throw new PaymentError(
            "Ticket price cannot be negative.",
        );
    }

    const minimum = Math.max(
        1,
        integer(body.minPerOrder, 1),
    );
    const maximum = Math.max(
        minimum,
        integer(body.maxPerOrder, 1),
    );

    return {
        ticket_name: ticketName,
        description:
            text(body.description) || null,
        colour:
            colour(
                body.colour,
            ),
        price_cents: priceCents,
        currency:
            text(body.currency)
                .toUpperCase() || "SGD",
        quantity_available:
            nullableInteger(
                body.quantityAvailable,
            ),
        min_per_order: minimum,
        max_per_order: maximum,
        sales_start: date(
            body.salesStart,
        ),
        sales_end: date(body.salesEnd),
        is_active:
            body.isActive !== false,
        is_complimentary:
            priceCents === 0,
    };
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } = await params;
        const configuration =
            await requirePaymentManager(
                eventId,
            );
        const admin =
            configuration.actor.admin;

        const [
            ticketsResult,
            ordersResult,
            companyResult,
        ] = await Promise.all([
            admin
                .from("ticket_types")
                .select(
                    "id, ticket_name, description, colour, price_cents, currency, quantity_available, quantity_reserved, quantity_sold, min_per_order, max_per_order, sales_start, sales_end, is_active",
                )
                .eq("event_id", eventId)
                .order("price_cents", {
                    ascending: true,
                }),
            admin
                .from("orders")
                .select(
                    "id, order_number, currency, total_cents, status, paid_at, created_at, registrations(full_name, email), order_items(ticket_name, quantity)",
                )
                .eq("event_id", eventId)
                .order("created_at", {
                    ascending: false,
                })
                .limit(50),
            admin
                .from("companies")
                .select(
                    "id, company_name, stripe_connected_account_id, stripe_charges_enabled, stripe_payouts_enabled",
                )
                .eq(
                    "id",
                    configuration.event
                        .company_id,
                )
                .maybeSingle(),
        ]);

        if (ticketsResult.error) {
            throw new PaymentError(
                ticketsResult.error.message,
            );
        }

        if (ordersResult.error) {
            throw new PaymentError(
                ordersResult.error.message,
            );
        }

        if (companyResult.error) {
            throw new PaymentError(
                companyResult.error.message,
            );
        }

        const platformCompanyId =
            process.env
                .REGIGO_PLATFORM_COMPANY_ID ||
            "00000000-0000-0000-0000-000000000001";

        const recipientCompany =
            companyResult.data;

        const usesPlatformStripeAccount =
            recipientCompany?.id ===
            platformCompanyId;

        return json({
            success: true,
            isPlatformAdmin:
                configuration.actor
                    .isPlatformAdmin,
            company: recipientCompany,
            paymentRecipient: {
                companyId:
                    recipientCompany?.id ||
                    null,
                companyName:
                    recipientCompany
                        ?.company_name ||
                    "Event company",
                usesPlatformStripeAccount,
                connected:
                    usesPlatformStripeAccount ||
                    Boolean(
                        recipientCompany
                            ?.stripe_connected_account_id,
                    ),
                chargesEnabled:
                    usesPlatformStripeAccount ||
                    Boolean(
                        recipientCompany
                            ?.stripe_charges_enabled,
                    ),
                payoutsEnabled:
                    usesPlatformStripeAccount ||
                    Boolean(
                        recipientCompany
                            ?.stripe_payouts_enabled,
                    ),
            },
            tickets:
                ticketsResult.data || [],
            orders:
                ordersResult.data || [],
        });
    } catch (error) {
        return handle(error);
    }
}

export async function POST(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } = await params;
        const configuration =
            await requirePaymentManager(
                eventId,
            );
        const body = (await request.json()) as Record<
            string,
            unknown
        >;

        const { error } =
            await configuration.actor.admin
                .from("ticket_types")
                .insert({
                    event_id: eventId,
                    ...payload(body),
                });

        if (error) {
            throw new PaymentError(
                error.message,
            );
        }

        return json({
            success: true,
            message: "Ticket tier created.",
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
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } = await params;
        const configuration =
            await requirePaymentManager(
                eventId,
            );
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const ticketId = text(
            body.ticketId,
        );

        if (!ticketId) {
            throw new PaymentError(
                "The ticket tier is required.",
            );
        }

        const { error } =
            await configuration.actor.admin
                .from("ticket_types")
                .update(payload(body))
                .eq("id", ticketId)
                .eq("event_id", eventId);

        if (error) {
            throw new PaymentError(
                error.message,
            );
        }

        return json({
            success: true,
            message: "Ticket tier updated.",
        });
    } catch (error) {
        return handle(error);
    }
}

export async function DELETE(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } = await params;
        const configuration =
            await requirePaymentManager(
                eventId,
            );
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const ticketId = text(
            body.ticketId,
        );

        if (!ticketId) {
            throw new PaymentError(
                "The ticket tier is required.",
            );
        }

        const { count, error: countError } =
            await configuration.actor.admin
                .from("order_items")
                .select("id", {
                    count: "exact",
                    head: true,
                })
                .eq(
                    "ticket_type_id",
                    ticketId,
                );

        if (countError) {
            throw new PaymentError(
                countError.message,
            );
        }

        if ((count || 0) > 0) {
            const { error } =
                await configuration.actor.admin
                    .from("ticket_types")
                    .update({
                        is_active: false,
                    })
                    .eq("id", ticketId)
                    .eq(
                        "event_id",
                        eventId,
                    );

            if (error) {
                throw new PaymentError(
                    error.message,
                );
            }

            return json({
                success: true,
                message:
                    "Ticket has order history, so it was deactivated.",
            });
        }

        const { error } =
            await configuration.actor.admin
                .from("ticket_types")
                .delete()
                .eq("id", ticketId)
                .eq("event_id", eventId);

        if (error) {
            throw new PaymentError(
                error.message,
            );
        }

        return json({
            success: true,
            message: "Ticket tier deleted.",
        });
    } catch (error) {
        return handle(error);
    }
}

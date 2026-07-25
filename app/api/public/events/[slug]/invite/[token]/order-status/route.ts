import { NextResponse } from "next/server";
import {
    PaymentError,
    getPublicTicketContext,
} from "@/lib/stripe-payments";

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
                "id, order_number, currency, total_cents, status, paid_at, order_items(ticket_name, quantity)",
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

        let tableSelectionUrl: string | null = null;

        if (order.status === "paid") {
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
                order,
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

"use client";

import {
    AlertTriangle,
    Check,
    CreditCard,
    Loader2,
    Ticket,
} from "lucide-react";
import { useState } from "react";

type TicketRow = {
    id: string;
    ticket_name: string;
    description: string | null;
    price_cents: number;
    currency: string;
    quantity_available: number | null;
    quantity_reserved: number;
    quantity_sold: number;
    min_per_order: number;
    max_per_order: number;
};

async function readJson(response: Response) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
}

function money(
    cents: number,
    currency: string,
) {
    if (cents === 0) return "Free";

    return new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency,
    }).format(cents / 100);
}

export default function PublicTicketSelector({
    checkoutUrl,
    tickets,
    quantity,
}: {
    checkoutUrl: string;
    tickets: TicketRow[];
    quantity: number;
}) {
    const eligibleTickets = tickets.filter(
        (ticket) =>
            quantity >=
                ticket.min_per_order &&
            quantity <=
                ticket.max_per_order,
    );
    const [selectedId, setSelectedId] =
        useState(
            eligibleTickets[0]?.id ||
                "",
        );
    const [working, setWorking] =
        useState(false);
    const [message, setMessage] =
        useState("");

    const selected = tickets.find(
        (ticket) =>
            ticket.id === selectedId,
    );

    async function checkout() {
        if (!selected) return;

        setWorking(true);
        setMessage("");

        try {
            const response = await fetch(
                checkoutUrl,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        ticketTypeId:
                            selected.id,
                        quantity,
                    }),
                },
            );

            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to start checkout.",
                );
            }

            window.location.href =
                result.url;
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to start checkout.",
            );
            setWorking(false);
        }
    }

    if (tickets.length === 0) {
        return (
            <div className="mt-6 rounded-2xl bg-amber-50 p-5 font-bold text-amber-800">
                No ticket tiers are
                currently available.
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            <p className="text-sm font-bold text-slate-500">
                Ticket quantity is set
                to your party size of{" "}
                {quantity}.
            </p>

            {tickets.map((ticket) => {
                const active =
                    selectedId === ticket.id;
                const remaining =
                    ticket.quantity_available ==
                    null
                        ? null
                        : ticket.quantity_available -
                          ticket.quantity_reserved -
                          ticket.quantity_sold;
                const eligible =
                    quantity >=
                        ticket.min_per_order &&
                    quantity <=
                        ticket.max_per_order;
                const eligibilityNote =
                    !eligible
                        ? quantity <
                          ticket.min_per_order
                            ? `Requires at least ${ticket.min_per_order} per order.`
                            : `Limited to ${ticket.max_per_order} per order.`
                        : null;

                return (
                    <button
                        key={ticket.id}
                        type="button"
                        disabled={
                            !eligible
                        }
                        onClick={() =>
                            setSelectedId(
                                ticket.id,
                            )
                        }
                        className={`w-full rounded-3xl border p-5 text-left ${
                            !eligible
                                ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                                : active
                                  ? "border-[#4F46E5] bg-[#F7F5FF]"
                                  : "border-slate-200"
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <span
                                className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full ${
                                    active &&
                                    eligible
                                        ? "bg-[#4F46E5] text-white"
                                        : "border border-slate-300"
                                }`}
                            >
                                {active &&
                                    eligible && (
                                        <Check
                                            size={
                                                14
                                            }
                                        />
                                    )}
                            </span>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-xl font-black">
                                        {
                                            ticket.ticket_name
                                        }
                                    </h3>
                                    <p className="text-xl font-black text-[#4F46E5]">
                                        {money(
                                            ticket.price_cents,
                                            ticket.currency,
                                        )}
                                    </p>
                                </div>
                                {ticket.description && (
                                    <p className="mt-2 text-sm text-slate-500">
                                        {
                                            ticket.description
                                        }
                                    </p>
                                )}
                                <p className="mt-3 text-xs font-bold text-slate-400">
                                    {remaining ==
                                    null
                                        ? "Unlimited availability"
                                        : `${Math.max(remaining, 0)} remaining`}
                                </p>
                                {eligibilityNote && (
                                    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                                        <AlertTriangle
                                            size={
                                                13
                                            }
                                        />
                                        {
                                            eligibilityNote
                                        }
                                    </p>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}

            {message && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-700">
                    {message}
                </div>
            )}

            <button
                type="button"
                onClick={() =>
                    void checkout()
                }
                disabled={
                    working || !selected
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
                {working ? (
                    <Loader2
                        size={18}
                        className="animate-spin"
                    />
                ) : selected?.price_cents ===
                  0 ? (
                    <Ticket size={18} />
                ) : (
                    <CreditCard
                        size={18}
                    />
                )}
                {selected?.price_cents === 0
                    ? "Confirm Free Ticket"
                    : "Continue to Payment"}
            </button>
        </div>
    );
}

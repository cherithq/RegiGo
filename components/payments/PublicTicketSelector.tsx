"use client";

import {
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
    slug,
    token,
    tickets,
}: {
    slug: string;
    token: string;
    tickets: TicketRow[];
}) {
    const [selectedId, setSelectedId] =
        useState(tickets[0]?.id || "");
    const [quantity, setQuantity] =
        useState(
            tickets[0]?.min_per_order ||
                1,
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
                `/api/public/events/${encodeURIComponent(
                    slug,
                )}/invite/${encodeURIComponent(
                    token,
                )}/checkout`,
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

                return (
                    <button
                        key={ticket.id}
                        type="button"
                        onClick={() => {
                            setSelectedId(
                                ticket.id,
                            );
                            setQuantity(
                                ticket.min_per_order,
                            );
                        }}
                        className={`w-full rounded-3xl border p-5 text-left ${
                            active
                                ? "border-[#4F46E5] bg-[#F7F5FF]"
                                : "border-slate-200"
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <span
                                className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full ${
                                    active
                                        ? "bg-[#4F46E5] text-white"
                                        : "border border-slate-300"
                                }`}
                            >
                                {active && (
                                    <Check
                                        size={14}
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
                            </div>
                        </div>
                    </button>
                );
            })}

            {selected &&
                selected.max_per_order > 1 && (
                    <select
                        value={quantity}
                        onChange={(event) =>
                            setQuantity(
                                Number(
                                    event.target
                                        .value,
                                ),
                            )
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold"
                    >
                        {Array.from(
                            {
                                length:
                                    selected.max_per_order -
                                    selected.min_per_order +
                                    1,
                            },
                            (_, index) =>
                                selected.min_per_order +
                                index,
                        ).map((value) => (
                            <option
                                key={value}
                                value={value}
                            >
                                Quantity:{" "}
                                {value}
                            </option>
                        ))}
                    </select>
                )}

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
                disabled={working}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-lg"
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

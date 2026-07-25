"use client";

import Link from "next/link";
import {
    CheckCircle2,
    Clock3,
    Loader2,
    TableProperties,
    XCircle,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type Order = {
    order_number: string;
    currency: string;
    total_cents: number;
    status: string;
};

type Result = {
    order: Order;
    tableSelectionUrl: string | null;
};

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error:
                text ||
                "The server returned an invalid response.",
        };
    }
}

function money(cents: number, currency: string) {
    return new Intl.NumberFormat("en-SG", {
        style: "currency",
        currency,
    }).format(cents / 100);
}

export default function PaymentResult({
    slug,
    token,
    sessionId,
    freeOrder,
}: {
    slug: string;
    token: string;
    sessionId: string | null;
    freeOrder: string | null;
}) {
    const [result, setResult] =
        useState<Result | null>(null);
    const [error, setError] = useState("");
    const [attempts, setAttempts] = useState(0);
    const order = result?.order || null;

    const load = useCallback(async () => {
        const query = sessionId
            ? `session_id=${encodeURIComponent(
                  sessionId,
              )}`
            : `free_order=${encodeURIComponent(
                  freeOrder || "",
              )}`;

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug,
                )}/invite/${encodeURIComponent(
                    token,
                )}/order-status?${query}`,
                { cache: "no-store" },
            );
            const payload = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    payload.error ||
                        "Unable to check the order.",
                );
            }

            setResult(payload as Result);
            setError("");
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to check the order.",
            );
        }
    }, [freeOrder, sessionId, slug, token]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (order?.status === "paid" || attempts >= 12) {
            return;
        }

        const timer = window.setTimeout(() => {
            setAttempts((value) => value + 1);
            void load();
        }, 2500);

        return () => window.clearTimeout(timer);
    }, [attempts, load, order?.status]);

    const failed =
        order &&
        ["failed", "cancelled", "expired"].includes(
            order.status,
        );

    return (
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-xl">
            {!order && !error && (
                <>
                    <Loader2 className="mx-auto animate-spin text-[#4F46E5]" />
                    <h1 className="mt-5 text-3xl font-black">
                        Confirming payment
                    </h1>
                    <p className="mt-3 text-slate-600">
                        RegiGo is waiting for
                        Stripe&apos;s signed webhook.
                    </p>
                </>
            )}

            {error && (
                <>
                    <XCircle className="mx-auto text-red-600" />
                    <h1 className="mt-5 text-3xl font-black">
                        Unable to check order
                    </h1>
                    <p className="mt-3 text-slate-600">
                        {error}
                    </p>
                </>
            )}

            {order?.status === "paid" && (
                <>
                    <CheckCircle2
                        size={46}
                        className="mx-auto text-emerald-600"
                    />
                    <h1 className="mt-5 text-3xl font-black">
                        Ticket confirmed
                    </h1>
                    <p className="mt-4 font-black">
                        {order.order_number}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#4F46E5]">
                        {money(
                            order.total_cents,
                            order.currency,
                        )}
                    </p>

                    {result?.tableSelectionUrl && (
                        <Link
                            href={result.tableSelectionUrl}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-lg"
                        >
                            <TableProperties size={18} />
                            Choose Table
                        </Link>
                    )}
                </>
            )}

            {order &&
                order.status !== "paid" &&
                !failed && (
                    <>
                        <Clock3 className="mx-auto text-amber-600" />
                        <h1 className="mt-5 text-3xl font-black">
                            Payment processing
                        </h1>
                        <p className="mt-3 text-slate-600">
                            Stripe confirmation has not
                            arrived yet.
                        </p>
                    </>
                )}

            {failed && (
                <>
                    <XCircle className="mx-auto text-red-600" />
                    <h1 className="mt-5 text-3xl font-black">
                        Payment not completed
                    </h1>
                    <p className="mt-3 text-slate-600">
                        Order status: {order?.status}
                    </p>
                </>
            )}
        </section>
    );
}

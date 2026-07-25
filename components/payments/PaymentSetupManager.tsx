"use client";

import {
    ArrowUpRight,
    Building2,
    CheckCircle2,
    CircleAlert,
    CreditCard,
    Loader2,
    RefreshCw,
    ShieldCheck,
    WalletCards,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type StripeStatus = {
    connected: boolean;
    accountId:
        | string
        | null;
    accountType:
        | string
        | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    ready: boolean;
    requirements: {
        currentlyDue: string[];
        eventuallyDue: string[];
        pastDue: string[];
        pendingVerification: string[];
        disabledReason:
            | string
            | null;
    };
};

type Payload = {
    isPlatformAdmin: boolean;
    usesPlatformStripeAccount:
        boolean;
    company: {
        id: string;
        company_name: string;
        billing_email:
            | string
            | null;
    };
    status: StripeStatus;
};

async function readJson(
    response: Response,
) {
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    if (
        response.headers
            .get("content-type")
            ?.includes(
                "application/json",
            )
    ) {
        try {
            return JSON.parse(raw);
        } catch {
            return {
                error:
                    "The Stripe server returned invalid JSON.",
            };
        }
    }

    if (
        /^\s*<!doctype html/i.test(
            raw,
        ) ||
        raw.includes(
            "/_next/static/",
        )
    ) {
        return {
            error:
                response.status ===
                404
                    ? "The Stripe setup API route is missing."
                    : `The Stripe setup server returned HTML (HTTP ${response.status}).`,
        };
    }

    return {
        error:
            raw.length > 500
                ? `${raw.slice(
                      0,
                      500,
                  )}…`
                : raw,
    };
}

export default function PaymentSetupManager({
    companyId,
}: {
    companyId?:
        | string
        | null;
}) {
    const [data, setData] =
        useState<Payload | null>(
            null,
        );
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");

    const query =
        companyId
            ? `?companyId=${encodeURIComponent(
                  companyId,
              )}`
            : "";

    const load =
        useCallback(async () => {
            setLoading(true);

            try {
                const response =
                    await fetch(
                        `/api/company/stripe/connect${query}`,
                        {
                            cache:
                                "no-store",
                        },
                    );
                const result =
                    await readJson(
                        response,
                    );

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                            "Unable to load Stripe setup.",
                    );
                }

                setData(
                    result as Payload,
                );
                setMessage("");
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load Stripe setup.",
                );
            } finally {
                setLoading(false);
            }
        }, [query]);

    useEffect(() => {
        void load();
    }, [load]);

    async function connect() {
        if (!data) {
            return;
        }

        setWorking("connect");
        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/company/stripe/connect",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                companyId:
                                    data.company.id,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to start Stripe setup.",
                );
            }

            if (result.url) {
                window.location.assign(
                    result.url,
                );
                return;
            }

            setMessage(
                result.message ||
                    "Stripe is already configured.",
            );
            await load();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to start Stripe setup.",
            );
        } finally {
            setWorking("");
        }
    }

    async function openDashboard() {
        if (!data) {
            return;
        }

        setWorking("dashboard");
        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/company/stripe/dashboard",
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                companyId:
                                    data.company.id,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to open Stripe.",
                );
            }

            window.open(
                result.url,
                "_blank",
                "noopener,noreferrer",
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to open Stripe.",
            );
        } finally {
            setWorking("");
        }
    }

    if (
        loading &&
        !data
    ) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-bold leading-6 text-red-700">
                {message ||
                    "Stripe setup could not be loaded."}
            </div>
        );
    }

    const status =
        data.status;
    const due =
        status.requirements
            .currentlyDue;
    const buttonText =
        status.connected
            ? status.ready
                ? "Update Stripe Details"
                : "Continue Stripe Setup"
            : "Connect Company Stripe";

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        <WalletCards
                            size={16}
                        />
                        Company Payments
                    </div>

                    <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                        Connect your own Stripe account
                    </h1>

                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                        Ticket payments are created directly on the event company&apos;s Stripe account. The company controls its own Stripe Dashboard, payouts and banking details.
                    </p>
                </div>
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-6 text-slate-700">
                    {message}
                </div>
            )}

            <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                <Building2
                                    size={22}
                                />
                            </span>

                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Payment recipient
                                </p>
                                <h2 className="mt-1 truncate text-xl font-black text-slate-900 sm:text-2xl">
                                    {
                                        data.company
                                            .company_name
                                    }
                                </h2>
                                <p className="mt-1 truncate text-sm text-slate-500">
                                    {data.company
                                        .billing_email ||
                                        "No billing email configured"}
                                </p>
                            </div>
                        </div>

                        <StatusPill
                            ready={
                                status.ready
                            }
                            connected={
                                status.connected
                            }
                        />
                    </div>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                        <StatusCard
                            label="Details"
                            enabled={
                                status.detailsSubmitted
                            }
                        />
                        <StatusCard
                            label="Payments"
                            enabled={
                                status.chargesEnabled
                            }
                        />
                        <StatusCard
                            label="Payouts"
                            enabled={
                                status.payoutsEnabled
                            }
                        />
                    </div>

                    {due.length >
                        0 && (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <div className="flex items-start gap-3">
                                <CircleAlert
                                    className="mt-0.5 shrink-0 text-amber-700"
                                    size={20}
                                />
                                <div>
                                    <p className="font-black text-amber-900">
                                        Stripe needs more information
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-amber-800">
                                        Continue setup to complete the remaining business, identity or bank-account requirements.
                                    </p>
                                    <p className="mt-2 text-xs font-bold text-amber-700">
                                        {due.length} requirement
                                        {due.length ===
                                        1
                                            ? ""
                                            : "s"}{" "}
                                        remaining
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {status.requirements
                        .disabledReason && (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-6 text-red-700">
                            Stripe restriction:{" "}
                            {
                                status
                                    .requirements
                                    .disabledReason
                            }
                        </div>
                    )}

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        {!data.usesPlatformStripeAccount && (
                            <button
                                type="button"
                                onClick={() =>
                                    void connect()
                                }
                                disabled={
                                    Boolean(
                                        working,
                                    )
                                }
                                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3.5 font-black text-white disabled:opacity-60"
                            >
                                {working ===
                                "connect" ? (
                                    <Loader2
                                        size={
                                            18
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <CreditCard
                                        size={
                                            18
                                        }
                                    />
                                )}
                                {
                                    buttonText
                                }
                            </button>
                        )}

                        {status.connected && (
                            <button
                                type="button"
                                onClick={() =>
                                    void openDashboard()
                                }
                                disabled={
                                    Boolean(
                                        working,
                                    )
                                }
                                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3.5 font-black text-slate-800 disabled:opacity-60"
                            >
                                {working ===
                                "dashboard" ? (
                                    <Loader2
                                        size={
                                            18
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <ArrowUpRight
                                        size={
                                            18
                                        }
                                    />
                                )}
                                Open Stripe Dashboard
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                void load()
                            }
                            disabled={
                                loading ||
                                Boolean(
                                    working,
                                )
                            }
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3.5 font-black text-slate-700 disabled:opacity-60"
                        >
                            <RefreshCw
                                size={18}
                                className={
                                    loading
                                        ? "animate-spin"
                                        : ""
                                }
                            />
                            Refresh
                        </button>
                    </div>
                </div>

                <aside className="rounded-[2rem] border border-indigo-100 bg-[#F7F5FF] p-6 sm:p-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm">
                        <ShieldCheck
                            size={23}
                        />
                    </div>

                    <h2 className="mt-5 text-2xl font-black">
                        How payments work
                    </h2>

                    <div className="mt-5 space-y-4">
                        <Step
                            number="1"
                            text="The Company Admin connects or creates the company’s Stripe account."
                        />
                        <Step
                            number="2"
                            text="Guests pay through Stripe Checkout using the company’s branding."
                        />
                        <Step
                            number="3"
                            text="Funds and Stripe fees stay with the connected event company account."
                        />
                        <Step
                            number="4"
                            text="RegiGo stores only order status and Stripe reference IDs."
                        />
                    </div>
                </aside>
            </section>
        </div>
    );
}

function StatusPill({
    ready,
    connected,
}: {
    ready: boolean;
    connected: boolean;
}) {
    return (
        <span
            className={[
                "inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-black",
                ready
                    ? "bg-emerald-50 text-emerald-700"
                    : connected
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600",
            ].join(" ")}
        >
            {ready ? (
                <CheckCircle2
                    size={14}
                />
            ) : (
                <CircleAlert
                    size={14}
                />
            )}
            {ready
                ? "Ready"
                : connected
                  ? "Setup incomplete"
                  : "Not connected"}
        </span>
    );
}

function StatusCard({
    label,
    enabled,
}: {
    label: string;
    enabled: boolean;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p
                className={[
                    "mt-2 font-black",
                    enabled
                        ? "text-emerald-700"
                        : "text-slate-500",
                ].join(" ")}
            >
                {enabled
                    ? "Enabled"
                    : "Pending"}
            </p>
        </div>
    );
}

function Step({
    number,
    text,
}: {
    number: string;
    text: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#4F46E5] shadow-sm">
                {number}
            </span>
            <p className="pt-1 text-sm font-semibold leading-6 text-slate-700">
                {text}
            </p>
        </div>
    );
}

"use client";

import {
    Building2,
    CalendarDays,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Users,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type Summary = {
    scope:
        | "platform"
        | "company"
        | "assigned";
    scopeLabel: string;
    isPlatformAdmin: boolean;
    isCompanyAdmin: boolean;
    cards: {
        events: {
            value: number;
            description: string;
        };
        users: {
            value: number;
            description: string;
        };
        companies: {
            value: number;
            description: string;
        };
        roles: {
            value: number;
            description: string;
        };
    };
    error?: string;
};

async function readJson(
    response: Response,
) {
    const text =
        await response.text();

    if (!text.trim()) {
        return {};
    }

    try {
        return JSON.parse(
            text,
        );
    } catch {
        return {
            error:
                "The dashboard summary route returned an invalid response.",
        };
    }
}

export default function CompanyScopedDashboardStats() {
    const [
        summary,
        setSummary,
    ] =
        useState<Summary | null>(
            null,
        );
    const [
        loading,
        setLoading,
    ] = useState(true);
    const [
        error,
        setError,
    ] = useState("");

    const load =
        useCallback(async () => {
            setLoading(
                true,
            );
            setError(
                "",
            );

            try {
                const response =
                    await fetch(
                        "/api/dashboard/summary",
                        {
                            cache:
                                "no-store",
                        },
                    );
                const payload =
                    await readJson(
                        response,
                    ) as Summary;

                if (!response.ok) {
                    throw new Error(
                        payload.error ||
                            "Unable to load dashboard totals.",
                    );
                }

                setSummary(
                    payload,
                );
            } catch (reason) {
                setError(
                    reason instanceof
                        Error
                        ? reason.message
                        : "Unable to load dashboard totals.",
                );
            } finally {
                setLoading(
                    false,
                );
            }
        }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (
        loading &&
        !summary
    ) {
        return (
            <div className="flex min-h-56 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (
        !summary
    ) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm">
                <p className="font-black text-red-600">
                    Dashboard totals could not be loaded.
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {
                        error
                    }
                </p>

                <button
                    type="button"
                    onClick={() =>
                        void load()
                    }
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white"
                >
                    <RefreshCw
                        size={
                            17
                        }
                    />
                    Try Again
                </button>
            </div>
        );
    }

    const cards = [
        {
            key:
                "events",
            label:
                "Events",
            icon:
                CalendarDays,
            ...summary.cards
                .events,
        },
        {
            key:
                "users",
            label:
                "Users",
            icon:
                Users,
            ...summary.cards
                .users,
        },
        {
            key:
                "companies",
            label:
                summary.isPlatformAdmin
                    ? "Companies"
                    : "Company",
            icon:
                Building2,
            ...summary.cards
                .companies,
        },
        {
            key:
                "roles",
            label:
                "Roles",
            icon:
                ShieldCheck,
            ...summary.cards
                .roles,
        },
    ];

    return (
        <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
                        {summary.isPlatformAdmin
                            ? "Platform View"
                            : summary.isCompanyAdmin
                              ? "Company Admin View"
                              : "Assigned Workspace View"}
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                        {
                            summary.scopeLabel
                        }
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void load()
                    }
                    disabled={
                        loading
                    }
                    className="inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm disabled:opacity-50"
                >
                    <RefreshCw
                        size={
                            16
                        }
                        className={
                            loading
                                ? "animate-spin"
                                : ""
                        }
                    />
                    Refresh
                </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {cards.map(
                    (
                        card,
                    ) => {
                        const Icon =
                            card.icon;

                        return (
                            <article
                                key={
                                    card.key
                                }
                                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                            >
                                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                    <Icon
                                        size={
                                            24
                                        }
                                    />
                                </span>

                                <p className="mt-7 text-lg font-black text-slate-500">
                                    {
                                        card.label
                                    }
                                </p>

                                <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">
                                    {Number(
                                        card.value ||
                                            0,
                                    ).toLocaleString()}
                                </p>

                                <p className="mt-5 text-sm font-semibold leading-6 text-slate-500 sm:text-base">
                                    {
                                        card.description
                                    }
                                </p>
                            </article>
                        );
                    },
                )}
            </div>
        </section>
    );
}

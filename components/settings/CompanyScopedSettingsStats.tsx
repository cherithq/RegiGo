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

type Payload = {
    scope:
        | "platform"
        | "company";
    scopeLabel: string;
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
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    try {
        return JSON.parse(
            raw,
        );
    } catch {
        return {
            error:
                "The settings summary route returned an invalid response.",
        };
    }
}

export default function CompanyScopedSettingsStats() {
    const [
        data,
        setData,
    ] =
        useState<Payload | null>(
            null,
        );
    const [
        loading,
        setLoading,
    ] = useState(true);
    const [
        message,
        setMessage,
    ] = useState("");

    const load =
        useCallback(async () => {
            setLoading(
                true,
            );
            setMessage(
                "",
            );

            try {
                const response =
                    await fetch(
                        "/api/settings/summary",
                        {
                            cache:
                                "no-store",
                        },
                    );
                const payload =
                    await readJson(
                        response,
                    ) as Payload;

                if (!response.ok) {
                    throw new Error(
                        payload.error ||
                            "Unable to load settings totals.",
                    );
                }

                setData(
                    payload,
                );
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load settings totals.",
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
        !data
    ) {
        return (
            <div className="flex min-h-52 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm">
                <p className="font-black text-red-600">
                    Settings totals could not be loaded.
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {
                        message
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
            ...data.cards.events,
        },
        {
            key:
                "users",
            label:
                "Users",
            icon:
                Users,
            ...data.cards.users,
        },
        {
            key:
                "companies",
            label:
                data.scope ===
                "platform"
                    ? "Companies"
                    : "Company",
            icon:
                Building2,
            ...data.cards.companies,
        },
        {
            key:
                "roles",
            label:
                "Roles",
            icon:
                ShieldCheck,
            ...data.cards.roles,
        },
    ];

    return (
        <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
                        {data.scope ===
                        "platform"
                            ? "Platform Settings"
                            : "Company Settings"}
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                        {
                            data.scopeLabel
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

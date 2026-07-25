"use client";

import {
    BadgeCheck,
    Check,
    CreditCard,
    Loader2,
    Lock,
    MailCheck,
    Printer,
    RefreshCw,
    TableProperties,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type AddonKey =
    | "guest_invitations"
    | "stripe_payments"
    | "guest_table_selection"
    | "badge_designer"
    | "direct_printing";

type Addon = {
    key: AddonKey;
    name: string;
    description: string;
    plannedRoute: string | null;
    allowed: boolean;
    enabled: boolean;
    updatedAt: string | null;
};

type Payload = {
    event: {
        id: string;
        event_name: string;
    };
    isPlatformAdmin: boolean;
    canManage: boolean;
    addons: Addon[];
};

const icons = {
    guest_invitations: MailCheck,
    stripe_payments: CreditCard,
    guest_table_selection: TableProperties,
    badge_designer: BadgeCheck,
    direct_printing: Printer,
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

export default function EventAddonsManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(null);
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState<AddonKey | "">("");
    const [message, setMessage] =
        useState("");

    const reload = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(
                `/api/events/${eventId}/addons`,
                {
                    cache: "no-store",
                },
            );

            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to load event add-ons.",
                );
            }

            setData(result as Payload);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load event add-ons.",
            );
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    async function toggleAddon(
        addon: Addon,
    ) {
        if (
            !data?.canManage ||
            (!addon.allowed &&
                !addon.enabled)
        ) {
            return;
        }

        setWorking(addon.key);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/addons`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        addonKey: addon.key,
                        enabled:
                            !addon.enabled,
                    }),
                },
            );

            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to update the add-on.",
                );
            }

            setData((current) =>
                current
                    ? {
                          ...current,
                          addons:
                              result.addons ||
                              current.addons,
                      }
                    : current,
            );

            setMessage(
                result.message ||
                    "Add-on updated.",
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update the add-on.",
            );
        } finally {
            setWorking("");
        }
    }

    if (loading && !data) {
        return (
            <div className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <div className="flex items-center gap-3 font-black text-slate-500">
                    <Loader2
                        size={20}
                        className="animate-spin"
                    />
                    Loading add-ons...
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-700">
                <p className="font-black">
                    Add-ons could not be loaded.
                </p>
                <p className="mt-2 text-sm">
                    {message}
                </p>
            </div>
        );
    }

    const enabledCount =
        data.addons.filter(
            (addon) => addon.enabled,
        ).length;

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-black uppercase tracking-wide text-[#4F46E5]">
                        {data.isPlatformAdmin
                            ? "Platform administrator"
                            : "Event company"}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                        {enabledCount} of{" "}
                        {data.addons.length} add-ons
                        enabled
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {data.isPlatformAdmin
                            ? "All add-ons are available without a rental-plan restriction."
                            : "An add-on can only be enabled when it is included in the company rental plan."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void reload()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
                >
                    <RefreshCw
                        size={16}
                        className={
                            loading
                                ? "animate-spin"
                                : ""
                        }
                    />
                    Refresh
                </button>
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
                    {message}
                </div>
            )}

            <section className="grid gap-5 md:grid-cols-2">
                {data.addons.map((addon) => {
                    const Icon =
                        icons[addon.key];
                    const busy =
                        working === addon.key;
                    const canToggle =
                        data.canManage &&
                        (
                            addon.allowed ||
                            addon.enabled
                        );

                    return (
                        <article
                            key={addon.key}
                            className={`rounded-[2rem] border bg-white p-6 shadow-sm ${
                                addon.enabled
                                    ? "border-indigo-200"
                                    : "border-slate-200"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                                        addon.enabled
                                            ? "bg-[#4F46E5] text-white"
                                            : "bg-[#F7F5FF] text-[#4F46E5]"
                                    }`}
                                >
                                    <Icon
                                        size={23}
                                    />
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={
                                        addon.enabled
                                    }
                                    disabled={
                                        !canToggle ||
                                        busy
                                    }
                                    onClick={() =>
                                        void toggleAddon(
                                            addon,
                                        )
                                    }
                                    className={`relative h-8 w-14 rounded-full transition ${
                                        addon.enabled
                                            ? "bg-[#4F46E5]"
                                            : "bg-slate-200"
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <span
                                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                                            addon.enabled
                                                ? "left-7"
                                                : "left-1"
                                        }`}
                                    />
                                </button>
                            </div>

                            <h3 className="mt-5 text-xl font-black">
                                {addon.name}
                            </h3>

                            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                                {addon.description}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {addon.enabled ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                                        <Check
                                            size={13}
                                        />
                                        Enabled
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                                        Disabled
                                    </span>
                                )}

                                {addon.allowed ? (
                                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                                        Available
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                                        <Lock
                                            size={12}
                                        />
                                        Not in plan
                                    </span>
                                )}

                                {busy && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                                        <Loader2
                                            size={12}
                                            className="animate-spin"
                                        />
                                        Saving
                                    </span>
                                )}
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}

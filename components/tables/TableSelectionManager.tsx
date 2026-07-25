"use client";

import {
    Check,
    Clock3,
    Loader2,
    RefreshCw,
    Save,
    TableProperties,
    Users,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type TableRow = {
    id: string;
    table_name: string;
    capacity: number;
    guest_selectable: boolean;
    selection_label: string | null;
    selection_description: string | null;
    selection_order: number;
    confirmedSeats: number;
    heldSeats: number;
    availableSeats: number;
};

type Settings = {
    hold_minutes: number;
    allow_changes: boolean;
    require_paid_ticket: boolean;
    allow_registration_selection: boolean;
    allow_rsvp_selection: boolean;
    selection_required: boolean;
    instructions: string | null;
};

type Payload = {
    settings: Settings;
    tables: TableRow[];
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

export default function TableSelectionManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(
                `/api/events/${eventId}/table-selection`,
                { cache: "no-store" },
            );
            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to load table selection.",
                );
            }

            setData(result as Payload);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load table selection.",
            );
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    function updateSetting(
        key: keyof Settings,
        value: string | number | boolean,
    ) {
        setData((current) =>
            current
                ? {
                      ...current,
                      settings: {
                          ...current.settings,
                          [key]: value,
                      },
                  }
                : current,
        );
    }

    function updateTable(
        tableId: string,
        key: keyof TableRow,
        value: string | number | boolean,
    ) {
        setData((current) =>
            current
                ? {
                      ...current,
                      tables: current.tables.map((table) =>
                          table.id === tableId
                              ? {
                                    ...table,
                                    [key]: value,
                                }
                              : table,
                      ),
                  }
                : current,
        );
    }

    async function patch(
        body: Record<string, unknown>,
        key: string,
    ) {
        setWorking(key);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/table-selection`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                },
            );
            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to save table selection.",
                );
            }

            setData({
                settings: result.settings,
                tables: result.tables,
            });
            setMessage(result.message);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save table selection.",
            );
        } finally {
            setWorking("");
        }
    }

    if (loading && !data) {
        return (
            <div className="flex min-h-[380px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-700">
                {message}
            </div>
        );
    }

    const enabledCount = data.tables.filter(
        (table) => table.guest_selectable,
    ).length;

    return (
        <div className="space-y-6">
            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">
                    {message}
                </div>
            )}

            <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
                <div className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <Clock3 size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">
                                Guest Rules
                            </h2>
                            <p className="text-sm text-slate-500">
                                Applied to this event.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Hold duration
                            </label>
                            <select
                                value={data.settings.hold_minutes}
                                onChange={(event) =>
                                    updateSetting(
                                        "hold_minutes",
                                        Number(event.target.value),
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold"
                            >
                                {[2, 5, 10, 15, 20, 30].map(
                                    (minutes) => (
                                        <option
                                            key={minutes}
                                            value={minutes}
                                        >
                                            {minutes} minutes
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                            <input
                                type="checkbox"
                                checked={data.settings.allow_changes}
                                onChange={(event) =>
                                    updateSetting(
                                        "allow_changes",
                                        event.target.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[#4F46E5]"
                            />
                            <span className="text-sm font-black">
                                Guests may change a confirmed
                                table
                            </span>
                        </label>

                        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                            <input
                                type="checkbox"
                                checked={
                                    data.settings
                                        .require_paid_ticket
                                }
                                onChange={(event) =>
                                    updateSetting(
                                        "require_paid_ticket",
                                        event.target.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[#4F46E5]"
                            />
                            <span className="text-sm font-black">
                                Require completed ticket payment
                            </span>
                        </label>

                        <div className="rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-4">
                            <p className="text-sm font-black text-[#4F46E5]">
                                Where guests can choose a table
                            </p>

                            <div className="mt-3 space-y-3">
                                <label className="flex items-start gap-3 rounded-xl bg-white p-3">
                                    <input
                                        type="checkbox"
                                        checked={
                                            data.settings
                                                .allow_registration_selection
                                        }
                                        onChange={(event) =>
                                            updateSetting(
                                                "allow_registration_selection",
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-1 h-4 w-4 accent-[#4F46E5]"
                                    />
                                    <span>
                                        <span className="block text-sm font-black">
                                            After public registration
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                                            Guests submit the registration form, then choose and confirm a table.
                                        </span>
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 rounded-xl bg-white p-3">
                                    <input
                                        type="checkbox"
                                        checked={
                                            data.settings
                                                .allow_rsvp_selection
                                        }
                                        onChange={(event) =>
                                            updateSetting(
                                                "allow_rsvp_selection",
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-1 h-4 w-4 accent-[#4F46E5]"
                                    />
                                    <span>
                                        <span className="block text-sm font-black">
                                            After accepting an invitation RSVP
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                                            Accepted invitees see a Choose Table action on their invitation page.
                                        </span>
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 rounded-xl bg-white p-3">
                                    <input
                                        type="checkbox"
                                        checked={
                                            data.settings
                                                .selection_required
                                        }
                                        onChange={(event) =>
                                            updateSetting(
                                                "selection_required",
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-1 h-4 w-4 accent-[#EC4899]"
                                    />
                                    <span>
                                        <span className="block text-sm font-black">
                                            Require guests to confirm a table
                                        </span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                                            Public registrants cannot skip directly to their QR pass.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Instructions
                            </label>
                            <textarea
                                value={
                                    data.settings.instructions || ""
                                }
                                onChange={(event) =>
                                    updateSetting(
                                        "instructions",
                                        event.target.value,
                                    )
                                }
                                rows={4}
                                placeholder="Choose one available table for your party."
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void patch(
                                    {
                                        action: "settings",
                                        holdMinutes:
                                            data.settings
                                                .hold_minutes,
                                        allowChanges:
                                            data.settings
                                                .allow_changes,
                                        requirePaidTicket:
                                            data.settings
                                                .require_paid_ticket,
                                        allowRegistrationSelection:
                                            data.settings
                                                .allow_registration_selection,
                                        allowRsvpSelection:
                                            data.settings
                                                .allow_rsvp_selection,
                                        selectionRequired:
                                            data.settings
                                                .selection_required,
                                        instructions:
                                            data.settings
                                                .instructions,
                                    },
                                    "settings",
                                )
                            }
                            disabled={working === "settings"}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white disabled:opacity-50"
                        >
                            {working === "settings" ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}
                            Save Rules
                        </button>
                    </div>
                </div>

                <div className="space-y-5">
                    <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-[#4F46E5]">
                                Existing seating tables
                            </p>
                            <h2 className="mt-2 text-2xl font-black">
                                {enabledCount} of {data.tables.length}{" "}
                                available to guests
                            </h2>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    void patch(
                                        {
                                            action: "bulk",
                                            enabled: true,
                                        },
                                        "bulk-on",
                                    )
                                }
                                className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"
                            >
                                Enable All
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    void patch(
                                        {
                                            action: "bulk",
                                            enabled: false,
                                        },
                                        "bulk-off",
                                    )
                                }
                                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                            >
                                Disable All
                            </button>
                            <button
                                type="button"
                                onClick={() => void reload()}
                                className="rounded-xl bg-slate-100 p-3 text-slate-600"
                            >
                                <RefreshCw
                                    size={17}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />
                            </button>
                        </div>
                    </section>

                    {data.tables.length === 0 ? (
                        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">
                            <TableProperties className="mx-auto" />
                            <p className="mt-4 font-black">
                                No seating tables exist yet.
                            </p>
                            <p className="mt-2 text-sm">
                                Create tables in the existing
                                Seating module first.
                            </p>
                        </section>
                    ) : (
                        data.tables.map((table) => (
                            <article
                                key={table.id}
                                className={`rounded-[2rem] border bg-white p-6 shadow-sm ${
                                    table.guest_selectable
                                        ? "border-indigo-200"
                                        : "border-slate-200"
                                }`}
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-black">
                                                {table.table_name}
                                            </h3>
                                            <span
                                                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                                                    table.guest_selectable
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {table.guest_selectable
                                                    ? "Guest selectable"
                                                    : "Hidden"}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                            <Metric
                                                label="Capacity"
                                                value={table.capacity}
                                            />
                                            <Metric
                                                label="Confirmed"
                                                value={
                                                    table.confirmedSeats
                                                }
                                            />
                                            <Metric
                                                label="Held"
                                                value={table.heldSeats}
                                            />
                                            <Metric
                                                label="Available"
                                                value={
                                                    table.availableSeats
                                                }
                                            />
                                        </div>
                                    </div>

                                    <label className="inline-flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                table.guest_selectable
                                            }
                                            onChange={(event) =>
                                                updateTable(
                                                    table.id,
                                                    "guest_selectable",
                                                    event.target.checked,
                                                )
                                            }
                                            className="h-4 w-4 accent-[#4F46E5]"
                                        />
                                        <span className="text-sm font-black">
                                            Allow
                                        </span>
                                    </label>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr_120px_auto]">
                                    <input
                                        value={
                                            table.selection_label || ""
                                        }
                                        onChange={(event) =>
                                            updateTable(
                                                table.id,
                                                "selection_label",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Guest-facing label"
                                        className="rounded-2xl border border-slate-200 px-4 py-3"
                                    />
                                    <input
                                        value={
                                            table.selection_description ||
                                            ""
                                        }
                                        onChange={(event) =>
                                            updateTable(
                                                table.id,
                                                "selection_description",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Optional description"
                                        className="rounded-2xl border border-slate-200 px-4 py-3"
                                    />
                                    <input
                                        type="number"
                                        value={table.selection_order}
                                        onChange={(event) =>
                                            updateTable(
                                                table.id,
                                                "selection_order",
                                                Number(
                                                    event.target.value,
                                                ),
                                            )
                                        }
                                        className="rounded-2xl border border-slate-200 px-4 py-3"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void patch(
                                                {
                                                    action: "table",
                                                    tableId: table.id,
                                                    guestSelectable:
                                                        table.guest_selectable,
                                                    selectionLabel:
                                                        table.selection_label,
                                                    selectionDescription:
                                                        table.selection_description,
                                                    selectionOrder:
                                                        table.selection_order,
                                                },
                                                `table:${table.id}`,
                                            )
                                        }
                                        disabled={
                                            working ===
                                            `table:${table.id}`
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 font-black text-white disabled:opacity-50"
                                    >
                                        {working ===
                                        `table:${table.id}` ? (
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Check size={16} />
                                        )}
                                        Save
                                    </button>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

function Metric({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-400">
                <Users size={14} />
                <p className="text-xs font-black uppercase tracking-wide">
                    {label}
                </p>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">
                {value}
            </p>
        </div>
    );
}

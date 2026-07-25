"use client";

import {
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCw,
    TableProperties,
    Users,
    X,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type TableRow = {
    id: string;
    table_name: string;
    capacity: number;
    selection_label: string | null;
    selection_description: string | null;
    availableSeats: number;
};

type Assignment = {
    id: string;
    table_id: string;
    assigned_at: string;
    table?: TableRow | null;
};

type Hold = {
    id: string;
    table_id: string;
    party_size: number;
    expires_at: string;
    table?: TableRow | null;
};

type Payload = {
    guest: {
        partySize: number;
    };
    settings: {
        hold_minutes: number;
        allow_changes: boolean;
        require_paid_ticket: boolean;
        instructions: string | null;
    };
    tables: TableRow[];
    currentAssignment: Assignment | null;
    currentHold: Hold | null;
    message?: string;
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

function remainingSeconds(
    expiresAt: string | null | undefined,
) {
    if (!expiresAt) return 0;

    return Math.max(
        Math.ceil(
            (new Date(expiresAt).getTime() - Date.now()) /
                1000,
        ),
        0,
    );
}

function clock(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function PublicTableSelector({
    slug,
    token,
    apiPath,
    completionUrl,
    completionLabel = "Continue to QR Pass",
    initialData,
}: {
    slug?: string;
    token?: string;
    apiPath?: string;
    completionUrl?: string | null;
    completionLabel?: string;
    initialData: Payload;
}) {
    const endpoint =
        apiPath ||
        (
            slug &&
            token
                ? `/api/public/events/${encodeURIComponent(
                      slug,
                  )}/invite/${encodeURIComponent(
                      token,
                  )}/tables`
                : ""
        );

    if (!endpoint) {
        throw new Error(
            "PublicTableSelector requires an API path.",
        );
    }
    const [data, setData] = useState<Payload>(initialData);
    const [selectedId, setSelectedId] = useState(
        initialData.currentHold?.table_id ||
            initialData.currentAssignment?.table_id ||
            "",
    );
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState("");
    const [seconds, setSeconds] = useState(
        remainingSeconds(initialData.currentHold?.expires_at),
    );

    const currentTable = useMemo(
        () =>
            data.currentAssignment?.table ||
            data.tables.find(
                (table) =>
                    table.id ===
                    data.currentAssignment?.table_id,
            ) ||
            null,
        [data],
    );

    const heldTable = useMemo(
        () =>
            data.currentHold?.table ||
            data.tables.find(
                (table) =>
                    table.id === data.currentHold?.table_id,
            ) ||
            null,
        [data],
    );

    const reload = useCallback(async () => {
        const response = await fetch(
            endpoint,
            { cache: "no-store" },
        );
        const result = await readJson(response);

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to refresh tables.",
            );
        }

        setData(result as Payload);
        setSeconds(
            remainingSeconds(result.currentHold?.expires_at),
        );
    }, [endpoint]);

    useEffect(() => {
        if (!data.currentHold) {
            setSeconds(0);
            return;
        }

        const timer = window.setInterval(() => {
            const next = remainingSeconds(
                data.currentHold?.expires_at,
            );
            setSeconds(next);

            if (next === 0) {
                window.clearInterval(timer);
                void reload().catch((error) =>
                    setMessage(
                        error instanceof Error
                            ? error.message
                            : "The table hold expired.",
                    ),
                );
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [data.currentHold, reload]);

    async function act(
        action: "hold" | "confirm" | "release",
    ) {
        if (action === "hold" && !selectedId) {
            setMessage("Choose a table first.");
            return;
        }

        setWorking(action);
        setMessage("");

        try {
            const response = await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action,
                        tableId:
                            action === "hold"
                                ? selectedId
                                : undefined,
                    }),
                },
            );
            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to update table selection.",
                );
            }

            setData(result as Payload);
            setMessage(result.message || "");
            setSeconds(
                remainingSeconds(
                    result.currentHold?.expires_at,
                ),
            );

            if (result.currentAssignment?.table_id) {
                setSelectedId(
                    result.currentAssignment.table_id,
                );
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update table selection.",
            );
            await reload().catch(() => {});
        } finally {
            setWorking("");
        }
    }

    const locked =
        Boolean(data.currentAssignment) &&
        !data.settings.allow_changes;

    return (
        <div className="mt-7 space-y-5">
            {message && (
                <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700">
                    {message}
                </div>
            )}

            {data.currentAssignment && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 size={23} />
                        <div>
                            <p className="font-black">
                                Confirmed table
                            </p>
                            <p className="mt-1 text-lg font-black">
                                {currentTable?.selection_label ||
                                    currentTable?.table_name ||
                                    "Selected table"}
                            </p>
                            <p className="mt-1 text-sm">
                                Party of {data.guest.partySize}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {data.currentAssignment &&
                completionUrl && (
                    <a
                        href={completionUrl}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-lg"
                    >
                        <CheckCircle2
                            size={18}
                        />
                        {completionLabel}
                    </a>
                )}

            {data.currentHold && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <Clock3 size={22} />
                            <div>
                                <p className="font-black">
                                    Table temporarily held
                                </p>
                                <p className="mt-1 text-lg font-black">
                                    {heldTable?.selection_label ||
                                        heldTable?.table_name}
                                </p>
                                <p className="mt-1 text-sm">
                                    Confirm within {clock(seconds)}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    void act("confirm")
                                }
                                disabled={
                                    Boolean(working) ||
                                    seconds <= 0
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                                {working === "confirm" ? (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <CheckCircle2 size={15} />
                                )}
                                Confirm
                            </button>
                            <button
                                type="button"
                                onClick={() => void act("release")}
                                disabled={Boolean(working)}
                                className="rounded-xl bg-white p-3 text-amber-700"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!locked && (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black">
                                Available tables
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Your party requires{" "}
                                {data.guest.partySize} seat
                                {data.guest.partySize === 1
                                    ? ""
                                    : "s"}
                                .
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void reload().catch((error) =>
                                    setMessage(
                                        error instanceof Error
                                            ? error.message
                                            : "Unable to refresh.",
                                    ),
                                )
                            }
                            className="rounded-xl bg-slate-100 p-3 text-slate-600"
                        >
                            <RefreshCw size={17} />
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {data.tables.map((table) => {
                            const active = table.id === selectedId;
                            const enough =
                                table.availableSeats >=
                                    data.guest.partySize ||
                                table.id ===
                                    data.currentAssignment?.table_id ||
                                table.id === data.currentHold?.table_id;

                            return (
                                <button
                                    key={table.id}
                                    type="button"
                                    disabled={!enough}
                                    onClick={() =>
                                        setSelectedId(table.id)
                                    }
                                    className={`rounded-3xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                        active
                                            ? "border-[#4F46E5] bg-[#F7F5FF]"
                                            : "border-slate-200 bg-white hover:border-indigo-200"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                                                active
                                                    ? "bg-[#4F46E5] text-white"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            <TableProperties
                                                size={19}
                                            />
                                        </span>
                                        <div>
                                            <p className="text-lg font-black">
                                                {table.selection_label ||
                                                    table.table_name}
                                            </p>
                                            {table.selection_description && (
                                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                                    {
                                                        table.selection_description
                                                    }
                                                </p>
                                            )}
                                            <p className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#4F46E5]">
                                                <Users size={15} />
                                                {table.availableSeats}{" "}
                                                seats currently available
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {data.tables.length === 0 && (
                        <div className="rounded-2xl bg-amber-50 p-5 text-center font-bold text-amber-800">
                            No guest-selectable tables are
                            currently available.
                        </div>
                    )}

                    {!data.currentHold &&
                        data.tables.length > 0 && (
                            <button
                                type="button"
                                onClick={() => void act("hold")}
                                disabled={
                                    Boolean(working) ||
                                    !selectedId
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
                            >
                                {working === "hold" ? (
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Clock3 size={18} />
                                )}
                                Hold Selected Table
                            </button>
                        )}
                </>
            )}
        </div>
    );
}

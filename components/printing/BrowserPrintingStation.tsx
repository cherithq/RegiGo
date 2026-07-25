"use client";

import {
    CheckCircle2,
    Clock3,
    Loader2,
    MonitorPlay,
    Printer,
    RefreshCw,
    RotateCcw,
    Search,
    Settings2,
    Square,
    UserRound,
    XCircle,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

type Settings = {
    enabled: boolean;
    template_id:
        | string
        | null;
    copies: number;
    print_once_per_registration: boolean;
    max_manual_reprints: number;
};

type Template = {
    id: string;
    template_name: string;
    is_default: boolean;
};

type Registration = {
    id: string;
    full_name: string;
    email: string;
    department: string | null;
    rsvp_status: string | null;
    payment_status: string | null;
};

type PrintRequest = {
    id: string;
    registration_id: string;
    request_kind: string;
    copies: number;
    status: string;
    reason: string | null;
    badge_job_id: string | null;
    created_at: string;
    registrations:
        | {
              full_name?: string;
              email?: string;
          }
        | {
              full_name?: string;
              email?: string;
          }[]
        | null;
};

type Payload = {
    settings: Settings | null;
    templates: Template[];
    registrations: Registration[];
    requests: PrintRequest[];
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
        return JSON.parse(text);
    } catch {
        return {
            error:
                text ||
                "The server returned an invalid response.",
        };
    }
}

function one<T>(
    value: T | T[] | null,
) {
    return Array.isArray(value)
        ? value[0] || null
        : value;
}

function terminalStatus(status: string) {
    return [
        "completed",
        "failed",
        "cancelled",
        "skipped",
        "presented",
    ].includes(status);
}

export default function BrowserPrintingStation({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(null);
    const [settings, setSettings] =
        useState<Settings>({
            enabled: false,
            template_id: null,
            copies: 1,
            print_once_per_registration:
                true,
            max_manual_reprints: 3,
        });
    const [query, setQuery] =
        useState("");
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");
    const [stationRunning, setStationRunning] =
        useState(false);
    const [activeRequestId, setActiveRequestId] =
        useState<string | null>(null);

    const printWindowRef =
        useRef<Window | null>(null);
    const tickRunningRef =
        useRef(false);

    const reload =
        useCallback(async () => {
            setLoading(true);

            try {
                const response =
                    await fetch(
                        `/api/events/${eventId}/check-in-printing`,
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
                            "Unable to load browser printing.",
                    );
                }

                const payload =
                    result as Payload;
                setData(payload);

                if (
                    payload.settings
                ) {
                    setSettings(
                        payload.settings,
                    );
                } else {
                    setSettings(
                        (current) => ({
                            ...current,
                            template_id:
                                current.template_id ||
                                payload
                                    .templates[0]
                                    ?.id ||
                                null,
                        }),
                    );
                }

                if (
                    activeRequestId
                ) {
                    const active =
                        payload.requests.find(
                            (
                                item,
                            ) =>
                                item.id ===
                                activeRequestId,
                        );

                    if (
                        !active ||
                        terminalStatus(
                            active.status,
                        )
                    ) {
                        setActiveRequestId(
                            null,
                        );
                    }
                }
            } catch (error) {
                setMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to load browser printing.",
                );
            } finally {
                setLoading(false);
            }
        }, [
            activeRequestId,
            eventId,
        ]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const filteredGuests =
        useMemo(() => {
            const clean =
                query.trim().toLowerCase();

            return (
                data?.registrations ||
                []
            ).filter((guest) =>
                !clean
                    ? true
                    : [
                          guest.full_name,
                          guest.email,
                          guest.department,
                      ]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase()
                          .includes(clean),
            );
        }, [data, query]);

    const pendingCount =
        useMemo(
            () =>
                (
                    data?.requests ||
                    []
                ).filter((item) =>
                    [
                        "pending",
                        "claimed",
                    ].includes(
                        item.status,
                    ),
                ).length,
            [data],
        );

    const stationTick =
        useCallback(async () => {
            if (
                tickRunningRef.current
            ) {
                return;
            }

            const printWindow =
                printWindowRef.current;

            if (
                !printWindow ||
                printWindow.closed
            ) {
                setStationRunning(false);
                setActiveRequestId(
                    null,
                );
                setMessage(
                    "The print station window was closed. Start the station again.",
                );
                return;
            }

            tickRunningRef.current =
                true;

            try {
                if (
                    activeRequestId
                ) {
                    await reload();
                    return;
                }

                const response =
                    await fetch(
                        `/api/events/${eventId}/check-in-printing/next`,
                        {
                            method:
                                "POST",
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
                            "Unable to claim the next badge.",
                    );
                }

                if (result.job) {
                    setActiveRequestId(
                        result.job
                            .requestId,
                    );
                    printWindow.location.href =
                        result.job.printUrl;
                    setMessage(
                        `Opening ${result.job.copies} badge cop${result.job.copies === 1 ? "y" : "ies"} in the print dialog.`,
                    );
                } else {
                    await reload();
                }
            } catch (error) {
                setMessage(
                    error instanceof Error
                        ? error.message
                        : "The print station could not load the next badge.",
                );
            } finally {
                tickRunningRef.current =
                    false;
            }
        }, [
            activeRequestId,
            eventId,
            reload,
        ]);

    useEffect(() => {
        if (!stationRunning) {
            return;
        }

        void stationTick();

        const interval =
            window.setInterval(
                () => {
                    void stationTick();
                },
                2500,
            );

        return () =>
            window.clearInterval(
                interval,
            );
    }, [
        stationRunning,
        stationTick,
    ]);

    function startStation() {
        const station =
            window.open(
                "about:blank",
                "regigo-browser-print-station",
                "width=1100,height=850",
            );

        if (!station) {
            setMessage(
                "The browser blocked the print station window. Allow pop-ups for RegiGo and try again.",
            );
            return;
        }

        station.document.write(
            `
                <title>RegiGo Print Station</title>
                <body style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc;color:#0f172a">
                    <h1>RegiGo Print Station Ready</h1>
                    <p>Keep this window open. The next checked-in guest badge will appear here.</p>
                </body>
            `,
        );
        station.document.close();

        printWindowRef.current =
            station;
        setActiveRequestId(null);
        setStationRunning(true);
        setMessage(
            "Print station started. Keep the station window open.",
        );
    }

    function stopStation() {
        printWindowRef.current?.close();
        printWindowRef.current =
            null;
        setStationRunning(false);
        setActiveRequestId(null);
        setMessage(
            "Print station stopped.",
        );
    }

    async function saveSettings() {
        setWorking("save");
        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/check-in-printing`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            enabled:
                                settings.enabled,
                            templateId:
                                settings.template_id,
                            copies:
                                settings.copies,
                            printOncePerRegistration:
                                settings.print_once_per_registration,
                            maxManualReprints:
                                settings.max_manual_reprints,
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
                        "Unable to save print settings.",
                );
            }

            setMessage(
                result.message || "",
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save print settings.",
            );
        } finally {
            setWorking("");
        }
    }

    async function action(
        body: Record<
            string,
            unknown
        >,
        key: string,
    ) {
        setWorking(key);
        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/check-in-printing`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            body,
                        ),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Browser print action failed.",
                );
            }

            setMessage(
                result.message || "",
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Browser print action failed.",
            );
        } finally {
            setWorking("");
        }
    }

    if (loading && !data) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] bg-red-50 p-7 text-red-700">
                {message}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">
                    {message}
                </div>
            )}

            <section className="grid gap-5 md:grid-cols-3">
                <Metric
                    label="Station"
                    value={
                        stationRunning
                            ? "Running"
                            : "Stopped"
                    }
                    icon={
                        stationRunning
                            ? MonitorPlay
                            : Square
                    }
                />
                <Metric
                    label="Waiting badges"
                    value={String(
                        pendingCount,
                    )}
                    icon={Clock3}
                />
                <Metric
                    label="Printer support"
                    value="Any installed"
                    icon={Printer}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <aside className="space-y-6">
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                <MonitorPlay
                                    size={22}
                                />
                            </span>
                            <div>
                                <h2 className="text-xl font-black">
                                    Print Station
                                </h2>
                                <p className="text-sm text-slate-500">
                                    One window handles
                                    the queue.
                                </p>
                            </div>
                        </div>

                        {!stationRunning ? (
                            <button
                                type="button"
                                onClick={
                                    startStation
                                }
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-4 font-black text-white"
                            >
                                <MonitorPlay
                                    size={17}
                                />
                                Start Print
                                Station
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={
                                    stopStation
                                }
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-4 font-black text-red-600"
                            >
                                <Square
                                    size={17}
                                />
                                Stop Print
                                Station
                            </button>
                        )}

                        <p className="mt-4 text-sm leading-6 text-slate-500">
                            The browser print dialog
                            will show every printer
                            available on this computer,
                            including USB, Wi-Fi and
                            network printers.
                        </p>
                    </section>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Settings2 className="text-[#4F46E5]" />
                            <h2 className="text-xl font-black">
                                Settings
                            </h2>
                        </div>

                        <div className="mt-5 space-y-4">
                            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                <input
                                    type="checkbox"
                                    checked={
                                        settings.enabled
                                    }
                                    onChange={(event) =>
                                        setSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                enabled:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                    className="accent-[#4F46E5]"
                                />
                                <span className="font-black">
                                    Queue after
                                    successful check-in
                                </span>
                            </label>

                            <select
                                value={
                                    settings.template_id ||
                                    ""
                                }
                                onChange={(event) =>
                                    setSettings(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            template_id:
                                                event
                                                    .target
                                                    .value ||
                                                null,
                                        }),
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold"
                            >
                                <option value="">
                                    Choose badge
                                    template
                                </option>
                                {data.templates.map(
                                    (
                                        template,
                                    ) => (
                                        <option
                                            key={
                                                template.id
                                            }
                                            value={
                                                template.id
                                            }
                                        >
                                            {
                                                template.template_name
                                            }
                                            {template.is_default
                                                ? " — Default"
                                                : ""}
                                        </option>
                                    ),
                                )}
                            </select>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="text-sm font-black text-slate-700">
                                    Copies
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={
                                            settings.copies
                                        }
                                        onChange={(event) =>
                                            setSettings(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    copies:
                                                        Number(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                }),
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
                                    />
                                </label>

                                <label className="text-sm font-black text-slate-700">
                                    Reprint limit
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        value={
                                            settings.max_manual_reprints
                                        }
                                        onChange={(event) =>
                                            setSettings(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,
                                                    max_manual_reprints:
                                                        Number(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                }),
                                            )
                                        }
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
                                    />
                                </label>
                            </div>

                            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                <input
                                    type="checkbox"
                                    checked={
                                        settings.print_once_per_registration
                                    }
                                    onChange={(event) =>
                                        setSettings(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                print_once_per_registration:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                    className="accent-[#4F46E5]"
                                />
                                <span className="text-sm font-black">
                                    Prevent duplicate
                                    automatic badges
                                </span>
                            </label>

                            <button
                                type="button"
                                onClick={() =>
                                    void saveSettings()
                                }
                                disabled={
                                    working ===
                                    "save"
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white disabled:opacity-50"
                            >
                                {working ===
                                "save" ? (
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <CheckCircle2
                                        size={17}
                                    />
                                )}
                                Save Settings
                            </button>
                        </div>
                    </section>
                </aside>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-black">
                                Manual Badge Print
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Add a guest to the same
                                browser print queue.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                void reload()
                            }
                            className="rounded-xl bg-slate-100 p-3"
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

                    <label className="relative mt-5 block">
                        <Search
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={query}
                            onChange={(event) =>
                                setQuery(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Search name, email or department"
                            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4"
                        />
                    </label>

                    <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto">
                        {filteredGuests.map(
                            (guest) => (
                                <article
                                    key={guest.id}
                                    className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#4F46E5]">
                                            <UserRound
                                                size={
                                                    18
                                                }
                                            />
                                        </span>
                                        <div>
                                            <p className="font-black">
                                                {
                                                    guest.full_name
                                                }
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {
                                                    guest.email
                                                }
                                                {guest.department
                                                    ? ` · ${guest.department}`
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void action(
                                                {
                                                    action:
                                                        "reprint",
                                                    registrationId:
                                                        guest.id,
                                                },
                                                `reprint:${guest.id}`,
                                            )
                                        }
                                        disabled={
                                            working ===
                                            `reprint:${guest.id}`
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                                    >
                                        {working ===
                                        `reprint:${guest.id}` ? (
                                            <Loader2
                                                size={
                                                    15
                                                }
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Printer
                                                size={
                                                    15
                                                }
                                            />
                                        )}
                                        Add to Queue
                                    </button>
                                </article>
                            ),
                        )}
                    </div>
                </section>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="text-2xl font-black">
                        Browser Print Queue
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4">
                                    Guest
                                </th>
                                <th className="px-5 py-4">
                                    Type
                                </th>
                                <th className="px-5 py-4">
                                    Copies
                                </th>
                                <th className="px-5 py-4">
                                    Status
                                </th>
                                <th className="px-5 py-4">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.requests.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-10 text-center font-bold text-slate-500"
                                    >
                                        No browser print
                                        requests yet.
                                    </td>
                                </tr>
                            ) : (
                                data.requests.map(
                                    (request) => {
                                        const guest =
                                            one(
                                                request.registrations,
                                            );

                                        return (
                                            <tr
                                                key={
                                                    request.id
                                                }
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-black">
                                                        {guest?.full_name ||
                                                            "Guest"}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {guest?.email ||
                                                            ""}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 capitalize">
                                                    {
                                                        request.request_kind
                                                    }
                                                </td>
                                                <td className="px-5 py-4 font-black">
                                                    {
                                                        request.copies
                                                    }
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge
                                                        status={
                                                            request.status
                                                        }
                                                    />
                                                    {request.reason && (
                                                        <p className="mt-1 max-w-sm text-xs text-red-600">
                                                            {
                                                                request.reason
                                                            }
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex gap-2">
                                                        {[
                                                            "failed",
                                                            "cancelled",
                                                            "presented",
                                                        ].includes(
                                                            request.status,
                                                        ) && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void action(
                                                                        {
                                                                            action:
                                                                                "retry",
                                                                            requestId:
                                                                                request.id,
                                                                        },
                                                                        `retry:${request.id}`,
                                                                    )
                                                                }
                                                                className="rounded-xl bg-indigo-50 p-3 text-[#4F46E5]"
                                                            >
                                                                <RotateCcw
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                            </button>
                                                        )}

                                                        {[
                                                            "pending",
                                                            "claimed",
                                                        ].includes(
                                                            request.status,
                                                        ) && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void action(
                                                                        {
                                                                            action:
                                                                                "cancel",
                                                                            requestId:
                                                                                request.id,
                                                                        },
                                                                        `cancel:${request.id}`,
                                                                    )
                                                                }
                                                                className="rounded-xl bg-red-50 p-3 text-red-600"
                                                            >
                                                                <XCircle
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Printer;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Icon className="text-[#4F46E5]" />
            <p className="mt-4 text-sm font-bold text-slate-500">
                {label}
            </p>
            <p className="mt-2 text-2xl font-black">
                {value}
            </p>
        </div>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const config =
        status === "completed"
            ? {
                  icon: CheckCircle2,
                  className:
                      "bg-emerald-50 text-emerald-700",
              }
            : status === "failed"
              ? {
                    icon: XCircle,
                    className:
                        "bg-red-50 text-red-700",
                }
              : status === "claimed"
                ? {
                      icon: Printer,
                      className:
                          "bg-indigo-50 text-indigo-700",
                  }
                : {
                      icon: Clock3,
                      className:
                          "bg-amber-50 text-amber-700",
                  };

    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black capitalize ${config.className}`}
        >
            <Icon size={13} />
            {status}
        </span>
    );
}

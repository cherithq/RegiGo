"use client";

import {
    BarChart3,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Loader2,
    Printer,
    Search,
    UserCheck,
    UserX,
    Users,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type GuestRow = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    dietaryRequest: string;
    registrationStatus: string;
    rsvpStatus: string;
    guestQuantity: number;
    registeredAt: string;
    checkedIn: boolean;
    checkedInAt: string;
    assignedTable: string;
    invitationStatus: string;
};

type Payload = {
    mode?:
        | "public_registration"
        | "invitation_only";
    rows: GuestRow[];
    counts: {
        total: number;
        checkedIn: number;
        notCheckedIn: number;
        attendanceRate: number;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    error?: string;
};

function formatDate(
    value: string,
) {
    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-SG",
        {
            dateStyle:
                "medium",
            timeStyle:
                "short",
        },
    ).format(
        date,
    );
}

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
                "The reports server returned an invalid response.",
        };
    }
}

export default function EventReportsManager({
    eventId,
}: {
    eventId: string;
}) {
    const [
        data,
        setData,
    ] =
        useState<Payload | null>(
            null,
        );
    const [
        page,
        setPage,
    ] = useState(1);
    const [
        search,
        setSearch,
    ] = useState("");
    const [
        attendance,
        setAttendance,
    ] =
        useState<
            | "all"
            | "checked_in"
            | "not_checked_in"
        >("all");
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
            setLoading(true);
            setMessage("");

            try {
                const params =
                    new URLSearchParams({
                        page:
                            String(
                                page,
                            ),
                        limit:
                            "100",
                        attendance,
                    });

                if (
                    search.trim()
                ) {
                    params.set(
                        "search",
                        search.trim(),
                    );
                }

                const response =
                    await fetch(
                        `/api/events/${encodeURIComponent(
                            eventId,
                        )}/analytics/report-data?${params.toString()}`,
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
                            "Unable to load reports.",
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
                        : "Unable to load reports.",
                );
            } finally {
                setLoading(false);
            }
        }, [
            attendance,
            eventId,
            page,
            search,
        ]);

    useEffect(() => {
        const timer =
            window.setTimeout(
                () => {
                    void load();
                },
                250,
            );

        return () =>
            window.clearTimeout(
                timer,
            );
    }, [load]);

    const exportBase =
        `/api/events/${encodeURIComponent(
            eventId,
        )}/analytics/export?attendance=${encodeURIComponent(
            attendance,
        )}`;

    return (
        <div className="space-y-6">
            {message && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
                    {message}
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                    icon={
                        Users
                    }
                    label="Total Guests"
                    value={
                        data?.counts
                            .total ||
                        0
                    }
                />
                <Stat
                    icon={
                        UserCheck
                    }
                    label="Checked In"
                    value={
                        data?.counts
                            .checkedIn ||
                        0
                    }
                />
                <Stat
                    icon={
                        UserX
                    }
                    label="Not Checked In"
                    value={
                        data?.counts
                            .notCheckedIn ||
                        0
                    }
                />
                <Stat
                    icon={
                        BarChart3
                    }
                    label="Attendance Rate"
                    value={`${data?.counts.attendanceRate || 0}%`}
                />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h2 className="text-2xl font-black">
                            Reports and exports
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Download every report in one file.
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <a
                        href={`${exportBase}&report=all&format=csv`}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white"
                    >
                        <FileDown
                            size={
                                18
                            }
                        />
                        Export All Reports
                    </a>

                    <a
                        href={`${exportBase}&report=all&format=html`}
                        target="_blank"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
                    >
                        <Printer
                            size={
                                18
                            }
                        />
                        Print / Save Full Report as PDF
                    </a>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h2 className="text-2xl font-black">
                            Guest attendance report
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Includes email, check-in time and assigned table.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="relative">
                            <Search
                                size={
                                    17
                                }
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={
                                    search
                                }
                                onChange={(
                                    event,
                                ) => {
                                    setSearch(
                                        event.target
                                            .value,
                                    );
                                    setPage(
                                        1,
                                    );
                                }}
                                placeholder="Search guests"
                                className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 sm:w-72"
                            />
                        </label>

                        <select
                            value={
                                attendance
                            }
                            onChange={(
                                event,
                            ) => {
                                setAttendance(
                                    event.target
                                        .value as typeof attendance,
                                );
                                setPage(
                                    1,
                                );
                            }}
                            className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold"
                        >
                            <option value="all">
                                All Guests
                            </option>
                            <option value="checked_in">
                                Checked In
                            </option>
                            <option value="not_checked_in">
                                Not Checked In
                            </option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-[1050px] w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">
                                    Guest
                                </th>
                                <th className="px-4 py-3">
                                    Email
                                </th>
                                <th className="px-4 py-3">
                                    Department
                                </th>
                                <th className="px-4 py-3">
                                    Status
                                </th>
                                <th className="px-4 py-3">
                                    Checked-In At
                                </th>
                                <th className="px-4 py-3">
                                    Assigned Table
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {data?.rows.map(
                                (
                                    guest,
                                ) => (
                                    <tr
                                        key={
                                            guest.id
                                        }
                                        className="border-t border-slate-100"
                                    >
                                        <td className="px-4 py-4">
                                            <p className="font-black">
                                                {
                                                    guest.fullName
                                                }
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {
                                                    guest.phone ||
                                                    "-"
                                                }
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            {
                                                guest.email ||
                                                "-"
                                            }
                                        </td>
                                        <td className="px-4 py-4">
                                            {
                                                guest.department ||
                                                "-"
                                            }
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
                                                    guest.checkedIn
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-amber-50 text-amber-700"
                                                }`}
                                            >
                                                {guest.checkedIn ? (
                                                    <CheckCircle2
                                                        size={
                                                            14
                                                        }
                                                    />
                                                ) : (
                                                    <UserX
                                                        size={
                                                            14
                                                        }
                                                    />
                                                )}
                                                {guest.checkedIn
                                                    ? "Checked In"
                                                    : "Not Checked In"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {
                                                formatDate(
                                                    guest.checkedInAt,
                                                )
                                            }
                                        </td>
                                        <td className="px-4 py-4 font-bold">
                                            {
                                                guest.assignedTable ||
                                                "Unassigned"
                                            }
                                        </td>
                                    </tr>
                                ),
                            )}

                            {!loading &&
                                (
                                    data?.rows
                                        .length ||
                                    0
                                ) ===
                                    0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                6
                                            }
                                            className="px-4 py-12 text-center font-bold text-slate-400"
                                        >
                                            No guests match the report filters.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>

                    {loading && (
                        <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-8 font-bold text-slate-500">
                            <Loader2 className="animate-spin" />
                            Loading report…
                        </div>
                    )}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-slate-500">
                        Page{" "}
                        {
                            data?.pagination
                                .page ||
                            1
                        }{" "}
                        of{" "}
                        {
                            data?.pagination
                                .totalPages ||
                            1
                        }{" "}
                        ·{" "}
                        {
                            data?.pagination
                                .total ||
                            0
                        }{" "}
                        results
                    </p>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={
                                loading ||
                                (
                                    data?.pagination
                                        .page ||
                                    1
                                ) <=
                                    1
                            }
                            onClick={() =>
                                setPage(
                                    (
                                        current,
                                    ) =>
                                        Math.max(
                                            1,
                                            current -
                                                1,
                                        ),
                                )
                            }
                            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-100 px-4 font-black text-slate-700 disabled:opacity-40"
                        >
                            <ChevronLeft
                                size={
                                    17
                                }
                            />
                            Previous
                        </button>

                        <button
                            type="button"
                            disabled={
                                loading ||
                                (
                                    data?.pagination
                                        .page ||
                                    1
                                ) >=
                                    (
                                        data?.pagination
                                            .totalPages ||
                                        1
                                    )
                            }
                            onClick={() =>
                                setPage(
                                    (
                                        current,
                                    ) =>
                                        current +
                                        1,
                                )
                            }
                            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 font-black text-white disabled:opacity-40"
                        >
                            Next
                            <ChevronRight
                                size={
                                    17
                                }
                            />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon:
        typeof Users;
    label: string;
    value:
        | string
        | number;
}) {
    return (
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon
                    size={
                        20
                    }
                />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500">
                {
                    label
                }
            </p>
            <p className="mt-1 text-3xl font-black">
                {typeof value ===
                "number"
                    ? value.toLocaleString()
                    : value}
            </p>
        </article>
    );
}


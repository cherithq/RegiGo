"use client";

import Link from "next/link";
import {
    BarChart3,
    Building2,
    CheckCircle2,
    Clock3,
    FileBarChart,
    FileDown,
    Loader2,
    MailCheck,
    MailOpen,
    Printer,
    RefreshCw,
    Send,
    TableProperties,
    UserCheck,
    UserMinus,
    UserX,
    Users,
    Utensils,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type Point = {
    date: string;
    label: string;
    value: number;
};

type Breakdown = {
    label: string;
    value: number;
    percentage?:
        number;
};

type FieldChoice = {
    value: string;
    count: number;
    percentage: number;
};

type FieldAnalytics = {
    id: string;
    label: string;
    type: string;
    answered: number;
    unanswered: number;
    completionRate: number;
    choices:
        FieldChoice[];
    isFreeText: boolean;
};

type SeatingTable = {
    tableName: string;
    capacity: number;
    assigned: number;
    available: number;
    occupancyRate: number;
};

type Payload = {
    mode:
        | "public_registration"
        | "invitation_only";
    event: {
        id: string;
        event_name:
            | string
            | null;
    };
    form?: {
        form_title:
            | string
            | null;
    } | null;
    headline:
        Record<
            string,
            number
        >;
    attendance: {
        totalGuests: number;
        guestQuantity: number;
        checkedIn: number;
        notCheckedIn: number;
        attendanceRate: number;
    };
    timeline:
        Point[];
    statusBreakdown:
        Breakdown[];
    departmentBreakdown:
        Breakdown[];
    dietaryBreakdown:
        Breakdown[];
    seating: {
        totalTables: number;
        assignedGuests: number;
        unassignedGuests: number;
        tables:
            SeatingTable[];
    };
    fields?:
        FieldAnalytics[];
    reportLinks: {
        fullReport: string;
        guestCsv: string;
        attendanceCsv: string;
        formCsv: string;
        invitationCsv: string;
        seatingCsv: string;
        allCsv: string;
        printReport: string;
    };
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
                response.status ===
                404
                    ? "The updated analytics API route is missing."
                    : `Invalid analytics response (HTTP ${response.status}).`,
        };
    }
}

function pct(
    value: number,
) {
    return `${Number(
        value ||
            0,
    ).toLocaleString(
        "en-SG",
        {
            maximumFractionDigits:
                1,
        },
    )}%`;
}

export default function EventAnalyticsDashboard({
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
                const response =
                    await fetch(
                        `/api/events/${encodeURIComponent(
                            eventId,
                        )}/analytics`,
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
                            "Unable to load analytics.",
                    );
                }

                setData(
                    result as Payload,
                );
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load analytics.",
                );
            } finally {
                setLoading(false);
            }
        }, [eventId]);

    useEffect(() => {
        void load();
    }, [load]);

    const maxTimeline =
        useMemo(
            () =>
                Math.max(
                    1,
                    ...(
                        data?.timeline ||
                        []
                    ).map(
                        (
                            item,
                        ) =>
                            item.value,
                    ),
                ),
            [data],
        );

    if (
        loading &&
        !data
    ) {
        return (
            <div className="flex min-h-[460px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 font-bold text-red-700">
                {message ||
                    "Analytics could not be loaded."}
            </div>
        );
    }

    const invitationMode =
        data.mode ===
        "invitation_only";
    const modeCards =
        invitationMode
            ? [
                  [
                      "Invitations Sent",
                      data.headline
                          .sent,
                      Send,
                  ],
                  [
                      "Opened",
                      data.headline
                          .opened,
                      MailOpen,
                  ],
                  [
                      "Accepted",
                      data.headline
                          .accepted,
                      UserCheck,
                  ],
                  [
                      "Declined",
                      data.headline
                          .declined,
                      UserMinus,
                  ],
                  [
                      "Pending",
                      data.headline
                          .pending,
                      Clock3,
                  ],
                  [
                      "Response Rate",
                      pct(
                          data.headline
                              .responseRate,
                      ),
                      MailCheck,
                  ],
              ]
            : [
                  [
                      "Registrations",
                      data.headline
                          .totalRegistrations,
                      Users,
                  ],
                  [
                      "Guest Quantity",
                      data.headline
                          .guestQuantity,
                      Users,
                  ],
                  [
                      "Confirmed",
                      data.headline
                          .confirmed,
                      CheckCircle2,
                  ],
                  [
                      "Pending",
                      data.headline
                          .pending,
                      Clock3,
                  ],
                  [
                      "Checked In",
                      data.headline
                          .checkedIn,
                      UserCheck,
                  ],
                  [
                      "Capacity Used",
                      pct(
                          data.headline
                              .capacityUsed,
                      ),
                      BarChart3,
                  ],
              ];

    return (
        <div className="space-y-6">
            {message && (
                <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
                    {
                        message
                    }
                </div>
            )}

            <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-400">
                        {data.event.event_name || "Event"}
                    </p>

                    <span
                        className={`mt-2 inline-flex rounded-full px-4 py-2 text-xs font-black ${
                            invitationMode
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {invitationMode
                            ? "Invitation & RSVP Analytics"
                            : "Public Registration Analytics"}
                    </span>

                    <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                        {invitationMode
                            ? "Based on invitations sent"
                            : `Based on ${data.form?.form_title || "the registration form"}`}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        {invitationMode
                            ? "Tracks invitations, opens, RSVP responses, attendance and seating."
                            : "Tracks registrations, Registration Builder answers, attendance and seating."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void load()
                    }
                    disabled={
                        loading
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 disabled:opacity-60"
                >
                    <RefreshCw
                        size={
                            17
                        }
                        className={
                            loading
                                ? "animate-spin"
                                : ""
                        }
                    />
                    Refresh
                </button>
            </section>

            <div>
                <h3 className="text-xl font-black">
                    Overview
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                    {invitationMode
                        ? "Headline numbers across every invitation sent for this event."
                        : "Headline numbers across every registration for this event."}
                </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {modeCards.map(
                    ([
                        label,
                        value,
                        Icon,
                    ]) => (
                        <Metric
                            key={
                                String(
                                    label,
                                )
                            }
                            icon={
                                Icon as typeof Users
                            }
                            label={
                                String(
                                    label,
                                )
                            }
                            value={
                                value as
                                    | string
                                    | number
                            }
                        />
                    ),
                )}
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                    <h3 className="text-xl font-black">
                        Attendance overview
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Previous attendance metrics are retained for both registration and invitation events.
                    </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                        icon={
                            Users
                        }
                        label="Total Guests"
                        value={
                            data.attendance
                                .totalGuests
                        }
                        compact
                    />
                    <Metric
                        icon={
                            UserCheck
                        }
                        label="Checked In"
                        value={
                            data.attendance
                                .checkedIn
                        }
                        compact
                    />
                    <Metric
                        icon={
                            UserX
                        }
                        label="Not Checked In"
                        value={
                            data.attendance
                                .notCheckedIn
                        }
                        compact
                    />
                    <Metric
                        icon={
                            BarChart3
                        }
                        label="Attendance Rate"
                        value={pct(
                            data.attendance
                                .attendanceRate,
                        )}
                        compact
                    />
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
                <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-xl font-black">
                        Last 14 days
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        {invitationMode
                            ? "Invitations sent"
                            : "Guest quantity registered"}
                    </p>

                    <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto pb-2">
                        {data.timeline.map(
                            (
                                point,
                            ) => (
                                <div
                                    key={
                                        point.date
                                    }
                                    className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2"
                                >
                                    <span className="text-xs font-black text-slate-500">
                                        {
                                            point.value
                                        }
                                    </span>

                                    <div
                                        className="w-full rounded-t-xl bg-gradient-to-t from-[#4F46E5] to-[#EC4899]"
                                        style={{
                                            height:
                                                `${Math.max(
                                                    4,
                                                    (
                                                        point.value /
                                                        maxTimeline
                                                    ) *
                                                        180,
                                                )}px`,
                                        }}
                                    />

                                    <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">
                                        {
                                            point.label
                                        }
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                </article>

                <BreakdownCard
                    title="Status breakdown"
                    items={
                        data.statusBreakdown
                    }
                />
            </section>

            <section className="flex flex-wrap gap-6">
                {data.departmentBreakdown.length > 0 && (
                    <div className="min-w-[280px] flex-1">
                        <BreakdownCard
                            title="Department breakdown"
                            icon={
                                Building2
                            }
                            items={
                                data.departmentBreakdown
                            }
                        />
                    </div>
                )}

                {data.dietaryBreakdown.length > 0 && (
                    <div className="min-w-[280px] flex-1">
                        <BreakdownCard
                            title="Dietary requirements"
                            icon={
                                Utensils
                            }
                            items={
                                data.dietaryBreakdown
                            }
                        />
                    </div>
                )}

                <article className="min-w-[280px] flex-1 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                        <TableProperties className="text-[#4F46E5]" />
                        <h3 className="text-xl font-black">
                            Seating overview
                        </h3>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                        <SmallMetric
                            label="Tables"
                            value={
                                data.seating
                                    .totalTables
                            }
                        />
                        <SmallMetric
                            label="Assigned"
                            value={
                                data.seating
                                    .assignedGuests
                            }
                        />
                        <SmallMetric
                            label="Unassigned"
                            value={
                                data.seating
                                    .unassignedGuests
                            }
                        />
                    </div>

                    <div className="mt-5 space-y-3">
                        {data.seating.tables
                            .slice(
                                0,
                                6,
                            )
                            .map(
                                (
                                    table,
                                ) => (
                                    <div
                                        key={
                                            table.tableName
                                        }
                                    >
                                        <div className="flex justify-between gap-3 text-sm">
                                            <span className="truncate font-bold text-slate-600">
                                                {
                                                    table.tableName
                                                }
                                            </span>
                                            <span className="font-black">
                                                {
                                                    table.assigned
                                                }
                                                /
                                                {
                                                    table.capacity
                                                }
                                            </span>
                                        </div>

                                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-[#4F46E5]"
                                                style={{
                                                    width:
                                                        `${Math.min(
                                                            100,
                                                            table.occupancyRate,
                                                        )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ),
                            )}

                        {data.seating.tables
                            .length ===
                            0 && (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400">
                                No seating tables configured.
                            </p>
                        )}
                    </div>
                </article>
            </section>

            {!invitationMode &&
                (
                    data.fields ||
                    []
                ).length >
                    0 && (
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h3 className="text-xl font-black">
                            Registration form responses
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                            Generated from fields configured in the Registration Builder.
                        </p>

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {(
                                data.fields ||
                                []
                            ).map(
                                (
                                    field,
                                ) => (
                                    <article
                                        key={
                                            field.id
                                        }
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-black">
                                                    {
                                                        field.label
                                                    }
                                                </p>
                                                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                    {
                                                        field.type
                                                    }
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#4F46E5]">
                                                {pct(
                                                    field.completionRate,
                                                )}{" "}
                                                answered
                                            </span>
                                        </div>

                                        {field.isFreeText ||
                                        field.choices
                                            .length ===
                                            0 ? (
                                            <div className="mt-5 grid grid-cols-2 gap-3">
                                                <SmallMetric
                                                    label="Answered"
                                                    value={
                                                        field.answered
                                                    }
                                                />
                                                <SmallMetric
                                                    label="Blank"
                                                    value={
                                                        field.unanswered
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            <div className="mt-5 space-y-3">
                                                {field.choices.map(
                                                    (
                                                        choice,
                                                    ) => (
                                                        <div
                                                            key={
                                                                choice.value
                                                            }
                                                        >
                                                            <div className="flex justify-between gap-3 text-sm">
                                                                <span className="truncate font-bold text-slate-600">
                                                                    {
                                                                        choice.value
                                                                    }
                                                                </span>
                                                                <span className="font-black">
                                                                    {
                                                                        choice.count
                                                                    }
                                                                </span>
                                                            </div>

                                                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
                                                                <div
                                                                    className="h-full rounded-full bg-[#EC4899]"
                                                                    style={{
                                                                        width:
                                                                            `${Math.max(
                                                                                2,
                                                                                choice.percentage,
                                                                            )}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </article>
                                ),
                            )}
                        </div>
                    </section>
                )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <FileBarChart
                                size={
                                    16
                                }
                            />
                            Reports & Exports
                        </div>

                        <h3 className="mt-4 text-2xl font-black">
                            Previous reports restored
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            View checked-in and not-checked-in guest lists, emails, check-in times, assigned tables and export all report data.
                        </p>
                    </div>

                    <Link
                        href={
                            data.reportLinks
                                .fullReport
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-black text-white"
                    >
                        <FileBarChart
                            size={
                                18
                            }
                        />
                        View Full Reports
                    </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <a
                        href={
                            data.reportLinks
                                .allCsv
                        }
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
                        href={
                            data.reportLinks
                                .printReport
                        }
                        target="_blank"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                    >
                        <Printer
                            size={
                                18
                            }
                        />
                        Print / Save Report as PDF
                    </a>
                </div>
            </section>
        </div>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
    compact = false,
}: {
    icon:
        typeof Users;
    label: string;
    value:
        | string
        | number;
    compact?: boolean;
}) {
    return (
        <article
            className={
                compact
                    ? "rounded-2xl bg-slate-50 p-4"
                    : "rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
            }
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon
                    size={
                        19
                    }
                />
            </div>

            <p className="mt-3 text-sm font-bold text-slate-500">
                {
                    label
                }
            </p>

            <p className="mt-1 text-2xl font-black sm:text-3xl">
                {typeof value ===
                "number"
                    ? value.toLocaleString()
                    : value}
            </p>
        </article>
    );
}

function BreakdownCard({
    title,
    items,
    icon: Icon,
    emptyText = "No data available",
}: {
    title: string;
    items:
        Breakdown[];
    icon?:
        typeof Building2;
    emptyText?: string;
}) {
    const total =
        Math.max(
            1,
            items.reduce(
                (
                    sum,
                    item,
                ) =>
                    sum +
                    item.value,
                0,
            ),
        );

    return (
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
                {Icon && (
                    <Icon className="text-[#4F46E5]" />
                )}

                <h3 className="text-xl font-black">
                    {
                        title
                    }
                </h3>
            </div>

            <div className="mt-5 space-y-4">
                {items.map(
                    (
                        item,
                    ) => (
                        <div
                            key={
                                item.label
                            }
                        >
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-bold text-slate-600">
                                    {
                                        item.label
                                    }
                                </span>

                                <span className="font-black">
                                    {
                                        item.value
                                    }
                                </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-[#4F46E5]"
                                    style={{
                                        width:
                                            `${Math.max(
                                                2,
                                                (
                                                    item.value /
                                                    total
                                                ) *
                                                    100,
                                            )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ),
                )}

                {items.length ===
                    0 && (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400">
                        {
                            emptyText
                        }
                    </p>
                )}
            </div>
        </article>
    );
}

function SmallMetric({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {
                    label
                }
            </p>
            <p className="mt-1 text-xl font-black">
                {
                    value.toLocaleString()
                }
            </p>
        </div>
    );
}


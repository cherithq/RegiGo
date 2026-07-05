import Link from "next/link";
import {
    ArrowLeft,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock3,
    PieChart,
    Table2,
    Users,
    Utensils,
    Building2,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Registration = {
    id: string;
    full_name: string;
    email: string;
    department: string | null;
    dietary_request: string | null;
    registration_status: string | null;
    created_at: string | null;
};

type CheckIn = {
    id: string;
    registration_id: string | null;
    event_id: string | null;
    scan_result: string;
    checked_in_at: string | null;
};

type EventTable = {
    id: string;
    event_id: string | null;
    table_name: string;
    table_capacity: number | null;
};

type TableAssignment = {
    id: string;
    table_id: string | null;
    registration_id: string | null;
    event_id: string | null;
};

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
        return (
            <div className="rounded-[2rem] border border-red-100 bg-red-50 p-8">
                <Link
                    href="/dashboard/events"
                    className="inline-flex items-center gap-2 text-sm font-black text-red-700"
                >
                    <ArrowLeft size={16} />
                    Back to Events
                </Link>

                <h1 className="mt-6 text-3xl font-black text-red-800">
                    Event not found
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-red-700">
                    This event does not exist, or your account does not have permission to
                    access it.
                </p>
            </div>
        );
    }

    const { data: guests, error: guestsError } = await supabaseServer
        .from("registrations")
        .select(
            "id, full_name, email, department, dietary_request, registration_status, created_at"
        )
        .eq("event_id", eventId);

    const { data: checkIns, error: checkInsError } = await supabaseServer
        .from("check_ins")
        .select("id, registration_id, event_id, scan_result, checked_in_at")
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in");

    const { data: tables, error: tablesError } = await supabaseServer
        .from("tables")
        .select("id, event_id, table_name, table_capacity")
        .eq("event_id", eventId);

    const { data: assignments, error: assignmentsError } = await supabaseServer
        .from("table_assignments")
        .select("id, table_id, registration_id, event_id")
        .eq("event_id", eventId);

    const guestList = (guests || []) as Registration[];
    const checkInList = (checkIns || []) as CheckIn[];
    const tableList = (tables || []) as EventTable[];
    const assignmentList = (assignments || []) as TableAssignment[];

    const totalGuests = guestList.length;
    const checkedIn = checkInList.length;
    const notCheckedIn = Math.max(totalGuests - checkedIn, 0);

    const attendanceRate =
        totalGuests > 0 ? Math.round((checkedIn / totalGuests) * 100) : 0;

    const dietarySummary = countBy(guestList, "dietary_request");
    const departmentSummary = countBy(guestList, "department");

    const totalCapacity = tableList.reduce(
        (sum, table) => sum + Number(table.table_capacity || 0),
        0
    );

    const assignedSeats = assignmentList.length;

    const seatingRate =
        totalCapacity > 0 ? Math.round((assignedSeats / totalCapacity) * 100) : 0;

    const errors = [
        guestsError ? `Guests: ${guestsError.message}` : null,
        checkInsError ? `Check-ins: ${checkInsError.message}` : null,
        tablesError ? `Tables: ${tablesError.message}` : null,
        assignmentsError ? `Assignments: ${assignmentsError.message}` : null,
    ].filter(Boolean);

    return (
        <div className="space-y-8">
            <Link
                href={`/dashboard/events/${eventId}`}
                className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] hover:text-[#EC4899]"
            >
                <ArrowLeft size={16} />
                Back to Event
            </Link>

            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <BarChart3 size={16} />
                            Event Analytics
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Analytics
                        </h1>

                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            Review guest registrations, attendance performance, department
                            breakdowns, dietary requirements, and table occupancy for{" "}
                            <span className="font-black text-slate-950">
                                {event.event_name}
                            </span>
                            .
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                                {formatDate(event.event_date)}
                            </span>

                            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                                {attendanceRate}% attendance
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/dashboard/events/${eventId}/reports`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                    >
                        View Reports
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            {errors.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5" size={18} />
                        <div>
                            <p className="font-black">Some analytics could not be loaded.</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {errors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Guests"
                    value={totalGuests}
                    subtitle="Total registrations submitted"
                    icon={Users}
                />

                <StatCard
                    title="Checked In"
                    value={checkedIn}
                    subtitle="Guests who have arrived"
                    icon={CheckCircle2}
                />

                <StatCard
                    title="Not Checked In"
                    value={notCheckedIn}
                    subtitle="Registered guests pending arrival"
                    icon={Clock3}
                />

                <ProgressStatCard
                    title="Attendance Rate"
                    value={attendanceRate}
                    subtitle={`${checkedIn} of ${totalGuests} guests checked in`}
                    icon={PieChart}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <SummaryCard
                    title="Dietary Requirements"
                    subtitle="Guest dietary needs based on registration form responses."
                    icon={Utensils}
                >
                    {Object.keys(dietarySummary).length > 0 ? (
                        Object.entries(dietarySummary).map(([label, value]) => (
                            <Bar
                                key={label}
                                label={label || "Not stated"}
                                value={value}
                                total={totalGuests}
                            />
                        ))
                    ) : (
                        <EmptyMini text="No dietary information available yet." />
                    )}
                </SummaryCard>

                <SummaryCard
                    title="Department Breakdown"
                    subtitle="Guest distribution grouped by department."
                    icon={Building2}
                >
                    {Object.keys(departmentSummary).length > 0 ? (
                        Object.entries(departmentSummary).map(([label, value]) => (
                            <Bar
                                key={label}
                                label={label || "Not stated"}
                                value={value}
                                total={totalGuests}
                            />
                        ))
                    ) : (
                        <EmptyMini text="No department information available yet." />
                    )}
                </SummaryCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-950">
                                Seating Overview
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Overall occupancy across all event tables.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                            <Table2 size={24} />
                        </div>
                    </div>

                    <div className="mt-8">
                        <p className="text-5xl font-black text-slate-950">
                            {seatingRate}%
                        </p>

                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                style={{ width: `${seatingRate}%` }}
                            />
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <MiniMetric label="Assigned Seats" value={assignedSeats} />
                            <MiniMetric label="Total Capacity" value={totalCapacity} />
                        </div>
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-950">
                                Table Occupancy
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                See how many guests have been assigned to each table.
                            </p>
                        </div>

                        <Link
                            href={`/dashboard/events/${eventId}/tables`}
                            className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] hover:text-[#EC4899]"
                        >
                            Manage Tables
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {tableList.length > 0 ? (
                            tableList.map((table) => {
                                const seated = assignmentList.filter(
                                    (assignment) => assignment.table_id === table.id
                                ).length;

                                const capacity = Number(table.table_capacity || 0);
                                const percent =
                                    capacity > 0 ? Math.round((seated / capacity) * 100) : 0;

                                return (
                                    <TableCard
                                        key={table.id}
                                        tableName={table.table_name}
                                        seated={seated}
                                        capacity={capacity}
                                        percent={percent}
                                    />
                                );
                            })
                        ) : (
                            <div className="col-span-full">
                                <EmptyState
                                    title="No tables created yet"
                                    text="Create tables first to start tracking table occupancy."
                                    href={`/dashboard/events/${eventId}/tables`}
                                    action="Create Tables"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

function countBy<T extends Record<string, any>>(items: T[], key: keyof T) {
    return items.reduce((acc: Record<string, number>, item) => {
        const value = item[key] || "Not stated";
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
}: {
    title: string;
    value: number | string;
    subtitle: string;
    icon: LucideIcon;
}) {
    return (
        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between">
                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] transition group-hover:bg-[#4F46E5] group-hover:text-white">
                    <Icon size={24} />
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    Live
                </span>
            </div>

            <p className="mt-6 text-sm font-bold text-slate-500">{title}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
    );
}

function ProgressStatCard({
    title,
    value,
    subtitle,
    icon: Icon,
}: {
    title: string;
    value: number;
    subtitle: string;
    icon: LucideIcon;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] w-fit">
                <Icon size={24} />
            </div>

            <p className="mt-6 text-sm font-bold text-slate-500">{title}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {value}%
            </p>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                    style={{ width: `${value}%` }}
                />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
    );
}

function SummaryCard({
    title,
    subtitle,
    icon: Icon,
    children,
}: {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                    <Icon size={24} />
                </div>

                <div>
                    <h2 className="text-2xl font-black text-slate-950">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
                </div>
            </div>

            <div className="mt-6 space-y-5">{children}</div>
        </div>
    );
}

function Bar({
    label,
    value,
    total,
}: {
    label: string;
    value: number;
    total: number;
}) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div>
            <div className="flex items-center justify-between gap-4 text-sm font-bold">
                <span className="line-clamp-1 text-slate-700">{label}</span>
                <span className="shrink-0 text-slate-500">
                    {value} ({percent}%)
                </span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

function TableCard({
    tableName,
    seated,
    capacity,
    percent,
}: {
    tableName: string;
    seated: number;
    capacity: number;
    percent: number;
}) {
    const status =
        capacity === 0
            ? "No capacity"
            : seated >= capacity
                ? "Full"
                : seated === 0
                    ? "Empty"
                    : "Open";

    const statusStyle =
        status === "Full"
            ? "bg-red-50 text-red-700"
            : status === "Open"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600";

    return (
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-lg font-black text-slate-950">{tableName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {seated}/{capacity} seated
                    </p>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle}`}
                >
                    {status}
                </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                    style={{ width: `${percent}%` }}
                />
            </div>

            <p className="mt-3 text-right text-xs font-black text-slate-500">
                {percent}% occupied
            </p>
        </div>
    );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
    );
}

function EmptyMini({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
            {text}
        </div>
    );
}

function EmptyState({
    title,
    text,
    href,
    action,
}: {
    title: string;
    text: string;
    href?: string;
    action?: string;
}) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm">
                <Table2 size={26} />
            </div>

            <p className="mt-4 font-black text-slate-950">{title}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {text}
            </p>

            {href && action && (
                <Link
                    href={href}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg"
                >
                    {action}
                    <ArrowRight size={16} />
                </Link>
            )}
        </div>
    );
}

function formatDate(date: string | null) {
    if (!date) {
        return "No date added";
    }

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
}
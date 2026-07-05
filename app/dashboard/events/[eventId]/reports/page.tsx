import Link from "next/link";
import {
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Clock3,
    Download,
    Mail,
    Phone,
    Table2,
    UserCheck,
    UserX,
    Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ExportGuestsButton from "@/components/reports/ExportGuestsButton";
import { requirePermission } from "@/lib/permissions";

type Guest = {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    department?: string | null;
    created_at?: string | null;
    [key: string]: any;
};

type CheckIn = {
    id: string;
    registration_id: string | null;
    checked_in_at?: string | null;
    created_at?: string | null;
};

type TableAssignment = {
    id: string;
    registration_id: string | null;
    table_id: string | null;
};

type EventTable = {
    id: string;
    table_name: string;
};

export default async function ReportsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    await requirePermission("can_manage_reports");

    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("full_name", { ascending: true });

    const { data: checkIns } = await supabaseServer
        .from("check_ins")
        .select("*")
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in");

    const { data: form } = await supabaseServer
        .from("registration_forms")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    const { data: fields } = await supabaseServer
        .from("registration_fields")
        .select("*")
        .eq("form_id", form?.id)
        .order("sort_order", { ascending: true });

    const { data: assignments } = await supabaseServer
        .from("table_assignments")
        .select("id, registration_id, table_id")
        .eq("event_id", eventId);

    const { data: tables } = await supabaseServer
        .from("tables")
        .select("id, table_name")
        .eq("event_id", eventId);

    const guestList = (guests || []) as Guest[];
    const checkInList = (checkIns || []) as CheckIn[];
    const assignmentList = (assignments || []) as TableAssignment[];
    const tableList = (tables || []) as EventTable[];

    const checkInMap = new Map<string, CheckIn>();

    checkInList.forEach((item) => {
        if (item.registration_id) {
            checkInMap.set(item.registration_id, item);
        }
    });

    const checkedInGuests = guestList.filter((guest) => checkInMap.has(guest.id));
    const notCheckedInGuests = guestList.filter(
        (guest) => !checkInMap.has(guest.id)
    );

    const total = guestList.length;
    const checkedIn = checkedInGuests.length;
    const pending = notCheckedInGuests.length;
    const checkedInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    function getAssignedTable(registrationId: string) {
        const assignment = assignmentList.find(
            (item) => item.registration_id === registrationId
        );

        if (!assignment?.table_id) {
            return "No table assigned";
        }

        const table = tableList.find((item) => item.id === assignment.table_id);

        return table?.table_name || "No table assigned";
    }

    function getCheckInTime(registrationId: string) {
        const checkIn = checkInMap.get(registrationId);

        return checkIn?.checked_in_at || checkIn?.created_at || null;
    }

    const exportGuests = [
        ...checkedInGuests.map((guest) => ({
            ...guest,
            checkin_status: "Checked In",
            checked_in_at: getCheckInTime(guest.id) || "",
            assigned_table: getAssignedTable(guest.id),
        })),
        ...notCheckedInGuests.map((guest) => ({
            ...guest,
            checkin_status: "Not Checked In",
            checked_in_at: "",
            assigned_table: getAssignedTable(guest.id),
        })),
    ];

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <BarChart3 size={16} />
                                Event Reports
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Reports
                            </h1>

                            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                                View checked-in and not checked-in guests for{" "}
                                <span className="font-black text-slate-950">
                                    {event.event_name}
                                </span>
                                .
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                href={`/dashboard/events/${eventId}/analytics`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-[#F7F5FF] hover:text-[#4F46E5]"
                            >
                                <BarChart3 size={17} />
                                Analytics
                            </Link>

                            <div className="inline-flex items-center gap-2">
                                <Download size={17} className="hidden text-[#4F46E5]" />
                                <ExportGuestsButton
                                    guests={exportGuests}
                                    fields={fields || []}
                                    filename={`${event.event_slug}-guest-report.csv`}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Registered"
                        value={total}
                        text="All submitted registrations"
                        icon={Users}
                    />

                    <StatCard
                        title="Checked In"
                        value={checkedIn}
                        text="Guests already verified"
                        icon={CheckCircle2}
                    />

                    <StatCard
                        title="Not Checked In"
                        value={pending}
                        text="Guests pending arrival"
                        icon={Clock3}
                    />

                    <ProgressCard
                        title="Attendance Rate"
                        value={checkedInRate}
                        text={`${checkedIn} of ${total} guests checked in`}
                    />
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-2">
                    <GuestList
                        title="Not Checked In"
                        guests={notCheckedInGuests}
                        emptyText="All guests have checked in."
                        type="pending"
                        getAssignedTable={getAssignedTable}
                        getCheckInTime={getCheckInTime}
                    />

                    <GuestList
                        title="Checked In"
                        guests={checkedInGuests}
                        emptyText="No guests checked in yet."
                        type="checked"
                        getAssignedTable={getAssignedTable}
                        getCheckInTime={getCheckInTime}
                    />
                </section>
            </div>
        </main>
    );
}

function StatCard({
    title,
    value,
    text,
    icon: Icon,
}: {
    title: string;
    value: number;
    text: string;
    icon: any;
}) {
    return (
        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="w-fit rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] transition group-hover:bg-[#4F46E5] group-hover:text-white">
                <Icon size={24} />
            </div>

            <p className="mt-6 text-sm font-bold text-slate-500">{title}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}

function ProgressCard({
    title,
    value,
    text,
}: {
    title: string;
    value: number;
    text: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="w-fit rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                <BarChart3 size={24} />
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

            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}

function GuestList({
    title,
    guests,
    emptyText,
    type,
    getAssignedTable,
    getCheckInTime,
}: {
    title: string;
    guests: Guest[];
    emptyText: string;
    type: "pending" | "checked";
    getAssignedTable: (registrationId: string) => string;
    getCheckInTime: (registrationId: string) => string | null;
}) {
    const isChecked = type === "checked";

    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <div
                        className={`rounded-2xl p-3 ${isChecked
                                ? "bg-green-50 text-green-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                    >
                        {isChecked ? <UserCheck size={24} /> : <UserX size={24} />}
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            {isChecked
                                ? "Guests who have been checked in."
                                : "Guests who have not checked in yet."}
                        </p>
                    </div>
                </div>

                <span
                    className={`rounded-full px-4 py-2 text-sm font-black ${isChecked
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                >
                    {guests.length} guest{guests.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="mt-6 max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {guests.length === 0 ? (
                    <p className="rounded-2xl bg-[#F7F5FF] p-5 text-center font-semibold text-slate-500">
                        {emptyText}
                    </p>
                ) : (
                    guests.map((guest) => (
                        <GuestRow
                            key={guest.id}
                            guest={guest}
                            type={type}
                            tableName={getAssignedTable(guest.id)}
                            checkInTime={getCheckInTime(guest.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function GuestRow({
    guest,
    type,
    tableName,
    checkInTime,
}: {
    guest: Guest;
    type: "pending" | "checked";
    tableName: string;
    checkInTime: string | null;
}) {
    const isChecked = type === "checked";

    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-[#F7F5FF]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black text-slate-950">
                            {guest.full_name || "Unnamed Guest"}
                        </p>

                        <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${isChecked
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                        >
                            {isChecked ? "Checked In" : "Not Checked In"}
                        </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500">
                        <p className="inline-flex items-center gap-2">
                            <Mail size={14} />
                            {guest.email || "No email"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                            <Phone size={14} />
                            {guest.phone || "No phone"}
                        </p>

                        <p className="inline-flex items-center gap-2">
                            <Table2 size={14} />
                            {tableName}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-3 text-left md:text-right">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        {isChecked ? "Checked-in Time" : "Registered At"}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-600">
                        {isChecked
                            ? formatDateTime(checkInTime)
                            : formatDateTime(guest.created_at || null)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function formatDateTime(value: string | null) {
    if (!value) return "-";

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}
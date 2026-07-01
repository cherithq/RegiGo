import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <div>Event not found.</div>;

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId);

    const { data: checkIns } = await supabaseServer
        .from("check_ins")
        .select("*")
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in");

    const { data: tables } = await supabaseServer
        .from("event_tables")
        .select("*")
        .eq("event_id", eventId);

    const { data: assignments } = await supabaseServer
        .from("table_assignments")
        .select("*")
        .eq("event_id", eventId);

    const totalGuests = guests?.length || 0;
    const checkedIn = checkIns?.length || 0;
    const notCheckedIn = totalGuests - checkedIn;
    const attendanceRate =
        totalGuests > 0 ? Math.round((checkedIn / totalGuests) * 100) : 0;

    const dietarySummary = countBy(guests || [], "dietary_request");
    const departmentSummary = countBy(guests || [], "department");

    return (
        <div className="mx-auto max-w-7xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6">
                <h1 className="text-4xl font-black">Analytics</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>
            </div>

            <section className="mt-8 grid gap-6 md:grid-cols-4">
                <Stat title="Total Guests" value={totalGuests} icon="👥" />
                <Stat title="Checked In" value={checkedIn} icon="✅" />
                <Stat title="Not Checked In" value={notCheckedIn} icon="⏳" />
                <Stat title="Attendance Rate" value={`${attendanceRate}%`} icon="📊" />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
                <SummaryCard title="Dietary Requirements">
                    {Object.entries(dietarySummary).map(([label, value]) => (
                        <Bar key={label} label={label || "Not stated"} value={value} total={totalGuests} />
                    ))}
                </SummaryCard>

                <SummaryCard title="Department Breakdown">
                    {Object.entries(departmentSummary).map(([label, value]) => (
                        <Bar key={label} label={label || "Not stated"} value={value} total={totalGuests} />
                    ))}
                </SummaryCard>
            </section>

            <section className="mt-8 rounded-[2rem] bg-white p-8 shadow-xl">
                <h2 className="text-2xl font-black">Table Occupancy</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(tables || []).map((table) => {
                        const seated =
                            assignments?.filter((a) => a.table_id === table.id).length || 0;
                        const capacity = Number(table.table_capacity || 0);
                        const percent =
                            capacity > 0 ? Math.round((seated / capacity) * 100) : 0;

                        return (
                            <div key={table.id} className="rounded-2xl bg-[#F7F5FF] p-5">
                                <div className="flex justify-between">
                                    <p className="font-black">{table.table_name}</p>
                                    <p className="font-bold text-slate-500">
                                        {seated}/{capacity}
                                    </p>
                                </div>

                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {(!tables || tables.length === 0) && (
                        <p className="text-slate-500">No tables created yet.</p>
                    )}
                </div>
            </section>
        </div>
    );
}

function countBy(items: any[], key: string) {
    return items.reduce((acc: Record<string, number>, item) => {
        const value = item[key] || "Not stated";
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function Stat({
    title,
    value,
    icon,
}: {
    title: string;
    value: number | string;
    icon: string;
}) {
    return (
        <div className="rounded-[2rem] bg-white p-7 shadow-xl">
            <div className="text-4xl">{icon}</div>
            <p className="mt-5 font-bold text-slate-500">{title}</p>
            <p className="mt-3 text-4xl font-black">{value}</p>
        </div>
    );
}

function SummaryCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-black">{title}</h2>
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
            <div className="flex justify-between text-sm font-bold">
                <span>{label}</span>
                <span>{value} ({percent}%)</span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#F7F5FF]">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
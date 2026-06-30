import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import TableForm from "@/components/forms/TableForm";

export default async function TablesPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <div>Event not found.</div>;

    const { data: tables } = await supabaseServer
        .from("event_tables")
        .select("*")
        .eq("event_id", eventId)
        .order("table_name", { ascending: true });

    const { data: assignments } = await supabaseServer
        .from("table_assignments")
        .select("*, registrations(*)")
        .eq("event_id", eventId);

    return (
        <div className="mx-auto max-w-7xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
                <section className="rounded-[2rem] bg-white p-8 shadow-xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-4xl font-black">Tables</h1>
                            <p className="mt-2 text-slate-600">{event.event_name}</p>
                        </div>

                        <Link
                            href={`/dashboard/events/${eventId}/tables/assign`}
                            className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 text-center font-black text-white shadow-lg"
                        >
                            Assign Guests
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-5 md:grid-cols-2">
                        {tables && tables.length > 0 ? (
                            tables.map((table) => {
                                const seated =
                                    assignments?.filter((a) => a.table_id === table.id) || [];

                                const capacity = Number(table.table_capacity || 0);
                                const remaining = Math.max(capacity - seated.length, 0);

                                return (
                                    <div key={table.id} className="rounded-[2rem] bg-[#F7F5FF] p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h2 className="text-2xl font-black">{table.table_name}</h2>
                                                <p className="mt-2 text-sm text-slate-600">
                                                    {seated.length}/{capacity} assigned · {remaining} seats left
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-black ${remaining === 0
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-green-100 text-green-700"
                                                    }`}
                                            >
                                                {remaining === 0 ? "FULL" : "OPEN"}
                                            </span>
                                        </div>

                                        <div className="mt-5 space-y-2">
                                            {seated.length > 0 ? (
                                                seated.slice(0, 5).map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="rounded-2xl bg-white p-3 text-sm font-semibold"
                                                    >
                                                        {item.registrations?.full_name || "Guest"}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
                                                    No guests assigned yet.
                                                </p>
                                            )}

                                            {seated.length > 5 && (
                                                <p className="text-sm font-bold text-slate-500">
                                                    + {seated.length - 5} more guests
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full rounded-2xl bg-[#F7F5FF] p-8 text-center">
                                <div className="text-5xl">🪑</div>
                                <h2 className="mt-4 text-2xl font-black">No tables yet</h2>
                                <p className="mt-2 text-slate-500">
                                    Add tables before assigning guests.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-[2rem] bg-white p-8 shadow-xl">
                    <h2 className="text-2xl font-black">Add Table</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Create tables for this event.
                    </p>

                    <div className="mt-6">
                        <TableForm eventId={eventId} />
                    </div>
                </section>
            </div>
        </div>
    );
}
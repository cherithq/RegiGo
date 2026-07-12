import Link from "next/link";
import { ArrowLeft, Table2, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import TableForm from "@/components/forms/TableForm";

export default async function TablesPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

    const [eventResult, tablesResult, assignmentsResult] = await Promise.all([
        supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        supabaseServer
            .from("event_tables")
            .select("*")
            .eq("event_id", eventId)
            .order("table_name", { ascending: true }),

        supabaseServer
            .from("table_assignments")
            .select("*, registrations(*)")
            .eq("event_id", eventId),
    ]);

    const event = eventResult.data;

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const tables = tablesResult.data || [];
    const assignments = assignmentsResult.data || [];
    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-56 md:w-56" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-32 md:h-56 md:w-56" />

                    <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <Table2 size={15} />
                                Seating Setup
                            </div>

                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                                Tables
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                                Create tables and monitor assigned guests for{" "}
                                <span className="font-black text-slate-950">
                                    {eventName}
                                </span>
                                .
                            </p>
                        </div>

                        <Link
                            href={`/dashboard/events/${eventId}/tables/assign`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg sm:w-auto"
                        >
                            <Users size={17} />
                            Assign Guests
                        </Link>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:gap-6">
                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                        <div className="grid gap-4 md:grid-cols-2">
                            {tables.length > 0 ? (
                                tables.map((table: any) => {
                                    const seated =
                                        assignments.filter((a: any) => a.table_id === table.id) || [];

                                    const capacity = Number(table.table_capacity || 0);
                                    const remaining = Math.max(capacity - seated.length, 0);

                                    return (
                                        <div
                                            key={table.id}
                                            className="rounded-[1.5rem] bg-[#F7F5FF] p-5 md:rounded-[2rem] md:p-6"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <h2 className="truncate text-xl font-black md:text-2xl">
                                                        {table.table_name}
                                                    </h2>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {seated.length}/{capacity} assigned ·{" "}
                                                        {remaining} seats left
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                                                        remaining === 0
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-green-100 text-green-700"
                                                    }`}
                                                >
                                                    {remaining === 0 ? "FULL" : "OPEN"}
                                                </span>
                                            </div>

                                            <div className="mt-5 space-y-2">
                                                {seated.length > 0 ? (
                                                    seated.slice(0, 5).map((item: any) => (
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
                                    <h2 className="mt-4 text-2xl font-black">
                                        No tables yet
                                    </h2>
                                    <p className="mt-2 text-slate-500">
                                        Add tables before assigning guests.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                        <h2 className="text-2xl font-black">Add Table</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Create tables for this event.
                        </p>

                        <div className="mt-6">
                            <TableForm eventId={eventId} />
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
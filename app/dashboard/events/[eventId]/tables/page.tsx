import Link from "next/link";
import { ArrowLeft, Table2, Users } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";
import { loadAllRows } from "@/lib/event-analytics-server";
import TableForm from "@/components/forms/TableForm";
import TableListManager from "@/components/tables/TableListManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventTable = {
    id: string;
    event_id: string;
    table_name: string;
    table_capacity: number | null;
};

type TableAssignment = {
    id: string;
    event_id: string;
    table_id: string | null;
    registration_id: string | null;
};

type Guest = {
    id: string;
    full_name: string | null;
    email: string | null;
};

export default async function TablesPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    await requirePermission("can_manage_guests");

    const { eventId } = await params;

    // Service-role client: RLS can hide table_assignments rows from the
    // signed-in session even for events the user manages, which is why
    // this page previously showed 0 assigned/seats left despite real data.
    const admin = getSupabaseAdminClient();

    const [eventResult, tablesResult, guests] =
        await Promise.all([
            admin
                .from("events")
                .select("*")
                .eq("id", eventId)
                .maybeSingle(),

            admin
                .from("event_tables")
                .select("*")
                .eq("event_id", eventId)
                .order("table_name", { ascending: true }),

            // PostgREST caps unpaginated selects at 1000 rows, and this
            // event can have thousands of registrations — page through
            // all of them so every guest resolves in the seat counts.
            loadAllRows<Guest>({
                admin,
                table: "registrations",
                columns: "id, full_name, email",
                eventId,
            }),
        ]);

    const tableIds = (tablesResult.data || []).map((table) => table.id);

    // table_assignments.event_id is not reliably populated, so scope by
    // this event's table ids instead of filtering on event_id directly.
    const assignmentsResult = tableIds.length
        ? await admin
              .from("table_assignments")
              .select("id, event_id, table_id, registration_id")
              .in("table_id", tableIds)
        : { data: [] as TableAssignment[] };

    const event = eventResult.data;

    if (eventResult.error || !event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">
                        {eventResult.error?.message || "Event not found."}
                    </p>
                </div>
            </main>
        );
    }

    const tables = (tablesResult.data || []) as EventTable[];
    const assignments = (assignmentsResult.data || []) as TableAssignment[];

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
                        <TableListManager
                            eventId={eventId}
                            initialTables={tables}
                            assignments={assignments}
                            guests={guests}
                        />
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
import { Users } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";
import { loadAllRows } from "@/lib/event-analytics-server";
import TableAssignmentForm from "@/components/forms/TableAssignmentForm";
import BackButton from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AssignTablesPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    await requirePermission("can_manage_guests");

    const { eventId } = await params;

    // Service-role client: RLS can hide table_assignments rows from the
    // signed-in session even for events the user manages.
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
            // all of them so every guest is available to assign.
            loadAllRows({
                admin,
                table: "registrations",
                columns: "*",
                eventId,
                orderColumn: "full_name",
            }),
        ]);

    const tableIds = (tablesResult.data || []).map((table) => table.id);

    // table_assignments.event_id is not reliably populated, so scope by
    // this event's table ids instead of filtering on event_id directly.
    const assignmentsResult = tableIds.length
        ? await admin
              .from("table_assignments")
              .select("*")
              .in("table_id", tableIds)
        : {
              data: [] as {
                  id: string;
                  event_id: string | null;
                  table_id: string;
                  registration_id: string;
                  assignment_source: string | null;
                  assigned_at: string;
                  created_at: string;
              }[],
          };

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

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <BackButton href={`/dashboard/events/${eventId}/tables`}>
                    Back to Tables
                </BackButton>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-56 md:w-56" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-32 md:h-56 md:w-56" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                            <Users size={15} />
                            Seating Assignment
                        </div>

                        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                            Assign Guests to Tables
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Assign registered guests to seating tables for{" "}
                            <span className="font-black text-slate-950">
                                {eventName}
                            </span>
                            .
                        </p>
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                    <TableAssignmentForm
                        eventId={eventId}
                        tables={tablesResult.data || []}
                        guests={guests}
                        assignments={assignmentsResult.data || []}
                    />
                </section>
            </div>
        </main>
    );
}
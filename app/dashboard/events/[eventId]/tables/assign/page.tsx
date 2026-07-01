import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import TableAssignmentForm from "@/components/forms/TableAssignmentForm";

export default async function AssignTablesPage({
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

    const { data: tables } = await supabaseServer
        .from("event_tables")
        .select("*")
        .eq("event_id", eventId)
        .order("table_name", { ascending: true });

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("full_name", { ascending: true });

    const { data: assignments } = await supabaseServer
        .from("table_assignments")
        .select("*")
        .eq("event_id", eventId);

    if (!event) return <div>Event not found.</div>;

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href={`/dashboard/events/${eventId}/tables`}
                className="font-bold text-[#4F46E5]"
            >
                ← Back to Tables
            </Link>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black">Assign Guests to Tables</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8">
                    <TableAssignmentForm
                        eventId={eventId}
                        tables={tables || []}
                        guests={guests || []}
                        assignments={assignments || []}
                    />
                </div>
            </div>
        </div>
    );
}
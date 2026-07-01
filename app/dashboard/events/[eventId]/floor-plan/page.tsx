import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import FloorPlanEditor from "@/components/floor/FloorPlanEditor";

export default async function FloorPlanPage({
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

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black">Venue Floor Plan</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8">
                    <FloorPlanEditor
                        eventId={eventId}
                        tables={tables || []}
                        assignments={assignments || []}
                    />
                </div>
            </div>
        </div>
    );
}
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import AgendaManager from "@/components/forms/AgendaManager";

export default async function AgendaPage({
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

    const { data: agenda } = await supabaseServer
        .from("event_agenda")
        .select("*, speakers(*)")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true });

    const { data: speakers } = await supabaseServer
        .from("speakers")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true });

    return (
        <div className="mx-auto max-w-7xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black">Agenda Builder</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8">
                    <AgendaManager
                        eventId={eventId}
                        initialAgenda={agenda || []}
                        speakers={speakers || []}
                    />
                </div>
            </div>
        </div>
    );
}
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import TicketTypesManager from "@/components/forms/TicketTypesManager";

export default async function TicketsPage({
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

    const { data: tickets } = await supabaseServer
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true });

    return (
        <div className="mx-auto max-w-6xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black">Ticket Types</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8">
                    <TicketTypesManager eventId={eventId} initialTickets={tickets || []} />
                </div>
            </div>
        </div>
    );
}
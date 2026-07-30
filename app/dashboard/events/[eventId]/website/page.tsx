import Link from "next/link";
import { Eye } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EventWebsiteBuilder from "@/components/forms/EventWebsiteBuilder";

export default async function EventWebsitePage({
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

    const [
        { data: sections },
        { count: agendaCount },
        { count: speakerCount },
    ] = await Promise.all([
        supabaseServer
            .from("event_page_sections")
            .select("*")
            .eq("event_id", eventId)
            .order("sort_order", { ascending: true }),

        supabaseServer
            .from("event_agenda")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId),

        supabaseServer
            .from("speakers")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId),
    ]);

    return (
        <div className="mx-auto max-w-7xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-4xl font-black">Website Builder</h1>
                        <p className="mt-2 text-slate-600">{event.event_name}</p>
                    </div>

                    {event.event_slug && (
                        <Link
                            href={`/event/${event.event_slug}`}
                            target="_blank"
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                        >
                            <Eye size={18} />
                            Preview Public Website
                        </Link>
                    )}
                </div>

                <div className="mt-8">
                    <EventWebsiteBuilder
                        event={event}
                        initialSections={sections || []}
                        agendaCount={agendaCount || 0}
                        speakerCount={speakerCount || 0}
                    />
                </div>
            </div>
        </div>
    );
}
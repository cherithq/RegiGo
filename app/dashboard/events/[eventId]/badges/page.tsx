import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BadgeDesigner from "@/components/badges/BadgeDesigner";

export default async function BadgesPage({
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

    const { data: template } = await supabaseServer
        .from("badge_templates")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select(`
      *,
        table_assignments(
        *,
        event_tables(*)
    )
    `)
        .eq("event_id", eventId)
        .order("full_name", { ascending: true });

    return (
        <div className="mx-auto max-w-7xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black">Badge Designer</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8">
                    <BadgeDesigner
                        event={event}
                        template={template}
                        guests={guests || []}
                    />
                </div>
            </div>
        </div>
    );
}
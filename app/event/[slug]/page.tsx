import { supabaseServer } from "@/lib/supabase-server";
import EventHero from "@/components/website/EventHero";
import EventAgenda from "@/components/website/EventAgenda";
import EventSpeakers from "@/components/website/EventSpeakers";
import EventTickets from "@/components/website/EventTickets";
import EventSections from "@/components/website/EventSections";
import RegistrationCTA from "@/components/website/RegistrationCTA";
import WebsiteFooter from "@/components/website/WebsiteFooter";

export default async function PublicEventPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*, event_branding(*)")
        .eq("event_slug", slug)
        .single();

    if (!event) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] text-slate-950">
                Event not found.
            </main>
        );
    }

    if (event.status !== "published") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
                <div className="max-w-md rounded-[2rem] bg-white p-10 text-center shadow-2xl">
                    <div className="text-5xl">🚧</div>
                    <h1 className="mt-6 text-3xl font-black">Event Not Published</h1>
                    <p className="mt-3 text-slate-600">
                        This event page is not live yet.
                    </p>
                </div>
            </main>
        );
    }

    const branding = Array.isArray(event.event_branding)
        ? event.event_branding[0]
        : event.event_branding;

    const { data: sections } = await supabaseServer
        .from("event_page_sections")
        .select("*")
        .eq("event_id", event.id)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });

    const { data: speakers } = await supabaseServer
        .from("speakers")
        .select("*")
        .eq("event_id", event.id)
        .order("display_order", { ascending: true });

    const { data: agenda } = await supabaseServer
        .from("event_agenda")
        .select("*, speakers(*)")
        .eq("event_id", event.id)
        .order("display_order", { ascending: true });

    const { data: tickets } = await supabaseServer
        .from("ticket_types")
        .select("*")
        .eq("event_id", event.id)
        .order("display_order", { ascending: true });

    return (
        <main
            className="min-h-screen text-slate-950"
            style={{
                backgroundColor: branding?.background_color || "#F7F5FF",
                backgroundImage: branding?.page_background_url
                    ? `url(${branding.page_background_url})`
                    : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            <EventHero event={event} branding={branding} />

            <section className="mx-auto max-w-7xl px-6 py-12">
                <RegistrationCTA event={event} />

                <EventSections sections={sections || []} />

                <EventAgenda agenda={agenda || []} />

                <EventSpeakers speakers={speakers || []} />

                <EventTickets tickets={tickets || []} />

                <WebsiteFooter event={event} />
            </section>
        </main>
    );
}
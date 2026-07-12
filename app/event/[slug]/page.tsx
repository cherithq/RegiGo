import { createSupabaseServerClient } from "@/lib/supabase-server";
import EventHero from "@/components/website/EventHero";
import EventAgenda from "@/components/website/EventAgenda";
import EventSpeakers from "@/components/website/EventSpeakers";
import EventTickets from "@/components/website/EventTickets";
import EventSections from "@/components/website/EventSections";
import RegistrationCTA from "@/components/website/RegistrationCTA";
import WebsiteFooter from "@/components/website/WebsiteFooter";

export const dynamic = "force-dynamic";

export default async function PublicEventPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { slug } = await params;

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select("*, event_branding(*)")
        .eq("event_slug", slug)
        .maybeSingle();

    if (eventError || !event) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-xl md:rounded-[2rem] md:p-8">
                    <div className="text-5xl">⚠️</div>

                    <h1 className="mt-5 text-2xl font-black text-slate-950 md:text-3xl">
                        Event Not Found
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        This event does not exist or the link is incorrect.
                    </p>

                    {eventError?.message && (
                        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                            {eventError.message}
                        </p>
                    )}
                </div>
            </main>
        );
    }

    if (event.status !== "published") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl md:rounded-[2rem] md:p-10">
                    <div className="text-5xl">🚧</div>

                    <h1 className="mt-5 text-2xl font-black md:mt-6 md:text-3xl">
                        Event Not Published
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                        This event page is not live yet.
                    </p>
                </div>
            </main>
        );
    }

    const branding = Array.isArray(event.event_branding)
        ? event.event_branding[0]
        : event.event_branding;

    const [sectionsResult, speakersResult, agendaResult, ticketsResult] =
        await Promise.all([
            supabaseServer
                .from("event_page_sections")
                .select("*")
                .eq("event_id", event.id)
                .eq("is_visible", true)
                .order("sort_order", { ascending: true }),

            supabaseServer
                .from("speakers")
                .select("*")
                .eq("event_id", event.id)
                .order("display_order", { ascending: true }),

            supabaseServer
                .from("event_agenda")
                .select("*, speakers(*)")
                .eq("event_id", event.id)
                .order("display_order", { ascending: true }),

            supabaseServer
                .from("ticket_types")
                .select("*")
                .eq("event_id", event.id)
                .order("display_order", { ascending: true }),
        ]);

    return (
        <main
            className="min-h-screen overflow-x-hidden text-slate-950"
            style={{
                backgroundColor: branding?.background_color || "#F7F5FF",
                backgroundImage: branding?.page_background_url
                    ? `url(${branding.page_background_url})`
                    : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <EventHero event={event} branding={branding} />

            <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-5 md:space-y-12 md:px-6 md:py-12">
                <div className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <RegistrationCTA event={event} />
                </div>

                <div className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <EventSections sections={sectionsResult.data || []} />
                </div>

                <div className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <EventAgenda agenda={agendaResult.data || []} />
                </div>

                <div className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <EventSpeakers speakers={speakersResult.data || []} />
                </div>

                <div className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <EventTickets tickets={ticketsResult.data || []} />
                </div>

                <WebsiteFooter event={event} />
            </section>
        </main>
    );
}
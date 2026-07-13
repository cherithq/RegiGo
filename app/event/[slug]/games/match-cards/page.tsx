import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cleanGlitterGamesConfig } from "@/lib/glitter-games";
import MatchCardsGame from "@/components/games/MatchCardsGame";

export const dynamic = "force-dynamic";

export default async function MatchCardsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabaseServer = await createSupabaseServerClient();

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select("id,event_name,event_slug")
        .eq("event_slug", slug)
        .maybeSingle();

    if (eventError || !event) {
        return (
            <GameUnavailable
                slug={slug}
                message={
                    eventError
                        ? `Unable to load this event: ${eventError.message}`
                        : "This event could not be found."
                }
            />
        );
    }

    const { data: settings, error: settingsError } = await supabaseServer
        .from("event_settings")
        .select("glitter_games_config")
        .eq("event_id", event.id)
        .maybeSingle();

    if (settingsError) {
        return (
            <GameUnavailable
                slug={slug}
                message={`Unable to load the game settings: ${settingsError.message}`}
            />
        );
    }

    const gameConfig = cleanGlitterGamesConfig(
        settings?.glitter_games_config,
    );

    if (!gameConfig.match_cards) {
        return (
            <GameUnavailable
                slug={slug}
                message="Match the Cards is not enabled for this event."
            />
        );
    }

    return (
        <MatchCardsGame
            eventId={String(event.id)}
            eventName={event.event_name || "this event"}
            slug={slug}
            lobbyHref={`/event/${slug}/games`}
        />
    );
}

function GameUnavailable({
    slug,
    message,
}: {
    slug: string;
    message: string;
}) {
    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F5FF] px-4 py-8 text-slate-950">
            <section className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm md:rounded-[2rem] md:p-8">
                <h1 className="text-2xl font-black">Match the Cards unavailable</h1>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-600">
                    {message}
                </p>
                <Link
                    href={`/event/${slug}/games`}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                >
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back to Games
                </Link>
            </section>
        </main>
    );
}

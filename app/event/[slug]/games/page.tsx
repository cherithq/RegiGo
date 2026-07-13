import Link from "next/link";
import {
    ArrowLeft,
    Coins,
    Gamepad2,
    Grid2X2,
    HandCoins,
    LockKeyhole,
    MousePointerClick,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    cleanGlitterGamesConfig,
    glitterGameCatalog,
    type GlitterGameKey,
} from "@/lib/glitter-games";

export const dynamic = "force-dynamic";

const gameIcons: Record<GlitterGameKey, LucideIcon> = {
    match_cards: Grid2X2,
    coin_flip: Coins,
    tic_tac_toe: Users,
    grab_coins: HandCoins,
    tap_fast: MousePointerClick,
};

const playableGameRoutes: Partial<Record<GlitterGameKey, string>> = {
    match_cards: "match-cards",
    coin_flip: "coin-flip",
    grab_coins: "grab-coins",
    tap_fast: "tap-fast",
    tic_tac_toe: "tic-tac-toe",
};

export default async function PublicGlitterGamesPage({
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
            <PublicErrorPage
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
            <PublicErrorPage
                message={`Unable to load Glitter Games: ${settingsError.message}`}
                backHref={`/event/${slug}`}
            />
        );
    }

    const gameConfig = cleanGlitterGamesConfig(
        settings?.glitter_games_config,
    );

    const enabledGames = glitterGameCatalog.filter(
        (game) => gameConfig[game.key],
    );

    return (
        <main className="min-h-[100dvh] overflow-x-hidden bg-[#F7F5FF] px-4 py-5 text-slate-950 sm:px-6 md:py-8">
            <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={`/event/${slug}`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back to Event
                    </Link>

                    <Link
                        href={`/event/${slug}/games/leaderboard`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#4F46E5]/20 bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:border-[#4F46E5]/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                    >
                        <Trophy size={17} aria-hidden="true" />
                        Leaderboards
                    </Link>
                </div>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:rounded-[2rem] md:p-10">
                    <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#EC4899]/10 blur-3xl md:h-64 md:w-64" />
                    <div className="absolute -bottom-16 right-20 h-44 w-44 rounded-full bg-[#4F46E5]/10 blur-3xl md:h-64 md:w-64" />

                    <div className="relative z-10 max-w-3xl">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] sm:h-14 sm:w-14">
                            <Gamepad2 size={27} aria-hidden="true" />
                        </div>

                        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] sm:px-4 sm:text-sm">
                            <Sparkles size={15} aria-hidden="true" />
                            Glitter Games
                        </div>

                        <h1 className="mt-4 break-words text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                            Play as a verified checked-in guest
                        </h1>

                        <p className="mt-3 text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                            Welcome to the game zone for{" "}
                            <span className="font-black text-slate-950">
                                {event.event_name || "this event"}
                            </span>
                            . Only guests who have completed event check-in can play. Use the email or full name from your registration to load one verified profile across every game and leaderboard.
                        </p>
                    </div>
                </section>

                {enabledGames.length === 0 ? (
                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm md:rounded-[2rem] md:p-10">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <LockKeyhole size={24} aria-hidden="true" />
                        </div>
                        <h2 className="mt-4 text-xl font-black">
                            No games are available yet
                        </h2>
                        <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">
                            The organiser has not enabled any Glitter Games for this event.
                        </p>
                    </section>
                ) : (
                    <section aria-labelledby="available-games-heading">
                        <div className="mb-4 sm:mb-5">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                Live challenge lobby
                            </p>
                            <h2
                                id="available-games-heading"
                                className="mt-2 text-2xl font-black sm:text-3xl"
                            >
                                Available games
                            </h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {enabledGames.map((game) => {
                                const Icon = gameIcons[game.key];
                                const gameRoute = playableGameRoutes[game.key];

                                if (gameRoute) {
                                    return (
                                        <Link
                                            key={game.key}
                                            href={`/event/${slug}/games/${gameRoute}`}
                                            className="group flex min-h-64 flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition hover:-translate-y-1 hover:border-[#4F46E5]/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 sm:p-6 md:rounded-[2rem]"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] transition group-hover:bg-[#EEF2FF]">
                                                    <Icon size={24} aria-hidden="true" />
                                                </div>
                                                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#4F46E5]">
                                                    Play now
                                                </span>
                                            </div>

                                            <div className="mt-auto pt-8">
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
                                                    {game.mode}
                                                </p>
                                                <h3 className="mt-2 text-2xl font-black">
                                                    {game.title}
                                                </h3>
                                                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                                                    {game.description}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                }

                                return (
                                    <article
                                        key={game.key}
                                        className="flex min-h-64 flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-[2rem]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                                <Icon size={24} aria-hidden="true" />
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                Coming next
                                            </span>
                                        </div>

                                        <div className="mt-auto pt-8">
                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
                                                {game.mode}
                                            </p>
                                            <h3 className="mt-2 text-xl font-black">
                                                {game.title}
                                            </h3>
                                            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                                                {game.description}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}

function PublicErrorPage({
    message,
    backHref = "/",
}: {
    message: string;
    backHref?: string;
}) {
    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F5FF] px-4 py-8 text-slate-950">
            <section className="w-full max-w-lg rounded-[1.5rem] border border-red-200 bg-white p-6 text-center shadow-sm md:rounded-[2rem] md:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Gamepad2 size={25} aria-hidden="true" />
                </div>
                <h1 className="mt-4 text-2xl font-black">Games unavailable</h1>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-600">
                    {message}
                </p>
                <Link
                    href={backHref}
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                >
                    Go back
                </Link>
            </section>
        </main>
    );
}

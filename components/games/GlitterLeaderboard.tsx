"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
    ArrowLeft,
    Coins,
    Grid2X2,
    HandCoins,
    Loader2,
    Medal,
    MousePointerClick,
    RefreshCw,
    Swords,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react";

type LeaderboardGameKey =
    | "overall"
    | "coin_flip"
    | "match_cards"
    | "tic_tac_toe"
    | "grab_coins"
    | "tap_fast";

type LeaderboardEntry = {
    position: number;
    display_name: string;
    total_points: number;
    total_wins: number;
    total_plays: number;
};

const leaderboardTabs: Array<{
    key: LeaderboardGameKey;
    title: string;
    shortTitle: string;
    icon: typeof Trophy;
}> = [
    {
        key: "overall",
        title: "Overall",
        shortTitle: "Overall",
        icon: Trophy,
    },
    {
        key: "coin_flip",
        title: "Coin Flip",
        shortTitle: "Coin Flip",
        icon: Coins,
    },
    {
        key: "match_cards",
        title: "Match the Cards",
        shortTitle: "Match Cards",
        icon: Grid2X2,
    },
    {
        key: "tic_tac_toe",
        title: "Tic-Tac-Toe",
        shortTitle: "Tic-Tac-Toe",
        icon: Swords,
    },
    {
        key: "grab_coins",
        title: "Grab the Coins",
        shortTitle: "Grab Coins",
        icon: HandCoins,
    },
    {
        key: "tap_fast",
        title: "Tap, Tap, Tap",
        shortTitle: "Tap Fast",
        icon: MousePointerClick,
    },
];

const leaderboardCopy: Record<
    LeaderboardGameKey,
    { eyebrow: string; heading: string; empty: string }
> = {
    overall: {
        eyebrow: "All Glitter Games",
        heading: "Overall rankings",
        empty: "Play any available game to become the first player on the overall leaderboard.",
    },
    coin_flip: {
        eyebrow: "Coin Flip",
        heading: "Coin Flip rankings",
        empty: "Play Coin Flip to become the first player on this leaderboard.",
    },
    match_cards: {
        eyebrow: "Match the Cards",
        heading: "Match the Cards rankings",
        empty: "Complete Match the Cards to become the first player on this leaderboard.",
    },
    tic_tac_toe: {
        eyebrow: "Tic-Tac-Toe",
        heading: "Tic-Tac-Toe rankings",
        empty: "Win or draw a Tic-Tac-Toe match to appear on this leaderboard.",
    },
    grab_coins: {
        eyebrow: "Grab the Coins",
        heading: "Grab the Coins rankings",
        empty: "Complete a Grab the Coins round to become the first player on this leaderboard.",
    },
    tap_fast: {
        eyebrow: "Tap, Tap, Tap",
        heading: "Tap, Tap, Tap rankings",
        empty: "Complete a tapping round to become the first player on this leaderboard.",
    },
};

export default function GlitterLeaderboard({
    eventName,
    slug,
}: {
    eventName: string;
    slug: string;
}) {
    const [activeGame, setActiveGame] =
        useState<LeaderboardGameKey>("overall");
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadLeaderboard = useCallback(
        async (gameKey: LeaderboardGameKey, quiet = false) => {
            if (quiet) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            try {
                const response = await fetch(
                    `/api/public/events/${encodeURIComponent(slug)}/games/leaderboard?game=${gameKey}&limit=20`,
                    { cache: "no-store" },
                );
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Unable to load the leaderboard.",
                    );
                }

                setEntries(
                    Array.isArray(result.leaderboard)
                        ? result.leaderboard
                        : [],
                );
            } catch (caughtError) {
                setError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : "Unable to load the leaderboard.",
                );
                setEntries([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [slug],
    );

    useEffect(() => {
        loadLeaderboard(activeGame);
        const timer = window.setInterval(
            () => loadLeaderboard(activeGame, true),
            10000,
        );
        return () => window.clearInterval(timer);
    }, [activeGame, loadLeaderboard]);

    const copy = leaderboardCopy[activeGame];

    return (
        <main className="min-h-[100dvh] overflow-x-hidden bg-[#F7F5FF] px-4 py-5 text-slate-950 sm:px-6 md:py-8">
            <div className="mx-auto w-full max-w-4xl space-y-5 md:space-y-8">
                <Link
                    href={`/event/${slug}/games`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                >
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back to Games
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:rounded-[2rem] md:p-10">
                    <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#EC4899]/10 blur-3xl md:h-64 md:w-64" />
                    <div className="absolute -bottom-16 right-16 h-44 w-44 rounded-full bg-[#4F46E5]/10 blur-3xl md:h-64 md:w-64" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] sm:px-4 sm:text-sm">
                            <Sparkles size={15} aria-hidden="true" />
                            Glitter Games
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                            Leaderboards
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                            View the overall standings or compare scores for each game at{" "}
                            <span className="font-black text-slate-950">
                                {eventName}
                            </span>
                            . Rankings refresh automatically every 10 seconds.
                        </p>
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:rounded-[2rem]">
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <div
                            className="flex min-w-max gap-2 lg:grid lg:min-w-0 lg:grid-cols-6"
                            role="tablist"
                            aria-label="Choose leaderboard"
                        >
                        {leaderboardTabs.map((tab) => {
                            const Icon = tab.icon;
                            const selected = activeGame === tab.key;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    onClick={() => setActiveGame(tab.key)}
                                    className={`flex min-h-12 min-w-[8.5rem] items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-center text-xs font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 sm:gap-2 sm:px-4 sm:text-sm lg:min-w-0 ${
                                        selected
                                            ? "bg-[#4F46E5] text-white shadow-sm"
                                            : "border border-slate-200 bg-white text-slate-600 hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
                                    }`}
                                >
                                    <Icon
                                        size={17}
                                        className="shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate sm:hidden">
                                        {tab.shortTitle}
                                    </span>
                                    <span className="hidden truncate sm:inline">
                                        {tab.title}
                                    </span>
                                </button>
                            );
                        })}
                        </div>
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:rounded-[2rem] md:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                {copy.eyebrow}
                            </p>
                            <h2 className="mt-2 text-2xl font-black">
                                {copy.heading}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadLeaderboard(activeGame, true)}
                            disabled={refreshing}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/30 hover:text-[#4F46E5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/15 disabled:opacity-60"
                        >
                            <RefreshCw
                                size={17}
                                className={refreshing ? "animate-spin" : ""}
                                aria-hidden="true"
                            />
                            Refresh
                        </button>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex min-h-56 items-center justify-center">
                            <Loader2
                                size={28}
                                className="animate-spin text-[#4F46E5]"
                            />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-7 text-center sm:p-8">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm">
                                <Users size={24} aria-hidden="true" />
                            </div>
                            <h3 className="mt-4 text-xl font-black">
                                No scores yet
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                                {copy.empty}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            {entries.map((entry) => (
                                <article
                                    key={`${activeGame}-${entry.position}-${entry.display_name}`}
                                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:gap-4 sm:p-5"
                                >
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-2xl font-black ${
                                            entry.position === 1
                                                ? "bg-amber-100 text-amber-700"
                                                : entry.position === 2
                                                  ? "bg-slate-200 text-slate-700"
                                                  : entry.position === 3
                                                    ? "bg-orange-100 text-orange-700"
                                                    : "bg-[#F7F5FF] text-[#4F46E5]"
                                        }`}
                                    >
                                        {entry.position <= 3 ? (
                                            entry.position === 1 ? (
                                                <Trophy
                                                    size={21}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Medal
                                                    size={21}
                                                    aria-hidden="true"
                                                />
                                            )
                                        ) : (
                                            entry.position
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="truncate font-black text-slate-950">
                                            {entry.display_name}
                                        </h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                                            {formatPerformance(activeGame, entry)}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xl font-black text-[#4F46E5] sm:text-2xl">
                                            {entry.total_points}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            points
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function formatPerformance(
    gameKey: LeaderboardGameKey,
    entry: LeaderboardEntry,
) {
    if (gameKey === "coin_flip") {
        return `${entry.total_wins} correct ${entry.total_wins === 1 ? "guess" : "guesses"} · ${entry.total_plays} ${entry.total_plays === 1 ? "flip" : "flips"}`;
    }

    if (gameKey === "match_cards") {
        return `${entry.total_plays} completed ${entry.total_plays === 1 ? "round" : "rounds"}`;
    }

    if (gameKey === "grab_coins") {
        return `${entry.total_plays} completed ${entry.total_plays === 1 ? "round" : "rounds"}`;
    }

    if (gameKey === "tap_fast") {
        return `${entry.total_plays} completed ${entry.total_plays === 1 ? "round" : "rounds"}`;
    }

    return `${entry.total_wins} ${entry.total_wins === 1 ? "win" : "wins"} · ${entry.total_plays} ${entry.total_plays === 1 ? "play" : "plays"}`;
}

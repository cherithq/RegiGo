"use client";

import Link from "next/link";
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Coins,
    Loader2,
    LogOut,
    RefreshCw,
    RotateCcw,
    Sparkles,
    Swords,
    Trophy,
    UserRound,
    Users,
    Wifi,
} from "lucide-react";

type CoinSide = "heads" | "tails";
type MatchStatus =
    | "waiting"
    | "countdown"
    | "active"
    | "completed"
    | "cancelled";

type PlayerProfile = {
    player_token: string;
    display_name: string;
    total_points: number;
    total_wins: number;
    total_plays: number;
};

type BasicMatch = {
    match_token: string;
    game_key: string;
    match_status: MatchStatus;
    opponent_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    seconds_until_start: number;
    seconds_remaining: number;
};

type CoinDuelMatch = BasicMatch & {
    your_score: number;
    opponent_score: number;
    your_attempts: number;
    opponent_attempts: number;
    you_won: boolean | null;
    points_awarded: number;
    result_code: string | null;
    player_total_points: number;
    player_total_wins: number;
    player_total_plays: number;
};

type CoinRound = {
    coin_result: CoinSide;
    is_correct: boolean;
    your_score: number;
    opponent_score: number;
    your_attempts: number;
    seconds_remaining: number;
};

type JsonObject = Record<string, unknown>;

async function readJson(response: Response): Promise<JsonObject> {
    const text = await response.text();

    if (!text) return {};

    try {
        return JSON.parse(text) as JsonObject;
    } catch {
        const looksLikeHtml = text.trimStart().startsWith("<!DOCTYPE");
        throw new Error(
            looksLikeHtml
                ? `The API returned a web page instead of JSON (${response.status}). Check that the route file is in app/api/public/events/[slug]/games.`
                : "The server returned an invalid response.",
        );
    }
}

function asPlayer(value: unknown): PlayerProfile | null {
    return value && typeof value === "object"
        ? (value as PlayerProfile)
        : null;
}

function asBasicMatch(value: unknown): BasicMatch | null {
    return value && typeof value === "object" ? (value as BasicMatch) : null;
}

function asDuelMatch(value: unknown): CoinDuelMatch | null {
    return value && typeof value === "object" ? (value as CoinDuelMatch) : null;
}

function asRound(value: unknown): CoinRound | null {
    return value && typeof value === "object" ? (value as CoinRound) : null;
}

function RealCoin({
    side,
    spinning = false,
    compact = false,
}: {
    side: CoinSide;
    spinning?: boolean;
    compact?: boolean;
}) {
    const sizeClass = compact
        ? "h-14 w-14"
        : "h-28 w-28 sm:h-36 sm:w-36";

    return (
        <div
            className={`${sizeClass} relative`}
            style={{ perspective: "900px" }}
            aria-label={`${side} coin`}
        >
            <div
                className="relative h-full w-full [transform-style:preserve-3d]"
                style={{
                    animation: spinning
                        ? "regigo-real-coin-flip 900ms cubic-bezier(.2,.75,.25,1)"
                        : "regigo-real-coin-float 2.8s ease-in-out infinite",
                    transform:
                        side === "tails"
                            ? "rotateY(180deg)"
                            : "rotateY(0deg)",
                }}
            >
                <CoinSideFace label="H" tone="heads" />
                <CoinSideFace label="T" tone="tails" reverse />
            </div>
        </div>
    );
}

function CoinSideFace({
    label,
    tone,
    reverse = false,
}: {
    label: string;
    tone: CoinSide;
    reverse?: boolean;
}) {
    return (
        <div
            className={`absolute inset-0 rounded-full p-[4px] shadow-[0_18px_40px_rgba(245,158,11,0.38)] [backface-visibility:hidden] ${
                reverse ? "[transform:rotateY(180deg)]" : ""
            }`}
            style={{
                background:
                    "repeating-conic-gradient(from 0deg, #fff3a8 0deg 5deg, #c77908 5deg 10deg)",
            }}
        >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-amber-100 bg-gradient-to-br from-[#FFF7BD] via-[#F5C84C] to-[#B96A06]">
                <div className="absolute inset-[9%] rounded-full border-2 border-amber-800/30 shadow-[inset_0_3px_7px_rgba(255,255,255,0.75),inset_0_-8px_14px_rgba(110,57,0,0.3)]" />
                <div className="absolute -left-1/4 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/75 to-transparent blur-sm" />
                <div className={`relative flex h-[58%] w-[58%] items-center justify-center rounded-full border font-black shadow-inner ${
                    tone === "heads"
                        ? "border-indigo-900/20 bg-indigo-950/10 text-indigo-950"
                        : "border-pink-900/20 bg-pink-950/10 text-pink-950"
                }`}>
                    <span className="text-2xl sm:text-4xl">{label}</span>
                </div>
            </div>
        </div>
    );
}

export default function CoinFlipGame({
    eventId,
    eventName,
    slug,
    lobbyHref,
}: {
    eventId: string;
    eventName: string;
    slug: string;
    lobbyHref: string;
}) {
    const storageKey = `regigo:glitter-player:${eventId}`;

    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [lookup, setLookup] = useState("");
    const [match, setMatch] = useState<CoinDuelMatch | null>(null);
    const [latestChoice, setLatestChoice] = useState<CoinSide | null>(null);
    const [latestResult, setLatestResult] = useState<CoinSide | null>(null);
    const [latestCorrect, setLatestCorrect] = useState<boolean | null>(null);

    const [loadingPlayer, setLoadingPlayer] = useState(true);
    const [savingPlayer, setSavingPlayer] = useState(false);
    const [joining, setJoining] = useState(false);
    const [guessing, setGuessing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [error, setError] = useState("");

    const clearPlayer = useCallback(() => {
        window.localStorage.removeItem(storageKey);
        setPlayer(null);
        setMatch(null);
        setLatestChoice(null);
        setLatestResult(null);
        setLatestCorrect(null);
    }, [storageKey]);

    useEffect(() => {
        let cancelled = false;

        async function restorePlayer() {
            const savedToken = window.localStorage.getItem(storageKey);

            if (!savedToken) {
                setLoadingPlayer(false);
                return;
            }

            try {
                const response = await fetch(
                    `/api/public/events/${encodeURIComponent(slug)}/games/player`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ playerToken: savedToken }),
                        cache: "no-store",
                    },
                );
                const data = await readJson(response);
                const restoredPlayer = asPlayer(data.player);

                if (!response.ok || !restoredPlayer) {
                    window.localStorage.removeItem(storageKey);
                    return;
                }

                if (!cancelled) setPlayer(restoredPlayer);
            } catch (caughtError) {
                if (!cancelled) {
                    setError(
                        caughtError instanceof Error
                            ? caughtError.message
                            : "Unable to restore your player profile.",
                    );
                }
            } finally {
                if (!cancelled) setLoadingPlayer(false);
            }
        }

        void restorePlayer();

        return () => {
            cancelled = true;
        };
    }, [slug, storageKey]);

    async function verifyPlayer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const cleanedLookup = lookup.trim();

        if (cleanedLookup.length < 2 || cleanedLookup.length > 160) {
            setError("Enter the email or full name used for event registration.");
            return;
        }

        setSavingPlayer(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/player`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lookup: cleanedLookup }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            const verifiedPlayer = asPlayer(data.player);

            if (!response.ok || !verifiedPlayer) {
                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Unable to verify the checked-in guest.",
                );
            }

            window.localStorage.setItem(
                storageKey,
                verifiedPlayer.player_token,
            );
            setPlayer(verifiedPlayer);
            setLookup("");
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to verify the checked-in guest.",
            );
        } finally {
            setSavingPlayer(false);
        }
    }

    const refreshMatch = useCallback(
        async (quiet = true) => {
            if (!player || !match) return;
            if (!quiet) setRefreshing(true);

            try {
                const response = await fetch(
                    `/api/public/events/${encodeURIComponent(slug)}/games/coin-flip/match-state`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            playerToken: player.player_token,
                            matchToken: match.match_token,
                        }),
                        cache: "no-store",
                    },
                );
                const data = await readJson(response);
                const refreshedMatch = asDuelMatch(data.match);

                if (!response.ok || !refreshedMatch) {
                    if (response.status === 401) clearPlayer();
                    throw new Error(
                        typeof data.error === "string"
                            ? data.error
                            : "Unable to refresh the match.",
                    );
                }

                setMatch(refreshedMatch);
                setPlayer((current) =>
                    current
                        ? {
                              ...current,
                              total_points: Number(
                                  refreshedMatch.player_total_points ??
                                      current.total_points,
                              ),
                              total_wins: Number(
                                  refreshedMatch.player_total_wins ??
                                      current.total_wins,
                              ),
                              total_plays: Number(
                                  refreshedMatch.player_total_plays ??
                                      current.total_plays,
                              ),
                          }
                        : current,
                );
                if (!quiet) setError("");
            } catch (caughtError) {
                if (!quiet) {
                    setError(
                        caughtError instanceof Error
                            ? caughtError.message
                            : "Unable to refresh the match.",
                    );
                }
            } finally {
                if (!quiet) setRefreshing(false);
            }
        },
        [clearPlayer, match, player, slug],
    );

    useEffect(() => {
        if (
            !match ||
            !["waiting", "countdown", "active"].includes(match.match_status)
        ) {
            return;
        }

        const intervalMs = match.match_status === "active" ? 650 : 900;
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void refreshMatch(true);
            }
        }, intervalMs);

        return () => window.clearInterval(timer);
    }, [match, refreshMatch]);

    async function joinRandomOpponent() {
        if (!player || joining) return;

        setJoining(true);
        setError("");
        setLatestChoice(null);
        setLatestResult(null);
        setLatestCorrect(null);

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/join`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        playerToken: player.player_token,
                        gameKey: "coin_flip",
                    }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            const joinedMatch = asBasicMatch(data.match);

            if (!response.ok || !joinedMatch) {
                if (response.status === 401) clearPlayer();
                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Unable to find an opponent.",
                );
            }

            setMatch({
                ...joinedMatch,
                your_score: 0,
                opponent_score: 0,
                your_attempts: 0,
                opponent_attempts: 0,
                you_won: null,
                points_awarded: 0,
                result_code: null,
                player_total_points: player.total_points,
                player_total_wins: player.total_wins,
                player_total_plays: player.total_plays,
            });
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to find an opponent.",
            );
        } finally {
            setJoining(false);
        }
    }

    async function submitGuess(choice: CoinSide) {
        if (!player || !match || guessing || match.match_status !== "active") {
            return;
        }

        setGuessing(true);
        setError("");
        setLatestChoice(choice);

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/coin-flip/guess`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        playerToken: player.player_token,
                        matchToken: match.match_token,
                        choice,
                    }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            const round = asRound(data.round);

            if (!response.ok || !round) {
                if (response.status === 401) clearPlayer();
                if (response.status === 409) void refreshMatch(true);
                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Unable to submit your guess.",
                );
            }

            setLatestResult(round.coin_result);
            setLatestCorrect(round.is_correct);
            setMatch((current) =>
                current
                    ? {
                          ...current,
                          your_score: Number(round.your_score || 0),
                          opponent_score: Number(round.opponent_score || 0),
                          your_attempts: Number(round.your_attempts || 0),
                          seconds_remaining: Number(
                              round.seconds_remaining || 0,
                          ),
                      }
                    : current,
            );
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to submit your guess.",
            );
        } finally {
            window.setTimeout(() => setGuessing(false), 180);
        }
    }

    async function leaveMatch() {
        if (!player || !match || leaving) return;

        setLeaving(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/leave`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        playerToken: player.player_token,
                        matchToken: match.match_token,
                    }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);

            if (!response.ok) {
                if (response.status === 401) clearPlayer();
                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Unable to leave the match.",
                );
            }

            setMatch(null);
            setLatestChoice(null);
            setLatestResult(null);
            setLatestCorrect(null);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Unable to leave the match.",
            );
        } finally {
            setLeaving(false);
        }
    }

    function resetForNextMatch() {
        setMatch(null);
        setLatestChoice(null);
        setLatestResult(null);
        setLatestCorrect(null);
        setError("");
    }

    const timerPercent = useMemo(() => {
        if (!match) return 100;
        return Math.max(
            0,
            Math.min(100, (Number(match.seconds_remaining || 0) / 20) * 100),
        );
    }, [match]);

    return (
        <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-[#F6F5FF] via-white to-[#FFF5FB] px-4 py-5 text-slate-950 sm:px-6 md:py-8">
            <style jsx global>{`
                @keyframes regigo-real-coin-flip {
                    0% { transform: rotateY(0deg) rotateX(0deg) translateY(0); }
                    35% { transform: rotateY(720deg) rotateX(16deg) translateY(-24px); }
                    75% { transform: rotateY(1260deg) rotateX(-8deg) translateY(-8px); }
                    100% { transform: rotateY(1440deg) rotateX(0deg) translateY(0); }
                }

                @keyframes regigo-real-coin-float {
                    0%, 100% { transform: translateY(0) rotateY(0deg); }
                    50% { transform: translateY(-8px) rotateY(18deg); }
                }
            `}</style>
            <div className="mx-auto w-full max-w-5xl space-y-5 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={lobbyHref}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back to Games
                    </Link>

                    <Link
                        href={`/event/${slug}/games/leaderboard`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#4F46E5]/20 bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:border-[#4F46E5]/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                    >
                        <Trophy size={17} aria-hidden="true" />
                        Leaderboards
                    </Link>
                </div>

                <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#17173A] to-[#6B4212] p-6 text-white shadow-2xl sm:p-8 md:p-11">
                    <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#EC4899]/10 blur-3xl md:h-64 md:w-64" />
                    <div className="absolute -bottom-16 right-16 h-44 w-44 rounded-full bg-[#4F46E5]/10 blur-3xl md:h-64 md:w-64" />

                    <div className="relative z-10 max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] sm:px-4 sm:text-sm">
                            <Sparkles size={15} aria-hidden="true" />
                            Random Head-to-Head Challenge
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                            Coin Flip Battle
                        </h1>
                        <p className="mt-3 text-sm font-medium leading-6 text-white/70 sm:text-base sm:leading-7">
                            You will be randomly paired with another checked-in
                            guest at{" "}
                            <span className="font-black text-white">
                                {eventName}
                            </span>
                            . Score the most correct guesses in 20 seconds. The
                            winner earns 10 points.
                        </p>
                    </div>
                </section>

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 shadow-sm">
                        {error}
                    </div>
                )}

                {loadingPlayer ? (
                    <section className="flex min-h-48 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white shadow-sm md:rounded-[2rem]">
                        <Loader2
                            size={30}
                            className="animate-spin text-[#4F46E5]"
                            aria-label="Loading player"
                        />
                    </section>
                ) : !player ? (
                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:rounded-[2rem] md:p-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <UserRound size={23} aria-hidden="true" />
                        </div>
                        <h2 className="mt-5 text-2xl font-black">
                            Verify your event check-in
                        </h2>
                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                            Enter the email or exact full name used for event
                            registration. Only checked-in guests can enter
                            matchmaking.
                        </p>

                        <form onSubmit={verifyPlayer} className="mt-5">
                            <label
                                htmlFor="coin-duel-player"
                                className="text-sm font-black text-slate-700"
                            >
                                Registered email or full name
                            </label>
                            <input
                                id="coin-duel-player"
                                value={lookup}
                                onChange={(event) => setLookup(event.target.value)}
                                maxLength={160}
                                autoComplete="email"
                                placeholder="Registered email or full name"
                                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10"
                            />
                            <button
                                type="submit"
                                disabled={savingPlayer}
                                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 disabled:opacity-60 sm:w-auto"
                            >
                                {savingPlayer && (
                                    <Loader2 size={17} className="animate-spin" />
                                )}
                                Verify and continue
                            </button>
                        </form>
                    </section>
                ) : (
                    <>
                        <section className="grid grid-cols-3 gap-3 sm:gap-4">
                            <StatCard
                                label="Points"
                                value={player.total_points}
                                icon={Trophy}
                            />
                            <StatCard
                                label="Wins"
                                value={player.total_wins}
                                icon={CheckCircle2}
                            />
                            <StatCard
                                label="Matches"
                                value={player.total_plays}
                                icon={Swords}
                            />
                        </section>

                        {!match ? (
                            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8 md:rounded-[2rem] md:p-10">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F7F5FF] text-[#4F46E5]">
                                    <Users size={30} aria-hidden="true" />
                                </div>
                                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                    Playing as {player.display_name}
                                </p>
                                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                                    Find a random opponent
                                </h2>
                                <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">
                                    Regigo will pair you with one random checked-in
                                    guest waiting for Coin Flip.
                                </p>
                                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={joinRandomOpponent}
                                        disabled={joining}
                                        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-6 py-4 text-base font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 disabled:opacity-60"
                                    >
                                        {joining ? (
                                            <Loader2
                                                size={19}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <Swords size={19} aria-hidden="true" />
                                        )}
                                        Find random opponent
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearPlayer}
                                        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
                                    >
                                        <UserRound size={18} aria-hidden="true" />
                                        Change guest
                                    </button>
                                </div>
                            </section>
                        ) : match.match_status === "waiting" ? (
                            <WaitingPanel
                                playerName={player.display_name}
                                refreshing={refreshing}
                                leaving={leaving}
                                onRefresh={() => void refreshMatch(false)}
                                onLeave={leaveMatch}
                            />
                        ) : match.match_status === "countdown" ? (
                            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10 md:rounded-[2rem]">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
                                    Opponent found
                                </p>
                                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                                    You vs {match.opponent_name || "Guest"}
                                </h2>
                                <div className="mx-auto mt-7 flex h-32 w-32 items-center justify-center rounded-full bg-[#F7F5FF] text-6xl font-black text-[#4F46E5] sm:h-40 sm:w-40 sm:text-7xl">
                                    {Math.max(
                                        1,
                                        Number(match.seconds_until_start || 1),
                                    )}
                                </div>
                                <p className="mt-5 text-sm font-bold text-slate-500">
                                    Get ready. The 20-second challenge starts
                                    automatically.
                                </p>
                            </section>
                        ) : match.match_status === "active" ? (
                            <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl sm:p-6 md:p-8">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <ScoreCard
                                        label="You"
                                        name={player.display_name}
                                        score={match.your_score}
                                    />
                                    <ScoreCard
                                        label="Opponent"
                                        name={match.opponent_name || "Guest"}
                                        score={match.opponent_score}
                                    />
                                </div>

                                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur sm:p-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                                Time remaining
                                            </p>
                                            <p className="mt-1 text-4xl font-black sm:text-5xl">
                                                {Math.max(
                                                    0,
                                                    Number(
                                                        match.seconds_remaining ||
                                                            0,
                                                    ),
                                                )}
                                                s
                                            </p>
                                        </div>
                                        <Coins
                                            size={38}
                                            className="text-[#EC4899]"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899] transition-[width] duration-500"
                                            style={{ width: `${timerPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/10 p-5 text-center backdrop-blur sm:p-7">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                        Guess quickly
                                    </p>
                                    <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                                        Heads or tails?
                                    </h2>
                                    <p className="mt-2 text-sm font-medium leading-6 text-white/55">
                                        Every correct guess adds one to your match
                                        score. Keep guessing until time runs out.
                                    </p>

                                    <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-inner">
                                        <div className="relative">
                                            <div className="absolute inset-[-28px] rounded-full bg-amber-300/20 blur-2xl" />
                                            <RealCoin
                                                side={
                                                    latestResult ||
                                                    latestChoice ||
                                                    "heads"
                                                }
                                                spinning={guessing}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                                        <GuessButton
                                            side="heads"
                                            disabled={guessing}
                                            onClick={() => submitGuess("heads")}
                                        />
                                        <GuessButton
                                            side="tails"
                                            disabled={guessing}
                                            onClick={() => submitGuess("tails")}
                                        />
                                    </div>

                                    <div className="mt-5 min-h-24 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                                        {guessing ? (
                                            <div className="flex h-16 items-center justify-center">
                                                <Loader2
                                                    size={27}
                                                    className="animate-spin text-[#4F46E5]"
                                                />
                                            </div>
                                        ) : latestResult ? (
                                            <>
                                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                                    You chose {latestChoice}
                                                </p>
                                                <p className="mt-2 text-2xl font-black capitalize text-white">
                                                    Result: {latestResult}
                                                </p>
                                                <p
                                                    className={`mt-1 text-sm font-black ${
                                                        latestCorrect
                                                            ? "text-emerald-600"
                                                            : "text-red-600"
                                                    }`}
                                                >
                                                    {latestCorrect
                                                        ? "Correct. Score added!"
                                                        : "Not this time. Guess again!"}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="flex h-16 items-center justify-center text-sm font-bold text-white/50">
                                                Choose a side to start scoring.
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={leaveMatch}
                                        disabled={leaving}
                                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                    >
                                        {leaving ? (
                                            <Loader2
                                                size={17}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <LogOut size={17} aria-hidden="true" />
                                        )}
                                        Leave match (forfeit)
                                    </button>
                                </div>
                            </section>
                        ) : match.match_status === "completed" ? (
                            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8 md:rounded-[2rem] md:p-10">
                                <Trophy
                                    size={46}
                                    className={`mx-auto ${
                                        match.you_won
                                            ? "text-[#4F46E5]"
                                            : "text-slate-400"
                                    }`}
                                    aria-hidden="true"
                                />
                                <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                    Challenge complete
                                </p>
                                <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                                    {match.you_won
                                        ? "You won!"
                                        : `${match.opponent_name || "Your opponent"} won`}
                                </h2>
                                <p className="mt-2 text-sm font-bold text-slate-500">
                                    {match.you_won
                                        ? "10 points have been added to your leaderboard score."
                                        : "No points this round. Try another random opponent."}
                                </p>

                                <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:gap-4">
                                    <ScoreCard
                                        label="Your final score"
                                        name={player.display_name}
                                        score={match.your_score}
                                    />
                                    <ScoreCard
                                        label="Opponent score"
                                        name={match.opponent_name || "Guest"}
                                        score={match.opponent_score}
                                    />
                                </div>

                                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={resetForNextMatch}
                                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA]"
                                    >
                                        <RotateCcw size={17} aria-hidden="true" />
                                        Find another opponent
                                    </button>
                                    <Link
                                        href={`/event/${slug}/games/leaderboard`}
                                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
                                    >
                                        <Trophy size={17} aria-hidden="true" />
                                        View leaderboard
                                    </Link>
                                </div>
                            </section>
                        ) : (
                            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm md:rounded-[2rem]">
                                <h2 className="text-2xl font-black">
                                    Match cancelled
                                </h2>
                                <button
                                    type="button"
                                    onClick={resetForNextMatch}
                                    className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white"
                                >
                                    <RotateCcw size={17} />
                                    Try again
                                </button>
                            </section>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Trophy;
}) {
    return (
        <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <Icon size={19} className="text-[#4F46E5]" aria-hidden="true" />
            <p className="mt-3 truncate text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
                {label}
            </p>
            <p className="mt-1 truncate text-xl font-black sm:text-3xl">
                {value}
            </p>
        </div>
    );
}

function ScoreCard({
    label,
    name,
    score,
}: {
    label: string;
    name: string;
    score: number;
}) {
    return (
        <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-left text-white backdrop-blur sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#4F46E5] sm:text-xs">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-black text-white/70 sm:text-base">
                {name}
            </p>
            <p className="mt-3 bg-gradient-to-r from-[#FDE68A] to-[#F9A8D4] bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                {score}
            </p>
        </div>
    );
}

function GuessButton({
    side,
    disabled,
    onClick,
}: {
    side: CoinSide;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`min-h-28 rounded-[1.5rem] border bg-white/10 p-4 text-center text-white shadow-lg backdrop-blur transition active:scale-[0.98] disabled:opacity-60 sm:min-h-36 ${
                side === "heads"
                    ? "border-indigo-300/30 hover:border-indigo-300/70 hover:bg-indigo-400/15"
                    : "border-pink-300/30 hover:border-pink-300/70 hover:bg-pink-400/15"
            }`}
        >
            <div className="flex justify-center">
                <RealCoin side={side} compact />
            </div>
            <span className="mt-3 block text-xl font-black capitalize sm:text-2xl">
                {side}
            </span>
        </button>
    );
}

function WaitingPanel({
    playerName,
    refreshing,
    leaving,
    onRefresh,
    onLeave,
}: {
    playerName: string;
    refreshing: boolean;
    leaving: boolean;
    onRefresh: () => void;
    onLeave: () => void;
}) {
    return (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8 md:rounded-[2rem] md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F7F5FF] text-[#4F46E5]">
                <Wifi size={30} className="animate-pulse" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                Random matchmaking
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Searching for another checked-in guest
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">
                {playerName}, keep this page open. The challenge starts
                automatically after Regigo finds a random opponent.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/30 hover:text-[#4F46E5] disabled:opacity-60"
                >
                    <RefreshCw
                        size={17}
                        className={refreshing ? "animate-spin" : ""}
                    />
                    Check now
                </button>
                <button
                    type="button"
                    onClick={onLeave}
                    disabled={leaving}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                    {leaving ? (
                        <Loader2 size={17} className="animate-spin" />
                    ) : (
                        <LogOut size={17} aria-hidden="true" />
                    )}
                    Cancel search
                </button>
            </div>
        </section>
    );
}

"use client";

import Link from "next/link";
import {
    FormEvent,
    ReactNode,
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Crown,
    Gamepad2,
    Loader2,
    LogOut,
    RotateCcw,
    Sparkles,
    Swords,
    Trophy,
    UserRound,
    Users,
    Wifi,
} from "lucide-react";

export type MatchStatus =
    | "waiting"
    | "countdown"
    | "active"
    | "completed"
    | "cancelled";

export type PlayerProfile = {
    player_token: string;
    display_name: string;
    total_points: number;
    total_wins: number;
    total_plays: number;
};

export type CommonDuelState = {
    match_token: string;
    match_status: MatchStatus;
    opponent_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    seconds_until_start: number;
    seconds_remaining: number;
    your_score: number;
    opponent_score: number;
    you_won: boolean | null;
    points_awarded: number;
    result_code: string | null;
    player_total_points: number;
    player_total_wins: number;
    player_total_plays: number;
};

type JsonObject = Record<string, unknown>;

export async function readJson(response: Response): Promise<JsonObject> {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text) as JsonObject;
    } catch {
        const html = text.trimStart().startsWith("<!DOCTYPE");
        throw new Error(
            html
                ? `The API route returned a web page (${response.status}). Check the app/api folder path and restart Next.js.`
                : "The server returned an invalid response.",
        );
    }
}

export function asObject<T>(value: unknown): T | null {
    return value && typeof value === "object" ? (value as T) : null;
}

export function useVerifiedGlitterPlayer({
    eventId,
    slug,
}: {
    eventId: string;
    slug: string;
}) {
    const storageKey = `regigo:glitter-player:${eventId}`;
    const [player, setPlayer] = useState<PlayerProfile | null>(null);
    const [lookup, setLookup] = useState("");
    const [loadingPlayer, setLoadingPlayer] = useState(true);
    const [savingPlayer, setSavingPlayer] = useState(false);
    const [error, setError] = useState("");

    const clearPlayer = useCallback(() => {
        window.localStorage.removeItem(storageKey);
        setPlayer(null);
    }, [storageKey]);

    useEffect(() => {
        let cancelled = false;

        async function restore() {
            const token = window.localStorage.getItem(storageKey);
            if (!token) {
                setLoadingPlayer(false);
                return;
            }

            try {
                const response = await fetch(
                    `/api/public/events/${encodeURIComponent(slug)}/games/player`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ playerToken: token }),
                        cache: "no-store",
                    },
                );
                const data = await readJson(response);
                const restored = asObject<PlayerProfile>(data.player);

                if (!response.ok || !restored) {
                    window.localStorage.removeItem(storageKey);
                    return;
                }

                if (!cancelled) setPlayer(restored);
            } catch (caught) {
                if (!cancelled) {
                    setError(
                        caught instanceof Error
                            ? caught.message
                            : "Unable to restore your player session.",
                    );
                }
            } finally {
                if (!cancelled) setLoadingPlayer(false);
            }
        }

        void restore();
        return () => {
            cancelled = true;
        };
    }, [slug, storageKey]);

    async function verifyPlayer(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = lookup.trim();

        if (value.length < 2 || value.length > 160) {
            setError("Enter the email or full name used for registration.");
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
                    body: JSON.stringify({ lookup: value }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            const verified = asObject<PlayerProfile>(data.player);

            if (!response.ok || !verified) {
                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "Unable to verify the checked-in guest.",
                );
            }

            window.localStorage.setItem(storageKey, verified.player_token);
            setPlayer(verified);
            setLookup("");
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to verify the checked-in guest.",
            );
        } finally {
            setSavingPlayer(false);
        }
    }

    const updatePlayerTotals = useCallback(
        (values: {
            player_total_points?: number;
            player_total_wins?: number;
            player_total_plays?: number;
        }) => {
            setPlayer((current) =>
                current
                    ? {
                          ...current,
                          total_points: Number(
                              values.player_total_points ?? current.total_points,
                          ),
                          total_wins: Number(
                              values.player_total_wins ?? current.total_wins,
                          ),
                          total_plays: Number(
                              values.player_total_plays ?? current.total_plays,
                          ),
                      }
                    : current,
            );
        },
        [],
    );

    return {
        player,
        setPlayer,
        lookup,
        setLookup,
        loadingPlayer,
        savingPlayer,
        error,
        setError,
        verifyPlayer,
        clearPlayer,
        updatePlayerTotals,
    };
}

export function GameFrame({
    title,
    subtitle,
    eventName,
    lobbyHref,
    slug,
    icon,
    error,
    children,
}: {
    title: string;
    subtitle: string;
    eventName: string;
    lobbyHref: string;
    slug: string;
    icon: ReactNode;
    error?: string;
    children: ReactNode;
}) {
    return (
        <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-[#F6F5FF] via-white to-[#FFF5FB] px-4 py-5 text-slate-950 sm:px-6 md:py-8">
            <div className="pointer-events-none fixed left-[-15%] top-[-20%] h-96 w-96 rounded-full bg-[#4F46E5]/10 blur-3xl" />
            <div className="pointer-events-none fixed bottom-[-25%] right-[-15%] h-[30rem] w-[30rem] rounded-full bg-[#EC4899]/10 blur-3xl" />

            <div className="relative mx-auto w-full max-w-5xl space-y-5 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={lobbyHref}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back to Games
                    </Link>
                    <Link
                        href={`/event/${slug}/games/leaderboard`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#4F46E5]/15 bg-white/85 px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[#4F46E5]/35 hover:shadow-md"
                    >
                        <Trophy size={17} aria-hidden="true" />
                        Leaderboards
                    </Link>
                </div>

                <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#17173A] to-[#4A1748] p-6 text-white shadow-2xl sm:p-8 md:p-11">
                    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#EC4899]/25 blur-3xl" />
                    <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#4F46E5]/30 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

                    <div className="relative z-10 max-w-3xl">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur">
                            {icon}
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white/85 backdrop-blur">
                            <Sparkles size={15} aria-hidden="true" />
                            Live head-to-head challenge
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                            {title}
                        </h1>
                        <p className="mt-3 text-sm font-medium leading-6 text-white/70 sm:text-base sm:leading-7">
                            {subtitle} Compete against another checked-in guest at{" "}
                            <span className="font-black text-white">{eventName}</span>.
                            The winner earns 10 points.
                        </p>
                    </div>
                </section>

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-white/90 px-4 py-3 text-sm font-bold text-red-700 shadow-sm backdrop-blur">
                        {error}
                    </div>
                )}

                {children}
            </div>
        </main>
    );
}

export function PlayerGate({
    loading,
    player,
    lookup,
    setLookup,
    saving,
    onSubmit,
}: {
    loading: boolean;
    player: PlayerProfile | null;
    lookup: string;
    setLookup: (value: string) => void;
    saving: boolean;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    if (loading) {
        return (
            <section className="flex min-h-48 items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 shadow-lg backdrop-blur">
                <Loader2 size={30} className="animate-spin text-[#4F46E5]" />
            </section>
        );
    }

    if (player) return null;

    return (
        <section className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.38fr_0.62fr]">
            <div className="relative flex min-h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-[#4F46E5] via-[#6D4BEA] to-[#EC4899] p-6 text-white sm:p-8">
                <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full border-[26px] border-white/10" />
                <div className="relative z-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur">
                        <UserRound size={23} aria-hidden="true" />
                    </div>
                    <h2 className="mt-5 text-2xl font-black">Verify your check-in</h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-white/75">
                        One verified profile works across every Glitter Game and leaderboard.
                    </p>
                </div>
            </div>

            <div className="p-6 sm:p-8">
                <p className="max-w-xl text-sm font-medium leading-6 text-slate-500">
                    Enter the exact email or full name used for event registration. Only checked-in guests can play.
                </p>
                <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                        value={lookup}
                        onChange={(event) => setLookup(event.target.value)}
                        maxLength={160}
                        placeholder="Registered email or full name"
                        autoComplete="email"
                        className="min-h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10"
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
                    >
                        {saving && <Loader2 size={17} className="animate-spin" />}
                        Verify and continue
                    </button>
                </form>
            </div>
        </section>
    );
}

export function PlayerStats({ player }: { player: PlayerProfile }) {
    return (
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
            <SmallStat label="Points" value={player.total_points} icon={<Trophy size={19} />} />
            <SmallStat label="Wins" value={player.total_wins} icon={<Crown size={19} />} />
            <SmallStat label="Matches" value={player.total_plays} icon={<Gamepad2 size={19} />} />
        </section>
    );
}

function SmallStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
    return (
        <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F46E5] to-[#EC4899]" />
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F5FF] text-[#4F46E5]">{icon}</div>
            <p className="mt-3 truncate text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">{label}</p>
            <p className="mt-1 truncate text-xl font-black sm:text-3xl">{value}</p>
        </div>
    );
}

export function MatchmakingPanel({
    playerName,
    status,
    joining,
    leaving,
    onJoin,
    onLeave,
    onChangePlayer,
}: {
    playerName: string;
    status?: MatchStatus | null;
    joining: boolean;
    leaving: boolean;
    onJoin: () => void;
    onLeave: () => void;
    onChangePlayer: () => void;
}) {
    const waiting = status === "waiting";

    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#17173A] to-[#321738] p-6 text-center text-white shadow-2xl sm:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#EC4899]/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-[#4F46E5]/25 blur-3xl" />
            <div className="relative z-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-white backdrop-blur">
                    {waiting ? <Wifi size={30} className="animate-pulse" /> : <Users size={30} />}
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/55">
                    {waiting ? "Random matchmaking" : `Playing as ${playerName}`}
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    {waiting ? "Searching for an opponent" : "Ready for a new challenge?"}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-white/60">
                    {waiting
                        ? `${playerName}, keep this screen open. You will be paired automatically.`
                        : "Regigo pairs you with another checked-in guest waiting for the same game."}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                    {waiting ? (
                        <button
                            type="button"
                            onClick={onLeave}
                            disabled={leaving}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-60"
                        >
                            {leaving ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
                            Cancel search
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onJoin}
                                disabled={joining}
                                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 text-base font-black text-white shadow-xl transition hover:scale-[1.02] disabled:opacity-60"
                            >
                                {joining ? <Loader2 size={19} className="animate-spin" /> : <Swords size={19} />}
                                Find random opponent
                            </button>
                            <button
                                type="button"
                                onClick={onChangePlayer}
                                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/15"
                            >
                                <UserRound size={18} /> Change guest
                            </button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

export function DuelScoreboard({
    playerName,
    opponentName,
    yourScore,
    opponentScore,
    seconds,
    label = "Score",
}: {
    playerName: string;
    opponentName: string | null;
    yourScore: number;
    opponentScore: number;
    seconds: number;
    label?: string;
}) {
    return (
        <section className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 rounded-[1.75rem] bg-slate-950 p-2 shadow-xl sm:gap-4 sm:p-3">
            <ScoreCard name={playerName} score={yourScore} label="You" />
            <div className="flex min-w-16 flex-col items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/10 px-2 py-3 text-white backdrop-blur sm:min-w-24">
                <Clock3 size={18} className="text-white/55" />
                <span className="mt-1 text-2xl font-black sm:text-3xl">{seconds}</span>
                <span className="text-[9px] font-black uppercase tracking-wide text-white/45">seconds</span>
            </div>
            <ScoreCard name={opponentName || "Opponent"} score={opponentScore} label={label} />
        </section>
    );
}

function ScoreCard({ name, score, label }: { name: string; score: number; label: string }) {
    return (
        <div className="min-w-0 rounded-[1.25rem] border border-white/10 bg-white/10 p-3 text-center text-white backdrop-blur sm:p-5">
            <p className="truncate text-[10px] font-black uppercase tracking-wide text-white/45">{label}</p>
            <p className="mt-1 truncate text-sm font-black sm:text-base">{name}</p>
            <p className="mt-2 bg-gradient-to-r from-[#A5B4FC] to-[#F9A8D4] bg-clip-text text-3xl font-black text-transparent sm:text-5xl">{score}</p>
        </div>
    );
}

export function CountdownCard({ seconds, opponentName }: { seconds: number; opponentName: string | null }) {
    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-8 text-center text-white shadow-2xl sm:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 to-[#EC4899]/20" />
            <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Opponent found</p>
                <h2 className="mt-2 text-2xl font-black">You vs {opponentName || "Guest"}</h2>
                <div className="mx-auto mt-7 flex h-36 w-36 items-center justify-center rounded-full border border-white/15 bg-white/10 text-7xl font-black shadow-2xl backdrop-blur sm:h-44 sm:w-44 sm:text-8xl">
                    {Math.max(1, seconds)}
                </div>
                <p className="mt-5 text-sm font-bold text-white/55">The challenge begins automatically.</p>
            </div>
        </section>
    );
}

export function ResultPanel({
    won,
    points,
    opponentName,
    yourScore,
    opponentScore,
    joining,
    onPlayAgain,
    slug,
}: {
    won: boolean | null;
    points: number;
    opponentName: string | null;
    yourScore: number;
    opponentScore: number;
    joining: boolean;
    onPlayAgain: () => void;
    slug: string;
}) {
    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-[#17173A] to-[#321738] p-6 text-center text-white shadow-2xl sm:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#EC4899]/20 blur-3xl" />
            <div className="relative z-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur">
                    {won ? <Crown size={32} /> : <Trophy size={32} />}
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/55">Challenge complete</p>
                <h2 className="mt-2 text-3xl font-black">{won ? "You won" : `${opponentName || "Your opponent"} won`}</h2>
                <p className="mt-2 text-sm font-bold text-white/60">Final score: {yourScore} to {opponentScore}. You earned {points} points.</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={onPlayAgain}
                        disabled={joining}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg hover:opacity-90 disabled:opacity-60"
                    >
                        {joining ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />}
                        Play again
                    </button>
                    <Link
                        href={`/event/${slug}/games/leaderboard`}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                    >
                        <Trophy size={17} /> View leaderboard
                    </Link>
                </div>
            </div>
        </section>
    );
}

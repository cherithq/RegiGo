"use client";

import {
    Award,
    Coins,
    Crown,
    Loader2,
    QrCode,
    Swords,
    Trophy,
    Users,
    Zap,
} from "lucide-react";
import QRCode from "qrcode";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type Leader = {
    position: number;
    name: string;
    taps: number;
    score?: number;
    scoreLabel?: string;
    advanced: boolean;
    playerStatus: string;
};

type TicTacToeMatch = {
    id: string;
    pairNumber: number;
    playerXName: string;
    playerOName?: string | null;
    status: string;
    winnerName?: string | null;
    rematchCount?: number;
};

type DisplayState = {
    eventName?: string;
    tournamentStatus?: string;
    currentRound?: number;
    joinedPlayers?: number;
    activePlayers?: number;
    championName?: string | null;
    roundStatus?: string | null;
    roundNumber?: number | null;
    playerCount?: number | null;
    advanceCount?: number | null;
    isFinal?: boolean | null;
    secondsUntilStart?: number;
    secondsRemaining?: number;
    leaderboard?: Leader[];
    gameKey?:
        | "tap_fast"
        | "coin_flip"
        | "tic_tac_toe";
    gameTitle?: string;
    scoreLabel?: string;
    completedPlayers?: number;
    tttTotalMatches?: number;
    tttCompletedMatches?: number;
    tttMatches?: TicTacToeMatch[];
};

export default function TapTournamentDisplay({
    slug,
}: {
    slug: string;
}) {
    const [state, setState] =
        useState<DisplayState>({});
    const [loading, setLoading] =
        useState(true);
    const [qrDataUrl, setQrDataUrl] =
        useState("");

    const joinUrl = useMemo(
        () =>
            typeof window === "undefined"
                ? `/event/${slug}/games`
                : `${window.location.origin}/event/${slug}/games`,
        [slug]
    );

    const reload = useCallback(async () => {
        const response = await fetch(
            `/api/public/events/${encodeURIComponent(
                slug
            )}/games/tournament/display`,
            {
                cache: "no-store",
            }
        );
        const data = await response.json();

        if (response.ok) {
            setState(data.state || {});
        }

        setLoading(false);
    }, [slug]);

    useEffect(() => {
        void reload();

        const timer = window.setInterval(
            () => void reload(),
            500
        );

        return () =>
            window.clearInterval(timer);
    }, [reload]);

    useEffect(() => {
        void QRCode.toDataURL(joinUrl, {
            width: 760,
            margin: 1,
            errorCorrectionLevel: "H",
        }).then(setQrDataUrl);
    }, [joinUrl]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2
                    size={42}
                    className="animate-spin"
                />
            </div>
        );
    }

    const status =
        state.tournamentStatus ||
        "not_created";
    const leaderboard =
        state.leaderboard || [];
    const highestScore = Math.max(
        1,
        ...leaderboard.map(
            (entry) => entry.score ?? entry.taps
        )
    );
    const topThree = leaderboard.slice(0, 3);
    const finalistsConfirmed =
        status === "round_complete" &&
        Number(state.activePlayers || 0) <= 10 &&
        Number(state.activePlayers || 0) > 1 &&
        !state.isFinal;

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-8 text-white md:px-10 md:py-12">
            <div className="pointer-events-none absolute left-[-15%] top-[-35%] h-[720px] w-[720px] rounded-full bg-[#4F46E5]/35 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-40%] right-[-15%] h-[780px] w-[780px] rounded-full bg-[#EC4899]/25 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-[1800px]">
                {status === "not_created" ? (
                    <CenteredMessage
                        title="Tap Tournament"
                        subtitle="Waiting for the organiser to open the tournament."
                    />
                ) : status === "lobby" ? (
                    <div className="grid min-h-[85vh] items-center gap-10 lg:grid-cols-[1fr_620px]">
                        <div>
                            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3 font-black uppercase tracking-[0.16em]">
                                <Zap size={20} />
                                Tournament Games
                            </div>

                            <h1 className="mt-7 max-w-4xl text-6xl font-black leading-[0.95] tracking-tight md:text-8xl">
                                Scan to join the
                                tournament
                            </h1>

                            <p className="mt-6 max-w-3xl text-2xl font-bold leading-10 text-white/55">
                                Scan once and stay on your phone. The organiser
                                selects Tap, Coin Flip or Tic-Tac-Toe for each
                                elimination round.
                            </p>

                            <div className="mt-8 inline-flex items-center gap-4 rounded-[1.5rem] border border-white/15 bg-white/10 px-7 py-5">
                                <Users
                                    size={32}
                                    className="text-indigo-300"
                                />
                                <div>
                                    <p className="text-5xl font-black">
                                        {state.joinedPlayers ||
                                            0}
                                    </p>
                                    <p className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-white/45">
                                        Players Joined
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2.5rem] border border-white/15 bg-white/10 p-7 text-center backdrop-blur-xl">
                            <QrCode
                                className="mx-auto text-indigo-200"
                                size={36}
                            />

                            {qrDataUrl && (
                                <img
                                    src={qrDataUrl}
                                    alt="Join Tap Tournament"
                                    className="mx-auto mt-5 aspect-square w-full rounded-[2rem] bg-white p-5"
                                />
                            )}

                            <p className="mt-5 text-2xl font-black">
                                Scan with your phone
                            </p>
                        </div>
                    </div>
                ) : status === "completed" ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <Crown
                            size={92}
                            className="text-amber-300 drop-shadow-[0_12px_28px_rgba(251,191,36,0.5)]"
                        />
                        <p className="mt-7 text-lg font-black uppercase tracking-[0.28em] text-amber-200">
                            Tournament Champion
                        </p>
                        <h1 className="mt-5 text-7xl font-black tracking-tight md:text-9xl">
                            {state.championName ||
                                "Champion"}
                        </h1>

                        {topThree.length > 0 && (
                            <div className="mt-12 grid w-full max-w-5xl items-end gap-4 md:grid-cols-3">
                                {[topThree[1], topThree[0], topThree[2]]
                                    .filter(Boolean)
                                    .map((entry, index) => {
                                        const podiumPosition =
                                            entry.position;
                                        const heightClass =
                                            podiumPosition === 1
                                                ? "min-h-[270px]"
                                                : podiumPosition === 2
                                                  ? "min-h-[220px]"
                                                  : "min-h-[190px]";

                                        return (
                                            <div
                                                key={`${entry.position}-${entry.name}`}
                                                className={`flex flex-col items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl ${heightClass}`}
                                            >
                                                {podiumPosition === 1 ? (
                                                    <Crown
                                                        size={42}
                                                        className="text-amber-300"
                                                    />
                                                ) : (
                                                    <Award
                                                        size={38}
                                                        className={
                                                            podiumPosition === 2
                                                                ? "text-slate-200"
                                                                : "text-orange-300"
                                                        }
                                                    />
                                                )}

                                                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white/45">
                                                    #{podiumPosition}
                                                </p>
                                                <p className="mt-2 text-3xl font-black">
                                                    {entry.name}
                                                </p>
                                                <p className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-xl font-black">
                                                    {entry.score ??
                                                        entry.taps}{" "}
                                                    {entry.scoreLabel ||
                                                        state.scoreLabel ||
                                                        "points"}
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        <p className="mt-9 text-2xl font-bold text-white/50">
                            Tap, Tap, Tap
                        </p>
                    </div>
                ) : finalistsConfirmed ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <Crown
                            size={72}
                            className="text-amber-300"
                        />
                        <p className="mt-6 text-lg font-black uppercase tracking-[0.24em] text-indigo-200">
                            Finalists Confirmed
                        </p>
                        <h1 className="mt-4 text-6xl font-black md:text-8xl">
                            Final {state.activePlayers || 10}
                        </h1>
                        <p className="mt-5 max-w-3xl text-2xl font-bold text-white/50">
                            These players will compete in one final live round selected by the organiser.
                        </p>

                        <div className="mt-10 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            {leaderboard
                                .filter((entry) => entry.advanced)
                                .slice(
                                    0,
                                    Number(state.activePlayers || 10)
                                )
                                .map((entry) => (
                                    <div
                                        key={`${entry.position}-${entry.name}`}
                                        className="flex min-h-[145px] items-center justify-center rounded-[1.5rem] border border-white/15 bg-white/10 p-5 text-center backdrop-blur-xl"
                                    >
                                        <p className="text-2xl font-black">
                                            {entry.name}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-wrap items-end justify-between gap-6">
                            <div>
                                <p className="text-lg font-black uppercase tracking-[0.2em] text-indigo-300">
                                    {state.isFinal
                                        ? "Live Final"
                                        : state.roundNumber
                                          ? `Round ${state.roundNumber}`
                                          : "Tournament"}
                                </p>
                                <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
                                    {state.gameKey === "tic_tac_toe"
                                        ? "Tic-Tac-Toe"
                                        : state.gameTitle || "Tournament Game"}
                                </h1>
                                <p className="mt-4 text-xl font-bold text-white/50">
                                    {state.playerCount ||
                                        state.activePlayers ||
                                        0}{" "}
                                    players ·{" "}
                                    {state.isFinal
                                        ? "1 champion"
                                        : `${state.advanceCount || 0} advance`}
                                </p>
                            </div>

                            <div className="rounded-[2rem] border border-white/15 bg-white/10 px-8 py-5 text-center backdrop-blur">
                                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/45">
                                    {status === "countdown"
                                        ? "Starting In"
                                        : status === "round_complete"
                                          ? "Round Complete"
                                          : state.gameKey === "tic_tac_toe"
                                            ? "Matches Finished"
                                            : state.gameKey === "coin_flip"
                                              ? "Players Finished"
                                              : "Time Left"}
                                </p>
                                <p className="mt-2 text-7xl font-black">
                                    {status === "countdown"
                                        ? state.secondsUntilStart || 0
                                        : status === "round_complete"
                                          ? "Done"
                                          : state.gameKey === "tic_tac_toe"
                                            ? `${state.tttCompletedMatches || 0}/${state.tttTotalMatches || 0}`
                                            : state.gameKey === "coin_flip"
                                              ? `${state.completedPlayers || 0}/${state.playerCount || 0}`
                                              : state.secondsRemaining || 0}
                                </p>
                            </div>
                        </div>

                        {state.gameKey === "tic_tac_toe" ? (
                            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {(state.tttMatches || []).length === 0 ? (
                                    <CenteredMessage
                                        title="Creating Match Pairings"
                                        subtitle="Every active guest will receive one opponent. An odd player receives a bye."
                                    />
                                ) : (
                                    (state.tttMatches || []).map((match) => (
                                        <div
                                            key={match.id}
                                            className={`rounded-[1.5rem] border p-6 backdrop-blur ${
                                                match.status === "completed" ||
                                                match.status === "bye"
                                                    ? "border-emerald-300/30 bg-emerald-300/10"
                                                    : "border-white/10 bg-white/[0.07]"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                                    <Swords size={24} />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-[0.16em] text-white/40">
                                                    Match {match.pairNumber}
                                                </p>
                                            </div>

                                            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                                                <p className="text-2xl font-black">
                                                    {match.playerXName}
                                                </p>
                                                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/45">
                                                    VS
                                                </span>
                                                <p className="text-2xl font-black">
                                                    {match.playerOName || "BYE"}
                                                </p>
                                            </div>

                                            <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-center">
                                                <p className="text-sm font-black">
                                                    {match.winnerName
                                                        ? `Winner: ${match.winnerName}`
                                                        : match.status === "bye"
                                                          ? `${match.playerXName} advances`
                                                          : "Match in progress"}
                                                </p>
                                                {Number(match.rematchCount || 0) > 0 && (
                                                    <p className="mt-1 text-xs font-bold text-amber-200">
                                                        Draw rematches: {match.rematchCount}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                        <div className="mt-10 grid gap-4">
                            {leaderboard.length ===
                            0 ? (
                                <CenteredMessage
                                    title={
                                        status ===
                                        "locked"
                                            ? "Players Locked"
                                            : "Waiting for scores"
                                    }
                                    subtitle={
                                        status ===
                                        "locked"
                                            ? "The organiser will start Round 1 shortly."
                                            : "The leaderboard updates live while everyone taps."
                                    }
                                />
                            ) : (
                                leaderboard.map(
                                    (entry) => {
                                        const width =
                                            Math.max(
                                                8,
                                                ((entry.score ??
                                                    entry.taps) /
                                                    highestScore) *
                                                    100
                                            );

                                        return (
                                            <div
                                                key={`${entry.position}-${entry.name}`}
                                                className={`relative overflow-hidden rounded-[1.5rem] border px-6 py-5 backdrop-blur ${
                                                    entry.advanced
                                                        ? "border-emerald-300/25 bg-emerald-300/10"
                                                        : "border-white/10 bg-white/[0.07]"
                                                }`}
                                            >
                                                <div
                                                    className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-[#4F46E5]/25 to-[#EC4899]/15 transition-all duration-500"
                                                    style={{
                                                        width: `${width}%`,
                                                    }}
                                                />

                                                <div className="relative grid grid-cols-[80px_1fr_auto] items-center gap-5">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black">
                                                        {entry.position ===
                                                        1 ? (
                                                            <Trophy
                                                                size={
                                                                    28
                                                                }
                                                                className="text-amber-300"
                                                            />
                                                        ) : (
                                                            `#${entry.position}`
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="truncate text-3xl font-black md:text-4xl">
                                                            {
                                                                entry.name
                                                            }
                                                        </p>
                                                        <p className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-white/40">
                                                            {entry.advanced
                                                                ? state.isFinal
                                                                    ? "Leading"
                                                                    : "Advancing"
                                                                : "Below cut line"}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl bg-white/10 px-6 py-4 text-right">
                                                        <p className="text-4xl font-black">
                                                            {
                                                                entry.score ??
                                                                entry.taps
                                                            }
                                                        </p>
                                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                                            {entry.scoreLabel ||
                                                    state.scoreLabel ||
                                                    "Points"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                )
                            )}
                        </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

function CenteredMessage({
    title,
    subtitle,
}: {
    title: string;
    subtitle: string;
}) {
    return (
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <Zap
                size={58}
                className="text-indigo-300"
            />
            <h2 className="mt-5 text-5xl font-black">
                {title}
            </h2>
            <p className="mt-4 max-w-2xl text-xl font-bold text-white/45">
                {subtitle}
            </p>
        </div>
    );
}

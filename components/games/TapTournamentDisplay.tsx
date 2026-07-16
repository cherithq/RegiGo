"use client";

import {
    AlertTriangle,
    ArrowUpDown,
    Award,
    Calculator,
    CircleDollarSign,
    Coins,
    Crown,
    Eye,
    Grid2X2,
    Hash,
    Info,
    ListOrdered,
    Loader2,
    Megaphone,
    Palette,
    Pause,
    PartyPopper,
    QrCode,
    Swords,
    Trophy,
    UserRoundCheck,
    UserRoundX,
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
        | "tic_tac_toe"
        | "grab_coins"
        | "match_cards"
        | "number_rush"
        | "color_clash"
        | "odd_one_out"
        | "quick_math"
        | "sort_it_out"
        | "higher_lower";
    gameTitle?: string;
    scoreLabel?: string;
    completedPlayers?: number;
    tttTotalMatches?: number;
    tttCompletedMatches?: number;
    tttMatches?: TicTacToeMatch[];
    grabDurationSeconds?: number;
    grabTopScore?: number;
    matchCardDurationSeconds?: number;
    matchCardTopScore?: number;
    matchCardCompletedPlayers?: number;
    numberRushDurationSeconds?: number;
    numberRushTopScore?: number;
    numberRushTopBoards?: number;
    colorClashDurationSeconds?: number;
    colorClashTopScore?: number;
    colorClashTopStreak?: number;
    oddOneOutDurationSeconds?: number;
    oddOneOutTopScore?: number;
    oddOneOutTopStreak?: number;
    quickMathDurationSeconds?: number;
    quickMathTopScore?: number;
    quickMathTopStreak?: number;
    sortItOutDurationSeconds?: number;
    sortItOutTopScore?: number;
    sortItOutTopBoards?: number;
    higherLowerDurationSeconds?: number;
    higherLowerTopScore?: number;
    higherLowerTopStreak?: number;
    readyTargetRound?: number;
    readyCount?: number;
    readyTotal?: number;
    onlineCount?: number;
    allReady?: boolean;
    nextGameKey?: string;
    nextGameTitle?: string;
    presentationState?:
        | "hidden"
        | "revealed"
        | "ready";
    resultsRevealed?: boolean;
    readyOpen?: boolean;
    resultRoundNumber?: number | null;
    resultGameTitle?: string | null;
    resultIsFinal?: boolean;
    advancingCount?: number;
    eliminatedCount?: number;
    advancingNames?: string[];
    eliminatedNames?: string[];
    paused?: boolean;
    pauseReason?: string | null;
    pausedAt?: string | null;
    pausedFromStatus?: string | null;
    pauseElapsedSeconds?: number;
    totalPausedSeconds?: number;
    broadcastActive?: boolean;
    broadcastId?: string | null;
    broadcastTitle?: string | null;
    broadcastMessage?: string | null;
    broadcastTone?:
        | "info"
        | "warning"
        | "celebration"
        | null;
    broadcastDisplayMode?:
        | "banner"
        | "takeover"
        | null;
    broadcastCreatedAt?: string | null;
    broadcastExpiresAt?: string | null;
    broadcastSecondsRemaining?: number | null;
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

    const publicBaseUrl = useMemo(
        () =>
            (
                process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                ""
            ).replace(/\/$/, ""),
        []
    );

    const joinUrl = useMemo(() => {
        const path =
            `/event/${encodeURIComponent(slug)}/games/tournament`;

        if (publicBaseUrl) {
            return `${publicBaseUrl}${path}`;
        }

        return typeof window === "undefined"
            ? path
            : `${window.location.origin}${path}`;
    }, [publicBaseUrl, slug]);

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
        let active = true;

        void QRCode.toDataURL(joinUrl, {
            width: 760,
            margin: 1,
            errorCorrectionLevel: "H",
        })
            .then((dataUrl) => {
                if (active) {
                    setQrDataUrl(dataUrl);
                }
            })
            .catch(() => {
                if (active) {
                    setQrDataUrl("");
                }
            });

        return () => {
            active = false;
        };
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

    if (
        state.broadcastActive &&
        state.broadcastDisplayMode ===
            "takeover"
    ) {
        const warning =
            state.broadcastTone === "warning";
        const celebration =
            state.broadcastTone ===
            "celebration";

        return (
            <main
                className={`relative flex min-h-screen items-center justify-center overflow-hidden px-8 py-12 text-center ${
                    warning
                        ? "bg-gradient-to-br from-amber-950 via-slate-950 to-orange-950 text-white"
                        : celebration
                          ? "bg-gradient-to-br from-fuchsia-950 via-slate-950 to-indigo-950 text-white"
                          : "bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950 text-white"
                }`}
            >
                <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:28px_28px]" />
                <div
                    className={`pointer-events-none absolute h-[760px] w-[760px] rounded-full blur-3xl ${
                        warning
                            ? "bg-amber-500/25"
                            : celebration
                              ? "bg-pink-500/25"
                              : "bg-indigo-500/25"
                    }`}
                />

                <section className="relative z-10 mx-auto max-w-6xl">
                    <span
                        className={`mx-auto flex h-40 w-40 items-center justify-center rounded-full border backdrop-blur ${
                            warning
                                ? "border-amber-300/30 bg-amber-300/15 text-amber-200"
                                : celebration
                                  ? "border-pink-300/30 bg-pink-300/15 text-pink-200"
                                  : "border-indigo-300/30 bg-indigo-300/15 text-indigo-200"
                        }`}
                    >
                        {warning ? (
                            <AlertTriangle
                                size={74}
                            />
                        ) : celebration ? (
                            <PartyPopper
                                size={74}
                            />
                        ) : (
                            <Megaphone
                                size={74}
                            />
                        )}
                    </span>

                    <p className="mt-9 text-xl font-black uppercase tracking-[0.3em] text-white/55">
                        Host Announcement
                    </p>
                    <h1 className="mt-5 text-6xl font-black leading-[0.95] md:text-9xl">
                        {state.broadcastTitle}
                    </h1>
                    <p className="mx-auto mt-8 max-w-5xl text-2xl font-bold leading-10 text-white/60 md:text-4xl md:leading-[1.35]">
                        {state.broadcastMessage}
                    </p>

                    {state.broadcastSecondsRemaining !==
                        null &&
                        state.broadcastSecondsRemaining !==
                            undefined && (
                            <p className="mt-10 inline-flex rounded-full border border-white/15 bg-white/10 px-7 py-4 text-xl font-black backdrop-blur">
                                Returning in{" "}
                                {
                                    state.broadcastSecondsRemaining
                                } seconds
                            </p>
                        )}
                </section>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-8 text-white md:px-10 md:py-12">
            <div className="pointer-events-none absolute left-[-15%] top-[-35%] h-[720px] w-[720px] rounded-full bg-[#4F46E5]/35 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-40%] right-[-15%] h-[780px] w-[780px] rounded-full bg-[#EC4899]/25 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-[1800px]">
                {state.broadcastActive &&
                    state.broadcastDisplayMode ===
                        "banner" && (
                        <section
                            className={`mb-7 rounded-[1.5rem] border px-7 py-5 backdrop-blur-xl ${
                                state.broadcastTone ===
                                "warning"
                                    ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
                                    : state.broadcastTone ===
                                        "celebration"
                                      ? "border-pink-300/30 bg-pink-300/15 text-pink-100"
                                      : "border-indigo-300/30 bg-indigo-300/15 text-indigo-100"
                            }`}
                        >
                            <div className="flex items-center gap-5">
                                <span className="shrink-0">
                                    {state.broadcastTone ===
                                    "warning" ? (
                                        <AlertTriangle
                                            size={32}
                                        />
                                    ) : state.broadcastTone ===
                                      "celebration" ? (
                                        <PartyPopper
                                            size={32}
                                        />
                                    ) : (
                                        <Info size={32} />
                                    )}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                                        Host Announcement
                                    </p>
                                    <h2 className="mt-1 text-2xl font-black">
                                        {
                                            state.broadcastTitle
                                        }
                                    </h2>
                                    <p className="mt-1 text-lg font-bold text-white/65">
                                        {
                                            state.broadcastMessage
                                        }
                                    </p>
                                </div>

                                {state.broadcastSecondsRemaining !==
                                    null &&
                                    state.broadcastSecondsRemaining !==
                                        undefined && (
                                        <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-lg font-black">
                                            {
                                                state.broadcastSecondsRemaining
                                            }s
                                        </span>
                                    )}
                            </div>
                        </section>
                    )}

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
                ) : status === "paused" ||
                  state.paused === true ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <style jsx global>{`
                            @keyframes audience-pause-pulse {
                                0%,
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                                50% {
                                    transform: scale(1.1);
                                    opacity: 0.72;
                                }
                            }
                        `}</style>

                        <span
                            className="flex h-40 w-40 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/15 text-amber-200 backdrop-blur"
                            style={{
                                animation:
                                    "audience-pause-pulse 1.7s ease-in-out infinite",
                            }}
                        >
                            <Pause
                                size={76}
                                strokeWidth={3}
                            />
                        </span>

                        <p className="mt-8 text-lg font-black uppercase tracking-[0.28em] text-amber-200">
                            Round Paused
                        </p>
                        <h1 className="mt-4 text-6xl font-black md:text-8xl">
                            Please Stand By
                        </h1>
                        <p className="mt-6 max-w-4xl text-2xl font-bold leading-10 text-white/55">
                            {state.pauseReason ||
                                "The organiser will resume the tournament shortly. Player time and progress are protected."}
                        </p>
                        <p className="mt-6 rounded-full border border-white/10 bg-white/10 px-6 py-3 text-lg font-black text-white/70">
                            Paused for{" "}
                            {state.pauseElapsedSeconds || 0} seconds
                        </p>
                    </div>
                ) : status === "round_complete" &&
                  state.presentationState === "hidden" ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <style jsx global>{`
                            @keyframes results-orbit {
                                from {
                                    transform: rotate(0deg);
                                }
                                to {
                                    transform: rotate(360deg);
                                }
                            }
                        `}</style>

                        <div className="relative flex h-40 w-40 items-center justify-center">
                            <div
                                className="absolute inset-0 rounded-full border-4 border-white/10 border-t-indigo-300"
                                style={{
                                    animation:
                                        "results-orbit 1.2s linear infinite",
                                }}
                            />
                            <Trophy
                                size={58}
                                className="text-indigo-200"
                            />
                        </div>

                        <p className="mt-8 text-lg font-black uppercase tracking-[0.28em] text-indigo-200">
                            Results Locked
                        </p>
                        <h1 className="mt-4 text-6xl font-black md:text-8xl">
                            Round {state.resultRoundNumber || state.roundNumber || 1}
                        </h1>
                        <p className="mt-5 max-w-3xl text-2xl font-bold text-white/50">
                            Scores are being verified. The organiser will reveal who advances.
                        </p>
                    </div>
                ) : status === "round_complete" &&
                  state.presentationState === "revealed" ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <UserRoundCheck
                            size={74}
                            className="text-emerald-300"
                        />
                        <p className="mt-6 text-lg font-black uppercase tracking-[0.24em] text-emerald-200">
                            Advancing to the Next Round
                        </p>
                        <h1 className="mt-4 text-6xl font-black md:text-8xl">
                            {state.advancingCount || 0} Players
                        </h1>
                        <p className="mt-3 text-xl font-bold text-white/45">
                            Round {state.resultRoundNumber || state.roundNumber || 1} ·{" "}
                            {state.resultGameTitle || state.gameTitle || "Tournament Game"}
                        </p>

                        <div className="mt-10 grid w-full max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                            {(state.advancingNames || []).map(
                                (name, index) => (
                                    <div
                                        key={`${index}-${name}`}
                                        className="flex min-h-[130px] items-center justify-center rounded-[1.5rem] border border-emerald-300/25 bg-emerald-300/10 p-5 text-center backdrop-blur"
                                        style={{
                                            animationDelay: `${index * 80}ms`,
                                        }}
                                    >
                                        <p className="text-2xl font-black">
                                            {name}
                                        </p>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-rose-300/20 bg-rose-300/10 px-6 py-3 text-rose-200">
                            <UserRoundX size={19} />
                            <span className="font-black">
                                {state.eliminatedCount || 0} eliminated this round
                            </span>
                        </div>
                    </div>
                ) : status === "locked" ||
                  (status === "round_complete" &&
                    state.readyOpen === true) ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <UserRoundCheck
                            size={78}
                            className={
                                state.allReady
                                    ? "text-emerald-300"
                                    : "text-indigo-300"
                            }
                        />

                        <p className="mt-6 text-lg font-black uppercase tracking-[0.24em] text-indigo-200">
                            Ready Check
                        </p>
                        <h1 className="mt-4 text-6xl font-black md:text-8xl">
                            {state.readyCount || 0}
                            <span className="text-white/30">
                                /{state.readyTotal || 0}
                            </span>
                        </h1>
                        <p className="mt-4 text-2xl font-black">
                            Players Ready
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-7 py-5 backdrop-blur">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                                    Next Round
                                </p>
                                <p className="mt-2 text-3xl font-black">
                                    {state.readyTargetRound || 1}
                                </p>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-7 py-5 backdrop-blur">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                                    Next Game
                                </p>
                                <p className="mt-2 text-2xl font-black">
                                    {state.nextGameTitle ||
                                        "Tap, Tap, Tap"}
                                </p>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 px-7 py-5 backdrop-blur">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                                    Phones Online
                                </p>
                                <p className="mt-2 text-3xl font-black">
                                    {state.onlineCount || 0}
                                </p>
                            </div>
                        </div>

                        <p className="mt-8 max-w-3xl text-xl font-bold text-white/50">
                            Open the tournament page on your phone and press
                            <span className="text-white">
                                {" "}I Am Ready
                            </span>.
                        </p>

                        {state.allReady && (
                            <div className="mt-7 rounded-full border border-emerald-300/30 bg-emerald-300/15 px-7 py-4 text-lg font-black text-emerald-200">
                                Everyone is ready. The organiser may start the round.
                            </div>
                        )}
                    </div>
                ) : status === "completed" &&
                  !state.resultsRevealed ? (
                    <div className="flex min-h-[85vh] flex-col items-center justify-center text-center">
                        <div className="relative flex h-44 w-44 items-center justify-center">
                            <div className="absolute inset-0 animate-pulse rounded-full bg-amber-300/15 blur-xl" />
                            <Trophy
                                size={86}
                                className="relative text-amber-300"
                            />
                        </div>
                        <p className="mt-7 text-lg font-black uppercase tracking-[0.28em] text-amber-200">
                            Final Results Locked
                        </p>
                        <h1 className="mt-5 text-6xl font-black md:text-8xl">
                            Champion Reveal
                        </h1>
                        <p className="mt-6 text-2xl font-bold text-white/50">
                            The organiser will reveal the winner shortly.
                        </p>
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
                                                    {state.scoreLabel ||
                                                        entry.scoreLabel ||
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
                                        : state.gameKey === "higher_lower"
                                          ? "Higher or Lower"
                                          : state.gameKey === "sort_it_out"
                                            ? "Sort It Out"
                                            : state.gameKey === "quick_math"
                                            ? "Quick Maths"
                                            : state.gameKey === "odd_one_out"
                                            ? "Odd One Out"
                                            : state.gameKey === "color_clash"
                                            ? "Colour Clash"
                                            : state.gameKey === "number_rush"
                                            ? "Number Rush"
                                            : state.gameKey === "match_cards"
                                            ? "Match the Cards"
                                            : state.gameKey === "grab_coins"
                                          ? "Grab the Coins"
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

                        {state.gameKey === "higher_lower" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-sky-300/20 bg-sky-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-cyan-300 to-indigo-400 text-slate-950 shadow-[0_12px_35px_rgba(56,189,248,0.34)]">
                                        <ArrowUpDown
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-200">
                                            Live Prediction Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Higher or lower than the current number?
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-sky-200">
                                            {state.higherLowerTopScore || 0}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Best Streak
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-cyan-200">
                                            {state.higherLowerTopStreak || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "sort_it_out" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-lime-300/20 bg-lime-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-300 to-cyan-300 text-slate-950 shadow-[0_12px_35px_rgba(132,204,22,0.34)]">
                                        <ListOrdered
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-200">
                                            Live Sorting Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Tap smallest to largest
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-lime-200">
                                            {state.sortItOutTopScore || 0}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Boards
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-cyan-200">
                                            {state.sortItOutTopBoards || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "quick_math" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-orange-300/20 bg-orange-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 text-slate-950 shadow-[0_12px_35px_rgba(251,146,60,0.34)]">
                                        <Calculator
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-200">
                                            Live Arithmetic Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Solve as many questions as possible
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-orange-200">
                                            {state.quickMathTopScore || 0}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Best Streak
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-amber-200">
                                            {state.quickMathTopStreak || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "odd_one_out" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-teal-300/20 bg-teal-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-300 to-indigo-400 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)]">
                                        <Eye
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-200">
                                            Live Visual Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Find the one different symbol
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-teal-200">
                                            {state.oddOneOutTopScore || 0}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Best Streak
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-cyan-200">
                                            {state.oddOneOutTopStreak || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "color_clash" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-fuchsia-300/20 bg-fuchsia-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 via-indigo-400 to-cyan-300 text-slate-950 shadow-[0_12px_35px_rgba(217,70,239,0.38)]">
                                        <Palette
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-fuchsia-200">
                                            Live Colour Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Tap the text colour · ignore the word
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-fuchsia-200">
                                            {state.colorClashTopScore || 0}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Best Streak
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-cyan-200">
                                            {state.colorClashTopStreak || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "number_rush" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-indigo-500 text-slate-950 shadow-[0_12px_35px_rgba(34,211,238,0.36)]">
                                        <Hash
                                            size={30}
                                            strokeWidth={2.6}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                                            Live Number Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Tap 1 through 12 · 30 seconds
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-cyan-200">
                                            {state.numberRushTopScore || 0}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Boards
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-indigo-200">
                                            {state.numberRushTopBoards || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "match_cards" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-violet-300/20 bg-violet-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300 to-pink-500 text-white shadow-[0_12px_35px_rgba(124,58,237,0.42)]">
                                        <Grid2X2
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-200">
                                            Live Memory Challenge
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Six matching pairs · 45 seconds
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Top Score
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-violet-200">
                                            {state.matchCardTopScore || 0}/6
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Completed
                                        </p>
                                        <p className="mt-1 text-4xl font-black text-emerald-200">
                                            {state.matchCardCompletedPlayers || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.gameKey === "grab_coins" && (
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[2rem] border border-amber-300/20 bg-amber-300/10 px-7 py-5 backdrop-blur">
                                <div className="flex items-center gap-4">
                                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950 shadow-[0_12px_35px_rgba(245,158,11,0.45)]">
                                        <CircleDollarSign
                                            size={30}
                                            strokeWidth={2.5}
                                        />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
                                            Live Coin Hunt
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Every verified gold coin adds one point
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                        Current Top Score
                                    </p>
                                    <p className="mt-1 text-4xl font-black text-amber-200">
                                        {state.grabTopScore || 0}
                                    </p>
                                </div>
                            </div>
                        )}

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
                                            : state.gameKey === "higher_lower"
                                              ? "The leaderboard updates live as players predict each hidden number."
                                              : state.gameKey === "sort_it_out"
                                                ? "The leaderboard updates live as players sort each number board."
                                                : state.gameKey === "quick_math"
                                                ? "The leaderboard updates live as players solve arithmetic questions."
                                                : state.gameKey === "odd_one_out"
                                                ? "The leaderboard updates live as players find the different symbol."
                                                : state.gameKey === "color_clash"
                                                ? "The leaderboard updates live as players identify the displayed text colour."
                                                : state.gameKey === "number_rush"
                                                ? "The leaderboard updates live as players tap the numbers in ascending order."
                                                : state.gameKey === "match_cards"
                                                ? "The leaderboard updates live as players find matching pairs."
                                                : state.gameKey === "grab_coins"
                                                ? "The leaderboard updates live while every player collects moving gold coins."
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
                                                            {state.scoreLabel ||
                                                    entry.scoreLabel ||
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

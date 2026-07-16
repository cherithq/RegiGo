"use client";

import {
    Activity,
    CheckCircle2,
    Circle,
    Coins,
    Loader2,
    Lock,
    MousePointerClick,
    Sparkles,
    Trophy,
    Swords,
    UserCheck,
    X,
    Zap,
} from "lucide-react";
import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

type CoinSide = "heads" | "tails";

type CoinHistoryItem = {
    attempt: number;
    choice: CoinSide;
    result: CoinSide;
    correct: boolean;
};

type TicTacToeMark = "X" | "O";

type PublicState = {
    eventName?: string;
    tournamentStatus?: string;
    joinedPlayers?: number;
    activePlayers?: number;
};

type PlayerState = PublicState & {
    currentRound?: number;
    playerName?: string;
    playerStatus?: string;
    score?: number;
    scoreLabel?: string;
    gameKey?:
        | "tap_fast"
        | "coin_flip"
        | "tic_tac_toe";
    rank?: number | null;
    advanced?: boolean | null;
    roundStatus?: string | null;
    roundId?: string | null;
    roundNumber?: number | null;
    playerCount?: number | null;
    advanceCount?: number | null;
    isFinal?: boolean | null;
    secondsUntilStart?: number;
    secondsRemaining?: number;
    coinAttempts?: number;
    coinCompleted?: boolean;
    coinHistory?: CoinHistoryItem[];
    tttMatchId?: string | null;
    tttPairNumber?: number | null;
    tttBoard?: Array<TicTacToeMark | null>;
    tttYourMark?: TicTacToeMark | null;
    tttTurnMark?: TicTacToeMark | null;
    tttYourTurn?: boolean;
    tttMatchStatus?: "active" | "completed" | "bye" | null;
    tttOpponentName?: string | null;
    tttWinnerName?: string | null;
    tttIsBye?: boolean;
    tttRematchCount?: number;
    tttTotalMatches?: number;
    tttCompletedMatches?: number;
};

export default function TapTournamentPlayer({
    slug,
}: {
    slug: string;
}) {
    const storageKey = `regigo-tap-tournament-${slug}`;
    const [token, setToken] = useState("");
    const [lookup, setLookup] = useState("");
    const [publicState, setPublicState] =
        useState<PublicState>({});
    const [state, setState] =
        useState<PlayerState>({});
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState("");
    const [localTaps, setLocalTaps] = useState(0);
    const [pulseKey, setPulseKey] = useState(0);
    const [coinFlipping, setCoinFlipping] =
        useState(false);
    const [latestCoinResult, setLatestCoinResult] =
        useState<CoinSide>("heads");
    const [movingCell, setMovingCell] =
        useState<number | null>(null);

    const pendingRef = useRef(0);
    const flushingRef = useRef(false);
    const lastRoundRef = useRef<string | null>(null);

    const loadPublicState = useCallback(async () => {
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
            setPublicState(data.state || {});
        }
    }, [slug]);

    const loadPlayerState = useCallback(
        async (
            playerToken: string,
            quiet = true
        ) => {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/state`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                if (!quiet) {
                    setError(
                        data.error ||
                            "Unable to load the tournament."
                    );
                }
                return null;
            }

            const next =
                (data.state || {}) as PlayerState;

            if (
                next.roundId &&
                next.roundId !== lastRoundRef.current
            ) {
                lastRoundRef.current = next.roundId;
                pendingRef.current = 0;
                setLocalTaps(
                    Number(next.score || 0)
                );
            } else if (
                next.roundStatus === "active"
            ) {
                setLocalTaps((current) =>
                    Math.max(
                        current,
                        Number(next.score || 0) +
                            pendingRef.current
                    )
                );
            } else {
                pendingRef.current = 0;
                setLocalTaps(
                    Number(next.score || 0)
                );
            }

            setState(next);
            return next;
        },
        [slug]
    );

    useEffect(() => {
        const stored =
            window.localStorage.getItem(
                storageKey
            ) || "";

        setToken(stored);

        const load = stored
            ? loadPlayerState(stored, false)
            : loadPublicState();

        void load.finally(() => {
            setLoading(false);
        });
    }, [
        loadPlayerState,
        loadPublicState,
        storageKey,
    ]);

    useEffect(() => {
        if (!token) {
            const timer = window.setInterval(
                () => void loadPublicState(),
                1200
            );
            return () =>
                window.clearInterval(timer);
        }

        const timer = window.setInterval(() => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                void loadPlayerState(
                    token,
                    true
                );
            }
        }, 650);

        return () => window.clearInterval(timer);
    }, [
        loadPlayerState,
        loadPublicState,
        token,
    ]);

    const flush = useCallback(async () => {
        if (
            !token ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            state.gameKey !== "tap_fast" ||
            flushingRef.current ||
            pendingRef.current <= 0
        ) {
            return;
        }

        const batch = Math.min(
            10,
            pendingRef.current
        );

        pendingRef.current -= batch;
        flushingRef.current = true;

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/tap`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        taps: batch,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                if (response.status !== 409) {
                    pendingRef.current += batch;
                }
                return;
            }

            setLocalTaps(
                Number(
                    data.result?.tapCount || 0
                ) + pendingRef.current
            );
        } catch {
            pendingRef.current += batch;
        } finally {
            flushingRef.current = false;
        }
    }, [
        slug,
        state.playerStatus,
        state.roundStatus,
        token,
    ]);

    useEffect(() => {
        if (state.roundStatus !== "active") {
            return;
        }

        const timer = window.setInterval(
            () => void flush(),
            100
        );

        return () =>
            window.clearInterval(timer);
    }, [flush, state.roundStatus]);

    async function join(event: FormEvent) {
        event.preventDefault();
        setJoining(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/join`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        lookup,
                        existingToken:
                            token || null,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (
                !response.ok ||
                !data.player?.player_token
            ) {
                throw new Error(
                    data.error ||
                        "Unable to join the tournament."
                );
            }

            const nextToken = String(
                data.player.player_token
            );

            window.localStorage.setItem(
                storageKey,
                nextToken
            );
            setToken(nextToken);
            setLookup("");
            await loadPlayerState(
                nextToken,
                false
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to join the tournament."
            );
        } finally {
            setJoining(false);
        }
    }

    function tap() {
        if (
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            state.gameKey !== "tap_fast"
        ) {
            return;
        }

        pendingRef.current += 1;
        setLocalTaps(
            (value) => value + 1
        );
        setPulseKey(
            (value) => value + 1
        );

        if ("vibrate" in navigator) {
            navigator.vibrate(10);
        }
    }

    async function flipCoin(choice: CoinSide) {
        if (
            !token ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            state.gameKey !== "coin_flip" ||
            state.coinCompleted ||
            coinFlipping
        ) {
            return;
        }

        setCoinFlipping(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/coin-flip`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        choice,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to flip the coin."
                );
            }

            const result = String(
                data.result?.result || "heads"
            ) as CoinSide;

            setLatestCoinResult(result);
            await loadPlayerState(token, false);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to flip the coin."
            );
        } finally {
            window.setTimeout(
                () => setCoinFlipping(false),
                650
            );
        }
    }

    async function placeTicTacToeMove(
        cell: number
    ) {
        if (
            !token ||
            state.gameKey !== "tic_tac_toe" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.tttYourTurn ||
            state.tttMatchStatus !== "active" ||
            movingCell !== null
        ) {
            return;
        }

        setMovingCell(cell);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/tic-tac-toe`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        cell,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to place your mark."
                );
            }

            if (data.result?.draw) {
                setError(
                    "Draw. A rematch has started automatically."
                );
            }

            await loadPlayerState(token, false);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to place your mark."
            );
        } finally {
            setMovingCell(null);
        }
    }

    const heading = useMemo(() => {
        if (
            state.playerStatus ===
            "champion"
        ) {
            return "You are the champion";
        }

        if (
            state.playerStatus ===
            "eliminated"
        ) {
            return "You have been eliminated";
        }

        if (
            state.tournamentStatus ===
            "lobby"
        ) {
            return "You are in the tournament";
        }

        if (
            state.tournamentStatus ===
            "locked"
        ) {
            return "Players are locked";
        }

        if (
            state.roundStatus ===
            "countdown"
        ) {
            return `${
                state.isFinal
                    ? "Final"
                    : `Round ${
                          state.roundNumber ||
                          1
                      }`
            } begins soon`;
        }

        if (
            state.roundStatus === "active"
        ) {
            const roundLabel = state.isFinal
                ? "Final Round"
                : `Round ${state.roundNumber || 1}`;

            if (state.gameKey === "tic_tac_toe") {
                return `${roundLabel}: Tic-Tac-Toe`;
            }

            if (state.gameKey === "coin_flip") {
                return `${roundLabel}: Coin Flip`;
            }

            return `${roundLabel}: Tap, Tap, Tap`;
        }

        if (
            state.tournamentStatus ===
            "round_complete"
        ) {
            return "You advanced";
        }

        return "Tournament";
    }, [state]);

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <Loader2
                    className="animate-spin text-[#4F46E5]"
                    size={34}
                />
            </div>
        );
    }

    if (!token) {
        const lobbyOpen =
            publicState.tournamentStatus ===
            "lobby";

        return (
            <section className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                    <UserCheck size={26} />
                </div>

                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                    {publicState.eventName ||
                        "Tap Tournament"}
                </p>
                <h1 className="mt-2 text-3xl font-black">
                    Join Tournament
                </h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    Enter the email or exact full
                    name used for registration. You
                    must already be checked in.
                </p>

                {lobbyOpen ? (
                    <form
                        onSubmit={join}
                        className="mt-6 space-y-3"
                    >
                        <input
                            value={lookup}
                            onChange={(event) =>
                                setLookup(
                                    event.target.value
                                )
                            }
                            placeholder="Registered email or full name"
                            className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                            required
                        />

                        <button
                            disabled={joining}
                            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white shadow-lg disabled:opacity-50"
                        >
                            {joining ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Zap size={18} />
                            )}
                            {joining
                                ? "Joining..."
                                : "Join Tournament"}
                        </button>
                    </form>
                ) : (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-black text-amber-800">
                        {publicState.tournamentStatus ===
                        "not_created"
                            ? "The organiser has not opened the tournament yet."
                            : "Joining is closed because the tournament has started."}
                    </div>
                )}

                {error && (
                    <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                        {error}
                    </p>
                )}
            </section>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                    {state.playerName}
                </p>
                <h1 className="mt-2 text-3xl font-black">
                    {heading}
                </h1>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                    {state.playerStatus ===
                    "eliminated"
                        ? "Thank you for playing. You can continue watching the audience screen."
                        : state.playerStatus ===
                            "champion"
                          ? "You finished first in the final 20-second round."
                          : state.tournamentStatus ===
                              "lobby"
                            ? "Wait for the organiser to lock the players and start Round 1."
                            : state.tournamentStatus ===
                                "round_complete"
                              ? `${
                                    state.activePlayers ||
                                    0
                                } players remain. Stay on this page for the next round.`
                              : state.roundStatus ===
                                  "countdown"
                                ? `${
                                      state.secondsUntilStart ||
                                      0
                                  } seconds until tapping begins.`
                                : state.gameKey === "tic_tac_toe"
                                  ? state.tttIsBye
                                      ? "You received a bye and automatically advance when the round is confirmed."
                                      : `Play against ${state.tttOpponentName || "your opponent"}. Winner advances; a draw automatically rematches.`
                                  : state.gameKey === "coin_flip"
                                    ? "Complete three Coin Flip guesses. The highest number of correct guesses advances."
                                    : "Tap as quickly as possible for exactly 20 seconds."}
                </p>
            </section>

            {state.playerStatus ===
            "champion" ? (
                <section className="rounded-[2rem] bg-gradient-to-br from-amber-100 to-yellow-50 p-9 text-center shadow-xl">
                    <Trophy
                        className="mx-auto text-amber-600"
                        size={62}
                    />
                    <p className="mt-4 text-5xl font-black text-amber-950">
                        Champion
                    </p>
                </section>
            ) : state.playerStatus ===
              "eliminated" ? (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
                    <Lock
                        className="mx-auto text-slate-400"
                        size={42}
                    />
                    <p className="mt-4 text-xl font-black text-slate-700">
                        Final score:{" "}
                        {state.score || 0}{" "}
                        {state.scoreLabel || "points"}
                    </p>
                    {state.rank && (
                        <p className="mt-2 font-bold text-slate-500">
                            Round rank: #
                            {state.rank}
                        </p>
                    )}
                </section>
            ) : state.roundStatus ===
              "active" ? (
                state.gameKey === "coin_flip" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-center text-white shadow-2xl">
                        <style jsx global>{`
                            @keyframes tournament-coin-spin {
                                0% {
                                    transform: rotateY(0deg)
                                        translateY(0);
                                }
                                45% {
                                    transform: rotateY(900deg)
                                        translateY(-22px);
                                }
                                100% {
                                    transform: rotateY(1440deg)
                                        translateY(0);
                                }
                            }
                        `}</style>

                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                            Best of Three
                        </p>
                        <h2 className="mt-2 text-3xl font-black">
                            Choose Heads or Tails
                        </h2>
                        <p className="mt-3 text-sm font-bold text-white/50">
                            Correct guesses: {state.score || 0} / 3 ·
                            Attempts: {state.coinAttempts || 0} / 3
                        </p>

                        <div
                            className="relative mx-auto mt-8 h-40 w-40"
                            style={{
                                perspective: "900px",
                            }}
                        >
                            <div
                                className="relative h-full w-full rounded-full p-[5px] shadow-[0_24px_70px_rgba(245,158,11,0.48)] [transform-style:preserve-3d]"
                                style={{
                                    animation: coinFlipping
                                        ? "tournament-coin-spin 650ms ease-out"
                                        : undefined,
                                    transform:
                                        latestCoinResult === "tails"
                                            ? "rotateY(180deg)"
                                            : "rotateY(0deg)",
                                    background:
                                        "repeating-conic-gradient(from 0deg,#fff4a8 0deg 6deg,#c77a08 6deg 12deg)",
                                }}
                            >
                                <div className="flex h-full w-full items-center justify-center rounded-full border border-amber-100 bg-gradient-to-br from-[#FFF7BD] via-[#F5C84C] to-[#B96A06] shadow-inner">
                                    <div className="flex h-[62%] w-[62%] items-center justify-center rounded-full border-2 border-amber-800/25 bg-amber-200/30 text-5xl font-black text-amber-950">
                                        {latestCoinResult === "heads"
                                            ? "H"
                                            : "T"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {state.coinCompleted ? (
                            <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                                <CheckCircle2
                                    size={34}
                                    className="mx-auto text-emerald-300"
                                />
                                <p className="mt-3 text-xl font-black">
                                    Three flips completed
                                </p>
                                <p className="mt-2 text-sm font-bold text-white/55">
                                    Final score: {state.score || 0} correct.
                                    Wait for the other players to finish.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                {(["heads", "tails"] as CoinSide[]).map(
                                    (side) => (
                                        <button
                                            key={side}
                                            type="button"
                                            onClick={() =>
                                                void flipCoin(side)
                                            }
                                            disabled={coinFlipping}
                                            className={`rounded-[1.5rem] border p-5 text-xl font-black capitalize transition active:scale-95 disabled:opacity-50 ${
                                                side === "heads"
                                                    ? "border-indigo-300/30 bg-indigo-400/15 text-indigo-200"
                                                    : "border-pink-300/30 bg-pink-400/15 text-pink-200"
                                            }`}
                                        >
                                            <Coins
                                                size={30}
                                                className="mx-auto mb-3"
                                            />
                                            {side}
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        {(state.coinHistory || []).length > 0 && (
                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                {(state.coinHistory || []).map(
                                    (item) => (
                                        <div
                                            key={item.attempt}
                                            className={`rounded-2xl border p-4 ${
                                                item.correct
                                                    ? "border-emerald-300/20 bg-emerald-300/10"
                                                    : "border-red-300/20 bg-red-300/10"
                                            }`}
                                        >
                                            <p className="text-xs font-black uppercase tracking-wide text-white/45">
                                                Flip {item.attempt}
                                            </p>
                                            <p className="mt-2 font-black capitalize">
                                                {item.result}
                                            </p>
                                            <p className="mt-1 text-xs font-bold">
                                                {item.correct
                                                    ? "Correct"
                                                    : `You chose ${item.choice}`}
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "tic_tac_toe" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-center text-white shadow-2xl">
                        <style jsx global>{`
                            @keyframes tournament-mark-place {
                                0% {
                                    transform: scale(0.25)
                                        rotate(-18deg);
                                    opacity: 0;
                                }
                                75% {
                                    transform: scale(1.14)
                                        rotate(4deg);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(1)
                                        rotate(0deg);
                                    opacity: 1;
                                }
                            }
                        `}</style>

                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-300">
                                    You
                                </p>
                                <p className="mt-1 text-xl font-black">
                                    {state.playerName}
                                </p>
                                <p className="mt-1 text-sm font-bold text-white/45">
                                    Mark {state.tttYourMark || "—"}
                                </p>
                            </div>

                            <Swords
                                size={24}
                                className="shrink-0 text-white/35"
                            />

                            <div className="text-right">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-300">
                                    Opponent
                                </p>
                                <p className="mt-1 text-xl font-black">
                                    {state.tttOpponentName || "Bye"}
                                </p>
                                <p className="mt-1 text-sm font-bold text-white/45">
                                    Mark{" "}
                                    {state.tttYourMark === "X"
                                        ? "O"
                                        : state.tttYourMark === "O"
                                          ? "X"
                                          : "—"}
                                </p>
                            </div>
                        </div>

                        {state.tttIsBye ? (
                            <div className="mt-6 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-8">
                                <CheckCircle2
                                    size={46}
                                    className="mx-auto text-emerald-300"
                                />
                                <p className="mt-4 text-2xl font-black">
                                    Automatic Bye
                                </p>
                                <p className="mt-2 text-sm font-bold text-white/55">
                                    You advance after the remaining matches finish.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mt-6 text-center">
                                    <p className={`text-sm font-black uppercase tracking-[0.18em] ${
                                        state.tttMatchStatus === "completed"
                                            ? "text-emerald-300"
                                            : state.tttYourTurn
                                              ? "text-emerald-300"
                                              : "text-indigo-300"
                                    }`}>
                                        {state.tttMatchStatus === "completed"
                                            ? state.tttWinnerName === state.playerName
                                                ? "You won this match"
                                                : `${state.tttWinnerName || "Opponent"} won`
                                            : state.tttYourTurn
                                              ? "Your turn"
                                              : "Opponent's turn"}
                                    </p>

                                    {Number(state.tttRematchCount || 0) > 0 && (
                                        <p className="mt-2 text-xs font-bold text-amber-200">
                                            Rematch {state.tttRematchCount}
                                        </p>
                                    )}
                                </div>

                                <div className="mx-auto mt-5 max-w-xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-700 via-slate-900 to-black p-3 shadow-[0_28px_70px_rgba(0,0,0,0.48)]">
                                    <div className="grid grid-cols-3 gap-2 rounded-[1.45rem] bg-slate-950 p-2 sm:gap-3 sm:p-3">
                                        {Array.from(
                                            { length: 9 },
                                            (_, index) => {
                                                const mark =
                                                    state.tttBoard?.[index] ||
                                                    null;
                                                const canMove =
                                                    state.tttYourTurn &&
                                                    state.tttMatchStatus === "active" &&
                                                    !mark &&
                                                    movingCell === null;

                                                return (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() =>
                                                            void placeTicTacToeMove(index)
                                                        }
                                                        disabled={!canMove}
                                                        className={`group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border transition active:scale-[0.96] ${
                                                            mark === "X"
                                                                ? "border-indigo-300/25 bg-indigo-400/10"
                                                                : mark === "O"
                                                                  ? "border-pink-300/25 bg-pink-400/10"
                                                                  : canMove
                                                                    ? "border-white/10 bg-white/[0.07] hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.12]"
                                                                    : "border-white/10 bg-white/[0.035]"
                                                        } disabled:cursor-default`}
                                                    >
                                                        {movingCell === index ? (
                                                            <Loader2
                                                                size={30}
                                                                className="animate-spin text-white"
                                                            />
                                                        ) : mark === "X" ? (
                                                            <X
                                                                size={62}
                                                                strokeWidth={3.5}
                                                                className="text-indigo-300"
                                                                style={{
                                                                    animation:
                                                                        "tournament-mark-place 340ms ease-out",
                                                                }}
                                                            />
                                                        ) : mark === "O" ? (
                                                            <Circle
                                                                size={54}
                                                                strokeWidth={4}
                                                                className="text-pink-300"
                                                                style={{
                                                                    animation:
                                                                        "tournament-mark-place 340ms ease-out",
                                                                }}
                                                            />
                                                        ) : canMove ? (
                                                            state.tttYourMark === "X" ? (
                                                                <X
                                                                    size={54}
                                                                    className="text-white/10 opacity-0 transition group-hover:opacity-100"
                                                                />
                                                            ) : (
                                                                <Circle
                                                                    size={48}
                                                                    className="text-white/10 opacity-0 transition group-hover:opacity-100"
                                                                />
                                                            )
                                                        ) : null}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>

                                {state.tttMatchStatus === "completed" && (
                                    <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/55">
                                        Waiting for the other matches:{" "}
                                        {state.tttCompletedMatches || 0} /{" "}
                                        {state.tttTotalMatches || 0} completed.
                                    </p>
                                )}
                            </>
                        )}

                        {error && (
                            <p className="mt-5 rounded-2xl bg-amber-400/15 px-4 py-3 text-sm font-bold text-amber-100">
                                {error}
                            </p>
                        )}
                    </section>
                ) : (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-center text-white shadow-2xl">
                        <style jsx global>{`
                            @keyframes tap-pulse {
                                0% {
                                    transform: scale(0.55);
                                    opacity: 0.9;
                                }
                                100% {
                                    transform: scale(1.5);
                                    opacity: 0;
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <Activity
                                    className="mx-auto text-indigo-300"
                                    size={20}
                                />
                                <p className="mt-2 text-5xl font-black">
                                    {localTaps}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Taps
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <MousePointerClick
                                    className="mx-auto text-pink-300"
                                    size={20}
                                />
                                <p className="mt-2 text-5xl font-black">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div className="relative mx-auto mt-7 flex aspect-square w-full max-w-[430px] items-center justify-center">
                            {pulseKey > 0 && (
                                <span
                                    key={pulseKey}
                                    className="pointer-events-none absolute inset-[18%] rounded-full border-4 border-pink-300/70"
                                    style={{
                                        animation:
                                            "tap-pulse 430ms ease-out forwards",
                                    }}
                                />
                            )}

                            <button
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    tap();
                                }}
                                className="relative z-10 flex aspect-square w-[68%] touch-manipulation select-none flex-col items-center justify-center rounded-full border-[10px] border-white/15 bg-gradient-to-br from-[#6366F1] via-[#7C3AED] to-[#EC4899] shadow-[0_28px_90px_rgba(79,70,229,0.52),inset_0_12px_25px_rgba(255,255,255,0.18)] transition active:translate-y-2 active:scale-[0.95]"
                            >
                                <Sparkles
                                    className="absolute right-[18%] top-[18%] text-pink-100"
                                    size={22}
                                />
                                <Zap size={62} />
                                <span className="mt-3 text-4xl font-black uppercase tracking-[0.18em]">
                                    Tap
                                </span>
                            </button>
                        </div>
                    </section>
                )
            ) : state.roundStatus ===
              "countdown" ? (
                <section className="rounded-[2rem] bg-slate-950 p-10 text-center text-white shadow-xl">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                        Get Ready
                    </p>
                    <p className="mt-4 text-8xl font-black">
                        {state.secondsUntilStart ||
                            0}
                    </p>
                    <p className="mt-4 font-bold text-white/55">
                        {state.gameKey === "tic_tac_toe"
                            ? "Your opponent and mark will appear when the round starts."
                            : state.gameKey === "coin_flip"
                              ? "Prepare to choose Heads or Tails three times."
                              : "Do not tap until the timer starts."}
                    </p>
                </section>
            ) : (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
                    <CheckCircle2
                        className="mx-auto text-emerald-500"
                        size={42}
                    />
                    <p className="mt-4 text-xl font-black">
                        Stay on this page
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                        The organiser will start the
                        next round after the results
                        are confirmed.
                    </p>
                </section>
            )}
        </div>
    );
}

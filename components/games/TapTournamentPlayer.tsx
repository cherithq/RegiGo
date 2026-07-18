"use client";

import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Calculator,
    CheckCircle2,
    Cherry,
    Circle,
    CircleDollarSign,
    Coins,
    Diamond,
    Citrus,
    Gem,
    Grape,
    Eye,
    Grid2X2,
    Hash,
    Hexagon,
    Info,
    ListOrdered,
    Loader2,
    Megaphone,
    Lock,
    MousePointerClick,
    Palette,
    Pause,
    PartyPopper,
    Sparkles,
    Square,
    Star,
    Trophy,
    Triangle,
    Swords,
    UserCheck,
    UserRoundCheck,
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
        | "tic_tac_toe"
        | "grab_coins"
        | "match_cards"
        | "number_rush"
        | "color_clash"
        | "odd_one_out"
        | "quick_math"
        | "sort_it_out"
        | "higher_lower";
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
    grabCoinNonce?: string | null;
    grabCoinLeft?: number;
    grabCoinTop?: number;
    grabCoinsCollected?: number;
    grabRejectedTaps?: number;
    grabDurationSeconds?: number;
    matchCardDeckView?: Array<string | null>;
    matchCardMatchedIndexes?: number[];
    matchCardFirstIndex?: number | null;
    matchCardPairsFound?: number;
    matchCardAttempts?: number;
    matchCardCompleted?: boolean;
    matchCardTotalPairs?: number;
    matchCardDurationSeconds?: number;
    numberRushBoard?: number[];
    numberRushBoardNonce?: string | null;
    numberRushExpected?: number;
    numberRushCorrect?: number;
    numberRushMistakes?: number;
    numberRushBoardsCompleted?: number;
    numberRushDurationSeconds?: number;
    colorClashPromptNonce?: string | null;
    colorClashWord?: string | null;
    colorClashColour?:
        | "red"
        | "blue"
        | "green"
        | "yellow"
        | null;
    colorClashCorrect?: number;
    colorClashMistakes?: number;
    colorClashCurrentStreak?: number;
    colorClashBestStreak?: number;
    colorClashDurationSeconds?: number;
    oddOneOutPromptNonce?: string | null;
    oddOneOutTiles?: OddOneOutShape[];
    oddOneOutCorrect?: number;
    oddOneOutMistakes?: number;
    oddOneOutCurrentStreak?: number;
    oddOneOutBestStreak?: number;
    oddOneOutDurationSeconds?: number;
    quickMathPromptNonce?: string | null;
    quickMathExpression?: string | null;
    quickMathOptions?: number[];
    quickMathCorrect?: number;
    quickMathMistakes?: number;
    quickMathCurrentStreak?: number;
    quickMathBestStreak?: number;
    quickMathDurationSeconds?: number;
    sortItOutPromptNonce?: string | null;
    sortItOutNumbers?: number[];
    sortItOutExpectedPosition?: number;
    sortItOutCorrect?: number;
    sortItOutMistakes?: number;
    sortItOutBoardsCompleted?: number;
    sortItOutCurrentStreak?: number;
    sortItOutBestStreak?: number;
    sortItOutDurationSeconds?: number;
    higherLowerPromptNonce?: string | null;
    higherLowerCurrentNumber?: number;
    higherLowerCorrect?: number;
    higherLowerMistakes?: number;
    higherLowerCurrentStreak?: number;
    higherLowerBestStreak?: number;
    higherLowerDurationSeconds?: number;
    readyTargetRound?: number;
    readyCount?: number;
    readyTotal?: number;
    onlineCount?: number;
    allReady?: boolean;
    nextGameKey?: string;
    nextGameTitle?: string;
    playerReady?: boolean;
    playerReadyAt?: string | null;
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
    playerResult?:
        | "advanced"
        | "eliminated"
        | "champion"
        | string;
    playerResultScore?: number;
    playerResultRank?: number | null;
    playerAdvanced?: boolean | null;
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

function MatchCardArtwork({
    symbol,
}: {
    symbol?: string | null;
}) {
    const iconClass = "h-9 w-9 sm:h-11 sm:w-11";

    if (symbol === "cherry") {
        return (
            <Cherry
                className={`${iconClass} text-rose-500`}
            />
        );
    }

    if (symbol === "citrus") {
        return (
            <Citrus
                className={`${iconClass} text-amber-500`}
            />
        );
    }

    if (symbol === "grape") {
        return (
            <Grape
                className={`${iconClass} text-violet-500`}
            />
        );
    }

    if (symbol === "star") {
        return (
            <Star
                className={`${iconClass} fill-amber-200 text-amber-500`}
            />
        );
    }

    if (symbol === "gem") {
        return (
            <Gem
                className={`${iconClass} text-cyan-500`}
            />
        );
    }

    return (
        <Circle
            className={`${iconClass} fill-emerald-100 text-emerald-500`}
        />
    );
}

function TournamentMemoryCard({
    index,
    symbol,
    matched,
    disabled,
    loading,
    onFlip,
}: {
    index: number;
    symbol?: string | null;
    matched: boolean;
    disabled: boolean;
    loading: boolean;
    onFlip: () => void;
}) {
    const faceUp = Boolean(symbol) || matched;

    return (
        <button
            type="button"
            onClick={onFlip}
            disabled={disabled}
            className="group aspect-[3/4] touch-manipulation outline-none transition active:scale-[0.97] disabled:cursor-default"
            style={{
                perspective: "1000px",
            }}
            aria-label={`Card ${index + 1}${
                faceUp ? ", revealed" : ""
            }`}
        >
            <span
                className="relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                style={{
                    transform: faceUp
                        ? "rotateY(180deg)"
                        : "rotateY(0deg)",
                }}
            >
                <span className="absolute inset-0 overflow-hidden rounded-2xl border border-indigo-200/30 bg-gradient-to-br from-[#312E81] via-[#4F46E5] to-[#EC4899] shadow-[0_16px_30px_rgba(15,23,42,0.34)] [backface-visibility:hidden] group-hover:-translate-y-1">
                    <span className="absolute inset-[7px] rounded-xl border border-white/30" />
                    <span className="absolute inset-[13px] rounded-lg border border-dashed border-white/20" />
                    <span className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,white_1.5px,transparent_1.5px)] [background-size:14px_14px]" />
                    <span className="absolute inset-0 flex items-center justify-center">
                        {loading ? (
                            <Loader2
                                size={28}
                                className="animate-spin text-white"
                            />
                        ) : (
                            <span className="flex h-12 w-12 rotate-45 items-center justify-center rounded-xl border border-white/25 bg-white/15 sm:h-14 sm:w-14">
                                <Grid2X2
                                    className="-rotate-45 text-white"
                                    size={26}
                                />
                            </span>
                        )}
                    </span>
                </span>

                <span
                    className={`absolute inset-0 overflow-hidden rounded-2xl border bg-white shadow-[0_16px_30px_rgba(15,23,42,0.24)] [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                        matched
                            ? "border-emerald-300 ring-4 ring-emerald-300/20"
                            : "border-slate-200"
                    }`}
                >
                    <span className="absolute left-3 top-2 text-xs font-black text-slate-400">
                        {index + 1}
                    </span>

                    <span className="absolute inset-0 flex items-center justify-center">
                        <span
                            className={`flex h-[58%] w-[58%] items-center justify-center rounded-2xl border shadow-inner ${
                                matched
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-indigo-100 bg-[#F7F5FF]"
                            }`}
                        >
                            <MatchCardArtwork symbol={symbol} />
                        </span>
                    </span>

                    {matched && (
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                            <CheckCircle2
                                size={16}
                                strokeWidth={3}
                            />
                        </span>
                    )}
                </span>
            </span>
        </button>
    );
}

type OddOneOutShape =
    | "circle"
    | "square"
    | "triangle"
    | "diamond"
    | "star"
    | "hexagon";

function OddOneOutShapeIcon({
    shape,
    className = "",
}: {
    shape: OddOneOutShape;
    className?: string;
}) {
    const props = {
        size: 44,
        strokeWidth: 2.5,
        className,
    };

    if (shape === "square") {
        return <Square {...props} />;
    }

    if (shape === "triangle") {
        return <Triangle {...props} />;
    }

    if (shape === "diamond") {
        return <Diamond {...props} />;
    }

    if (shape === "star") {
        return <Star {...props} />;
    }

    if (shape === "hexagon") {
        return <Hexagon {...props} />;
    }

    return <Circle {...props} />;
}

type ColourClashColour =
    | "red"
    | "blue"
    | "green"
    | "yellow";

const COLOUR_CLASH_OPTIONS: Array<{
    key: ColourClashColour;
    label: string;
    buttonClass: string;
    dotClass: string;
}> = [
    {
        key: "red",
        label: "Red",
        buttonClass:
            "border-red-300/30 bg-gradient-to-br from-red-400 to-red-600 text-white shadow-red-500/25",
        dotClass: "bg-red-500",
    },
    {
        key: "blue",
        label: "Blue",
        buttonClass:
            "border-blue-300/30 bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-blue-500/25",
        dotClass: "bg-blue-500",
    },
    {
        key: "green",
        label: "Green",
        buttonClass:
            "border-emerald-300/30 bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-emerald-500/25",
        dotClass: "bg-emerald-500",
    },
    {
        key: "yellow",
        label: "Yellow",
        buttonClass:
            "border-yellow-200/40 bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 shadow-yellow-500/25",
        dotClass: "bg-yellow-400",
    },
];

const COLOUR_CLASH_TEXT_CLASS: Record<
    ColourClashColour,
    string
> = {
    red: "text-red-400",
    blue: "text-blue-400",
    green: "text-emerald-400",
    yellow: "text-yellow-300",
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
    const [collectingCoin, setCollectingCoin] =
        useState(false);
    const [grabPulseKey, setGrabPulseKey] =
        useState(0);
    const [flippingMatchCard, setFlippingMatchCard] =
        useState<number | null>(null);
    const [temporaryMatchCards, setTemporaryMatchCards] =
        useState<Record<number, string>>({});
    const [updatingReady, setUpdatingReady] =
        useState(false);
    const [numberRushBusy, setNumberRushBusy] =
        useState(false);
    const [numberRushFeedback, setNumberRushFeedback] =
        useState<"correct" | "wrong" | "">("");
    const [colourClashBusy, setColourClashBusy] =
        useState(false);
    const [colourClashFeedback, setColourClashFeedback] =
        useState<"correct" | "wrong" | "">("");
    const [oddOneOutBusy, setOddOneOutBusy] =
        useState(false);
    const [oddOneOutFeedback, setOddOneOutFeedback] =
        useState<"correct" | "wrong" | "">("");
    const [quickMathBusy, setQuickMathBusy] =
        useState(false);
    const [quickMathFeedback, setQuickMathFeedback] =
        useState<"correct" | "wrong" | "">("");
    const [sortItOutBusy, setSortItOutBusy] =
        useState(false);
    const [sortItOutFeedback, setSortItOutFeedback] =
        useState<"correct" | "wrong" | "">("");
    const [higherLowerBusy, setHigherLowerBusy] =
        useState(false);
    const [higherLowerFeedback, setHigherLowerFeedback] =
        useState<"correct" | "wrong" | "">("");
    const [higherLowerReveal, setHigherLowerReveal] =
        useState<{
            previousCurrent: number;
            revealedNext: number;
            correctDirection: "higher" | "lower";
            correct: boolean;
        } | null>(null);

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

        const displayName = lookup
            .trim()
            .replace(/\s+/g, " ");

        if (!displayName) {
            setError("Enter a display name.");
            return;
        }

        if (displayName.length > 60) {
            setError(
                "Display name must be 60 characters or fewer."
            );
            return;
        }

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
                        displayName,
                        // Kept for compatibility with the existing RPC name.
                        lookup: displayName,
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

    async function collectGrabCoin() {
        if (
            !token ||
            state.gameKey !== "grab_coins" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.grabCoinNonce ||
            collectingCoin
        ) {
            return;
        }

        setCollectingCoin(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/grab-coins`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        coinNonce: state.grabCoinNonce,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to collect the coin."
                );
            }

            setState((current) => ({
                ...current,
                score: Number(
                    data.result?.coinsCollected ||
                        current.score ||
                        0
                ),
                grabCoinsCollected: Number(
                    data.result?.coinsCollected ||
                        current.grabCoinsCollected ||
                        0
                ),
                grabCoinNonce:
                    data.result?.coinNonce ||
                    current.grabCoinNonce,
                grabCoinLeft: Number(
                    data.result?.coinLeft ??
                        current.grabCoinLeft ??
                        50
                ),
                grabCoinTop: Number(
                    data.result?.coinTop ??
                        current.grabCoinTop ??
                        50
                ),
                secondsRemaining: Number(
                    data.result?.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));
            setGrabPulseKey(
                (current) => current + 1
            );

            if ("vibrate" in navigator) {
                navigator.vibrate(12);
            }
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to collect the coin."
            );
        } finally {
            window.setTimeout(
                () => setCollectingCoin(false),
                90
            );
        }
    }

    async function flipMatchCard(
        cardIndex: number
    ) {
        if (
            !token ||
            state.gameKey !== "match_cards" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            state.matchCardCompleted ||
            flippingMatchCard !== null ||
            state.matchCardMatchedIndexes?.includes(
                cardIndex
            )
        ) {
            return;
        }

        setFlippingMatchCard(cardIndex);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/match-cards`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        cardIndex,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to flip the card."
                );
            }

            const result = data.result || {};
            const revealIndexes = Array.isArray(
                result.revealIndexes
            )
                ? result.revealIndexes.map(Number)
                : [];
            const revealSymbols = Array.isArray(
                result.revealSymbols
            )
                ? result.revealSymbols.map(String)
                : [];

            const revealed: Record<number, string> = {};

            revealIndexes.forEach(
                (index: number, position: number) => {
                    revealed[index] =
                        revealSymbols[position] || "orb";
                }
            );

            setTemporaryMatchCards(revealed);
            setState((current) => ({
                ...current,
                score: Number(
                    result.pairsFound ??
                        current.score ??
                        0
                ),
                matchCardPairsFound: Number(
                    result.pairsFound ??
                        current.matchCardPairsFound ??
                        0
                ),
                matchCardAttempts: Number(
                    result.attempts ??
                        current.matchCardAttempts ??
                        0
                ),
                matchCardMatchedIndexes:
                    Array.isArray(
                        result.matchedIndexes
                    )
                        ? result.matchedIndexes.map(
                              Number
                          )
                        : current.matchCardMatchedIndexes,
                matchCardCompleted:
                    Boolean(result.completed),
            }));

            if (result.phase === "second") {
                window.setTimeout(async () => {
                    setTemporaryMatchCards({});
                    await loadPlayerState(
                        token,
                        true
                    );
                }, result.match ? 350 : 850);
            } else {
                await loadPlayerState(
                    token,
                    true
                );
            }
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to flip the card."
            );
        } finally {
            window.setTimeout(
                () =>
                    setFlippingMatchCard(null),
                220
            );
        }
    }

    async function updateReadyStatus(
        ready: boolean
    ) {
        if (!token || updatingReady) {
            return;
        }

        setUpdatingReady(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/ready`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        ready,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to update ready status."
                );
            }

            setState((current) => ({
                ...current,
                ...(data.state || {}),
            }));
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to update ready status."
            );
        } finally {
            setUpdatingReady(false);
        }
    }

    async function submitNumberRushTile(
        tileIndex: number
    ) {
        if (
            !token ||
            state.gameKey !== "number_rush" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.numberRushBoardNonce ||
            numberRushBusy
        ) {
            return;
        }

        setNumberRushBusy(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/number-rush`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        boardNonce:
                            state.numberRushBoardNonce,
                        tileIndex,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to submit the number."
                );
            }

            const result = data.result || {};

            setState((current) => ({
                ...current,
                score: Number(
                    result.correctCount ??
                        current.score ??
                        0
                ),
                numberRushBoard:
                    Array.isArray(result.board)
                        ? result.board.map(Number)
                        : current.numberRushBoard,
                numberRushBoardNonce:
                    result.boardNonce ||
                    current.numberRushBoardNonce,
                numberRushExpected: Number(
                    result.expectedNumber ??
                        current.numberRushExpected ??
                        1
                ),
                numberRushCorrect: Number(
                    result.correctCount ??
                        current.numberRushCorrect ??
                        0
                ),
                numberRushMistakes: Number(
                    result.mistakes ??
                        current.numberRushMistakes ??
                        0
                ),
                numberRushBoardsCompleted: Number(
                    result.boardsCompleted ??
                        current.numberRushBoardsCompleted ??
                        0
                ),
                secondsRemaining: Number(
                    result.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));

            setNumberRushFeedback(
                result.correct
                    ? "correct"
                    : "wrong"
            );

            if (
                result.correct &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(10);
            }

            window.setTimeout(
                () =>
                    setNumberRushFeedback(""),
                220
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to submit the number."
            );
        } finally {
            window.setTimeout(
                () => setNumberRushBusy(false),
                70
            );
        }
    }

    async function submitColourClash(
        selectedColour: ColourClashColour
    ) {
        if (
            !token ||
            state.gameKey !== "color_clash" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.colorClashPromptNonce ||
            colourClashBusy
        ) {
            return;
        }

        setColourClashBusy(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/colour-clash`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        promptNonce:
                            state.colorClashPromptNonce,
                        selectedColour,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to submit the colour."
                );
            }

            const result = data.result || {};

            setState((current) => ({
                ...current,
                score: Number(
                    result.correctCount ??
                        current.score ??
                        0
                ),
                colorClashPromptNonce:
                    result.promptNonce ||
                    current.colorClashPromptNonce,
                colorClashWord:
                    result.promptWord ||
                    current.colorClashWord,
                colorClashColour:
                    result.promptColour ||
                    current.colorClashColour,
                colorClashCorrect: Number(
                    result.correctCount ??
                        current.colorClashCorrect ??
                        0
                ),
                colorClashMistakes: Number(
                    result.mistakes ??
                        current.colorClashMistakes ??
                        0
                ),
                colorClashCurrentStreak: Number(
                    result.currentStreak ??
                        current.colorClashCurrentStreak ??
                        0
                ),
                colorClashBestStreak: Number(
                    result.bestStreak ??
                        current.colorClashBestStreak ??
                        0
                ),
                secondsRemaining: Number(
                    result.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));

            setColourClashFeedback(
                result.correct
                    ? "correct"
                    : "wrong"
            );

            if (
                result.correct &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(12);
            }

            window.setTimeout(
                () =>
                    setColourClashFeedback(""),
                240
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to submit the colour."
            );
        } finally {
            window.setTimeout(
                () => setColourClashBusy(false),
                80
            );
        }
    }

    async function submitOddOneOut(
        tileIndex: number
    ) {
        if (
            !token ||
            state.gameKey !== "odd_one_out" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.oddOneOutPromptNonce ||
            oddOneOutBusy
        ) {
            return;
        }

        setOddOneOutBusy(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/odd-one-out`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        promptNonce:
                            state.oddOneOutPromptNonce,
                        tileIndex,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to submit the symbol."
                );
            }

            const result = data.result || {};

            setState((current) => ({
                ...current,
                score: Number(
                    result.correctCount ??
                        current.score ??
                        0
                ),
                oddOneOutPromptNonce:
                    result.promptNonce ||
                    current.oddOneOutPromptNonce,
                oddOneOutTiles:
                    Array.isArray(result.tiles)
                        ? result.tiles
                        : current.oddOneOutTiles,
                oddOneOutCorrect: Number(
                    result.correctCount ??
                        current.oddOneOutCorrect ??
                        0
                ),
                oddOneOutMistakes: Number(
                    result.mistakes ??
                        current.oddOneOutMistakes ??
                        0
                ),
                oddOneOutCurrentStreak: Number(
                    result.currentStreak ??
                        current.oddOneOutCurrentStreak ??
                        0
                ),
                oddOneOutBestStreak: Number(
                    result.bestStreak ??
                        current.oddOneOutBestStreak ??
                        0
                ),
                secondsRemaining: Number(
                    result.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));

            setOddOneOutFeedback(
                result.correct
                    ? "correct"
                    : "wrong"
            );

            if (
                result.correct &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(12);
            }

            window.setTimeout(
                () =>
                    setOddOneOutFeedback(""),
                230
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to submit the symbol."
            );
        } finally {
            window.setTimeout(
                () => setOddOneOutBusy(false),
                75
            );
        }
    }

    async function submitQuickMath(
        selectedAnswer: number
    ) {
        if (
            !token ||
            state.gameKey !== "quick_math" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.quickMathPromptNonce ||
            quickMathBusy
        ) {
            return;
        }

        setQuickMathBusy(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/quick-maths`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        promptNonce:
                            state.quickMathPromptNonce,
                        selectedAnswer,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to submit the answer."
                );
            }

            const result = data.result || {};

            setState((current) => ({
                ...current,
                score: Number(
                    result.correctCount ??
                        current.score ??
                        0
                ),
                quickMathPromptNonce:
                    result.promptNonce ||
                    current.quickMathPromptNonce,
                quickMathExpression:
                    result.expression ||
                    current.quickMathExpression,
                quickMathOptions:
                    Array.isArray(result.options)
                        ? result.options.map(Number)
                        : current.quickMathOptions,
                quickMathCorrect: Number(
                    result.correctCount ??
                        current.quickMathCorrect ??
                        0
                ),
                quickMathMistakes: Number(
                    result.mistakes ??
                        current.quickMathMistakes ??
                        0
                ),
                quickMathCurrentStreak: Number(
                    result.currentStreak ??
                        current.quickMathCurrentStreak ??
                        0
                ),
                quickMathBestStreak: Number(
                    result.bestStreak ??
                        current.quickMathBestStreak ??
                        0
                ),
                secondsRemaining: Number(
                    result.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));

            setQuickMathFeedback(
                result.correct
                    ? "correct"
                    : "wrong"
            );

            if (
                result.correct &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(12);
            }

            window.setTimeout(
                () =>
                    setQuickMathFeedback(""),
                230
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to submit the answer."
            );
        } finally {
            window.setTimeout(
                () => setQuickMathBusy(false),
                75
            );
        }
    }

    async function submitSortItOut(
        tileIndex: number
    ) {
        if (
            !token ||
            state.gameKey !== "sort_it_out" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.sortItOutPromptNonce ||
            sortItOutBusy
        ) {
            return;
        }

        setSortItOutBusy(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/sort-it-out`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        promptNonce:
                            state.sortItOutPromptNonce,
                        tileIndex,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to submit the number."
                );
            }

            const result = data.result || {};

            setState((current) => ({
                ...current,
                score: Number(
                    result.correctCount ??
                        current.score ??
                        0
                ),
                sortItOutPromptNonce:
                    result.promptNonce ||
                    current.sortItOutPromptNonce,
                sortItOutNumbers:
                    Array.isArray(result.numbers)
                        ? result.numbers.map(Number)
                        : current.sortItOutNumbers,
                sortItOutExpectedPosition: Number(
                    result.expectedPosition ??
                        current.sortItOutExpectedPosition ??
                        1
                ),
                sortItOutCorrect: Number(
                    result.correctCount ??
                        current.sortItOutCorrect ??
                        0
                ),
                sortItOutMistakes: Number(
                    result.mistakes ??
                        current.sortItOutMistakes ??
                        0
                ),
                sortItOutBoardsCompleted: Number(
                    result.boardsCompleted ??
                        current.sortItOutBoardsCompleted ??
                        0
                ),
                sortItOutCurrentStreak: Number(
                    result.currentStreak ??
                        current.sortItOutCurrentStreak ??
                        0
                ),
                sortItOutBestStreak: Number(
                    result.bestStreak ??
                        current.sortItOutBestStreak ??
                        0
                ),
                secondsRemaining: Number(
                    result.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));

            setSortItOutFeedback(
                result.correct
                    ? "correct"
                    : "wrong"
            );

            if (
                result.correct &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(12);
            }

            window.setTimeout(
                () =>
                    setSortItOutFeedback(""),
                230
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to submit the number."
            );
        } finally {
            window.setTimeout(
                () => setSortItOutBusy(false),
                75
            );
        }
    }

    async function submitHigherLower(
        selectedDirection: "higher" | "lower"
    ) {
        if (
            !token ||
            state.gameKey !== "higher_lower" ||
            state.roundStatus !== "active" ||
            state.playerStatus !== "active" ||
            !state.higherLowerPromptNonce ||
            higherLowerBusy
        ) {
            return;
        }

        setHigherLowerBusy(true);
        setError("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug
                )}/games/tournament/higher-lower`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerToken: token,
                        promptNonce:
                            state.higherLowerPromptNonce,
                        selectedDirection,
                    }),
                    cache: "no-store",
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to submit the prediction."
                );
            }

            const result = data.result || {};

            setHigherLowerReveal({
                previousCurrent: Number(
                    result.previousCurrent || 0
                ),
                revealedNext: Number(
                    result.revealedNext || 0
                ),
                correctDirection:
                    result.correctDirection ===
                    "lower"
                        ? "lower"
                        : "higher",
                correct: Boolean(result.correct),
            });

            setState((current) => ({
                ...current,
                score: Number(
                    result.correctCount ??
                        current.score ??
                        0
                ),
                higherLowerPromptNonce:
                    result.promptNonce ||
                    current.higherLowerPromptNonce,
                higherLowerCurrentNumber: Number(
                    result.currentNumber ??
                        current.higherLowerCurrentNumber ??
                        0
                ),
                higherLowerCorrect: Number(
                    result.correctCount ??
                        current.higherLowerCorrect ??
                        0
                ),
                higherLowerMistakes: Number(
                    result.mistakes ??
                        current.higherLowerMistakes ??
                        0
                ),
                higherLowerCurrentStreak: Number(
                    result.currentStreak ??
                        current.higherLowerCurrentStreak ??
                        0
                ),
                higherLowerBestStreak: Number(
                    result.bestStreak ??
                        current.higherLowerBestStreak ??
                        0
                ),
                secondsRemaining: Number(
                    result.secondsRemaining ??
                        current.secondsRemaining ??
                        0
                ),
            }));

            setHigherLowerFeedback(
                result.correct
                    ? "correct"
                    : "wrong"
            );

            if (
                result.correct &&
                "vibrate" in navigator
            ) {
                navigator.vibrate(12);
            }

            window.setTimeout(
                () =>
                    setHigherLowerFeedback(""),
                300
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to submit the prediction."
            );
        } finally {
            window.setTimeout(
                () => setHigherLowerBusy(false),
                80
            );
        }
    }

    const heading = useMemo(() => {
        if (state.paused) {
            return "Round paused";
        }
        if (
            ["round_complete", "completed"].includes(
                state.tournamentStatus || ""
            ) &&
            !state.resultsRevealed
        ) {
            return "Results are being prepared";
        }
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

            if (state.gameKey === "grab_coins") {
                return `${roundLabel}: Grab the Coins`;
            }

            if (state.gameKey === "match_cards") {
                return `${roundLabel}: Match the Cards`;
            }

            if (state.gameKey === "number_rush") {
                return `${roundLabel}: Number Rush`;
            }

            if (state.gameKey === "color_clash") {
                return `${roundLabel}: Colour Clash`;
            }

            if (state.gameKey === "odd_one_out") {
                return `${roundLabel}: Odd One Out`;
            }

            if (state.gameKey === "quick_math") {
                return `${roundLabel}: Quick Maths`;
            }

            if (state.gameKey === "sort_it_out") {
                return `${roundLabel}: Sort It Out`;
            }

            if (state.gameKey === "higher_lower") {
                return `${roundLabel}: Higher or Lower`;
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
                    Enter any display name to join.
                    Registration and check-in are not required.
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
                            placeholder="Your display name"
                            autoComplete="nickname"
                            minLength={1}
                            maxLength={60}
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

    if (
        state.broadcastActive &&
        state.broadcastDisplayMode === "takeover"
    ) {
        const warning =
            state.broadcastTone === "warning";
        const celebration =
            state.broadcastTone ===
            "celebration";

        return (
            <section
                className={`mx-auto flex min-h-[72vh] max-w-3xl flex-col items-center justify-center rounded-[2rem] border p-8 text-center shadow-2xl ${
                    warning
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                        : celebration
                          ? "border-pink-200 bg-gradient-to-br from-pink-50 via-white to-indigo-50 text-slate-950"
                          : "border-indigo-200 bg-[#F7F5FF] text-slate-950"
                }`}
            >
                <span
                    className={`flex h-24 w-24 items-center justify-center rounded-full ${
                        warning
                            ? "bg-amber-200 text-amber-900"
                            : celebration
                              ? "bg-pink-100 text-pink-600"
                              : "bg-indigo-100 text-indigo-700"
                    }`}
                >
                    {warning ? (
                        <AlertTriangle
                            size={44}
                        />
                    ) : celebration ? (
                        <PartyPopper
                            size={44}
                        />
                    ) : (
                        <Megaphone
                            size={44}
                        />
                    )}
                </span>

                <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] opacity-55">
                    Host Announcement
                </p>
                <h1 className="mt-3 text-4xl font-black sm:text-5xl">
                    {state.broadcastTitle}
                </h1>
                <p className="mt-5 max-w-2xl text-lg font-bold leading-8 opacity-70">
                    {state.broadcastMessage}
                </p>

                {state.broadcastSecondsRemaining !==
                    null &&
                    state.broadcastSecondsRemaining !==
                        undefined && (
                        <p className="mt-7 rounded-full bg-white/70 px-5 py-3 text-sm font-black shadow-sm">
                            Closes in{" "}
                            {
                                state.broadcastSecondsRemaining
                            } seconds
                        </p>
                    )}

                <p className="mt-6 text-sm font-bold opacity-55">
                    Keep this page open. The tournament will return automatically.
                </p>
            </section>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            {state.broadcastActive &&
                state.broadcastDisplayMode ===
                    "banner" && (
                    <section
                        className={`rounded-[1.5rem] border px-5 py-4 shadow-sm ${
                            state.broadcastTone ===
                            "warning"
                                ? "border-amber-300 bg-amber-50 text-amber-950"
                                : state.broadcastTone ===
                                    "celebration"
                                  ? "border-pink-200 bg-pink-50 text-pink-950"
                                  : "border-indigo-200 bg-[#F7F5FF] text-indigo-950"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 shrink-0">
                                {state.broadcastTone ===
                                "warning" ? (
                                    <AlertTriangle
                                        size={21}
                                    />
                                ) : state.broadcastTone ===
                                  "celebration" ? (
                                    <PartyPopper
                                        size={21}
                                    />
                                ) : (
                                    <Info size={21} />
                                )}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-black uppercase tracking-[0.15em] opacity-55">
                                    Host Announcement
                                </p>
                                <h2 className="mt-1 text-lg font-black">
                                    {
                                        state.broadcastTitle
                                    }
                                </h2>
                                <p className="mt-1 text-sm font-bold leading-6 opacity-70">
                                    {
                                        state.broadcastMessage
                                    }
                                </p>
                            </div>

                            {state.broadcastSecondsRemaining !==
                                null &&
                                state.broadcastSecondsRemaining !==
                                    undefined && (
                                    <span className="shrink-0 rounded-full bg-white/70 px-3 py-2 text-xs font-black">
                                        {
                                            state.broadcastSecondsRemaining
                                        }s
                                    </span>
                                )}
                        </div>
                    </section>
                )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                    {state.playerName}
                </p>
                <h1 className="mt-2 text-3xl font-black">
                    {heading}
                </h1>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                    {state.paused
                        ? state.pauseReason
                            ? `The organiser paused the round: ${state.pauseReason}`
                            : "The organiser paused the round. Your remaining time is protected."
                        : ["round_complete", "completed"].includes(
                              state.tournamentStatus || ""
                          ) && !state.resultsRevealed
                        ? "The organiser is preparing the official round results."
                        : state.playerStatus ===
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
                                  : state.gameKey === "higher_lower"
                                    ? "Predict whether the hidden next number will be higher or lower than the displayed number."
                                    : state.gameKey === "sort_it_out"
                                      ? "Tap the four shuffled numbers from smallest to largest. A wrong tap creates a new board."
                                      : state.gameKey === "quick_math"
                                      ? "Solve each arithmetic question and tap the correct answer before the timer ends."
                                      : state.gameKey === "odd_one_out"
                                      ? "Find and tap the one different symbol. Each answer immediately creates a new board."
                                      : state.gameKey === "color_clash"
                                      ? "Tap the actual text colour and ignore the colour word. Correct answers build your streak."
                                      : state.gameKey === "number_rush"
                                      ? "Tap 1 through 12 in order. Each completed board immediately reshuffles."
                                      : state.gameKey === "match_cards"
                                      ? "Find as many matching pairs as possible in 45 seconds. The server validates every card flip."
                                      : state.gameKey === "grab_coins"
                                      ? "Collect the moving gold coin for 30 seconds. Every server-verified coin adds one point."
                                      : state.gameKey === "coin_flip"
                                      ? "Complete three Coin Flip guesses. The highest number of correct guesses advances."
                                      : "Tap as quickly as possible for exactly 20 seconds."}
                </p>
            </section>

            {state.playerStatus === "active" &&
                state.readyOpen === true && (
                    <section
                        className={`rounded-[2rem] border p-6 text-center shadow-sm ${
                            state.playerReady
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-indigo-100 bg-white"
                        }`}
                    >
                        <UserRoundCheck
                            className={`mx-auto ${
                                state.playerReady
                                    ? "text-emerald-600"
                                    : "text-[#4F46E5]"
                            }`}
                            size={42}
                        />

                        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            Round {state.readyTargetRound || 1}
                        </p>
                        <h2 className="mt-2 text-2xl font-black">
                            {state.playerReady
                                ? "You are ready"
                                : "Ready for the next game?"}
                        </h2>
                        <p className="mt-2 text-sm font-bold text-slate-500">
                            Next game:{" "}
                            <span className="text-slate-900">
                                {state.nextGameTitle ||
                                    "Tap, Tap, Tap"}
                            </span>
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                            {state.readyCount || 0} of{" "}
                            {state.readyTotal || 0} active players ready
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                void updateReadyStatus(
                                    !state.playerReady
                                )
                            }
                            disabled={updatingReady}
                            className={`mt-5 inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black shadow-lg transition disabled:opacity-50 ${
                                state.playerReady
                                    ? "bg-white text-emerald-700"
                                    : "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white"
                            }`}
                        >
                            {updatingReady ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <UserRoundCheck
                                    size={18}
                                />
                            )}
                            {state.playerReady
                                ? "Not Ready Yet"
                                : "I Am Ready"}
                        </button>

                        {state.allReady && (
                            <p className="mt-4 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800">
                                All active players are ready. Wait for the organiser to start.
                            </p>
                        )}
                    </section>
                )}

            {state.paused ? (
                <section className="relative overflow-hidden rounded-[2rem] border border-amber-300 bg-amber-50 p-8 text-center shadow-xl">
                    <style jsx global>{`
                        @keyframes pause-pulse {
                            0%,
                            100% {
                                transform: scale(1);
                                opacity: 1;
                            }
                            50% {
                                transform: scale(1.08);
                                opacity: 0.75;
                            }
                        }
                    `}</style>

                    <span
                        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-200 text-amber-900"
                        style={{
                            animation:
                                "pause-pulse 1.6s ease-in-out infinite",
                        }}
                    >
                        <Pause
                            size={46}
                            strokeWidth={3}
                        />
                    </span>

                    <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                        Game Paused
                    </p>
                    <h2 className="mt-3 text-3xl font-black text-amber-950">
                        Keep this page open
                    </h2>
                    <p className="mt-3 text-sm font-bold leading-6 text-amber-800/80">
                        {state.pauseReason ||
                            "The organiser will resume the round shortly."}
                    </p>
                    <p className="mt-4 text-sm font-black text-amber-800">
                        Paused for{" "}
                        {state.pauseElapsedSeconds || 0} seconds
                    </p>
                </section>
            ) : ["round_complete", "completed"].includes(
                state.tournamentStatus || ""
            ) && !state.resultsRevealed ? (
                <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-center text-white shadow-2xl">
                    <style jsx global>{`
                        @keyframes result-orbit {
                            from {
                                transform: rotate(0deg);
                            }
                            to {
                                transform: rotate(360deg);
                            }
                        }
                    `}</style>

                    <div
                        className="mx-auto h-24 w-24 rounded-full border-4 border-white/10 border-t-indigo-300"
                        style={{
                            animation:
                                "result-orbit 1.1s linear infinite",
                        }}
                    />
                    <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                        Results Locked
                    </p>
                    <h2 className="mt-3 text-3xl font-black">
                        Please watch the audience screen
                    </h2>
                    <p className="mt-3 text-sm font-bold leading-6 text-white/50">
                        Your result will appear here when the organiser starts the official reveal.
                    </p>
                </section>
            ) : state.playerStatus ===
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
                ) : state.gameKey === "higher_lower" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes higher-lower-arrive {
                                0% {
                                    transform: scale(0.82);
                                    opacity: 0.25;
                                }
                                72% {
                                    transform: scale(1.08);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }

                            @keyframes higher-lower-shake {
                                0%,
                                100% {
                                    transform: translateX(0);
                                }
                                25% {
                                    transform: translateX(-9px);
                                }
                                75% {
                                    transform: translateX(9px);
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <CheckCircle2
                                    className="mx-auto text-emerald-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.higherLowerCorrect ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Correct
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Zap
                                    className="mx-auto text-sky-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.higherLowerCurrentStreak || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Streak
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <X
                                    className="mx-auto text-rose-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.higherLowerMistakes || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Mistakes
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div
                            key={
                                state.higherLowerPromptNonce ||
                                "higher-lower-prompt"
                            }
                            className={`mt-5 rounded-[2rem] border px-5 py-8 sm:py-10 ${
                                higherLowerFeedback === "correct"
                                    ? "border-emerald-300/40 bg-emerald-300/10"
                                    : higherLowerFeedback === "wrong"
                                      ? "border-rose-300/40 bg-rose-300/10"
                                      : "border-white/10 bg-white/[0.05]"
                            }`}
                            style={{
                                animation:
                                    higherLowerFeedback === "wrong"
                                        ? "higher-lower-shake 230ms ease-out"
                                        : "higher-lower-arrive 300ms cubic-bezier(.2,.9,.25,1.15)",
                            }}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <ArrowUpDown
                                    size={22}
                                    className="text-sky-300"
                                />
                                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
                                    Will the next number be
                                </p>
                            </div>

                            <p className="mt-7 text-8xl font-black leading-none text-sky-200 sm:text-9xl">
                                {state.higherLowerCurrentNumber || 50}
                            </p>

                            <p className="mt-6 text-sm font-bold text-white/45">
                                Best streak:{" "}
                                {state.higherLowerBestStreak || 0}
                            </p>
                        </div>

                        {higherLowerReveal && (
                            <div
                                className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black ${
                                    higherLowerReveal.correct
                                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                                        : "border-rose-300/30 bg-rose-300/10 text-rose-200"
                                }`}
                            >
                                {higherLowerReveal.previousCurrent}
                                {" → "}
                                {higherLowerReveal.revealedNext}
                                {" · "}
                                {higherLowerReveal.correctDirection ===
                                "higher"
                                    ? "Higher"
                                    : "Lower"}
                                {" · "}
                                {higherLowerReveal.correct
                                    ? "Correct"
                                    : "Wrong"}
                            </div>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    void submitHigherLower(
                                        "higher"
                                    );
                                }}
                                disabled={
                                    higherLowerBusy ||
                                    state.roundStatus !==
                                        "active"
                                }
                                className="flex min-h-28 touch-manipulation flex-col items-center justify-center rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-300 px-4 text-slate-950 shadow-xl shadow-emerald-500/15 transition hover:-translate-y-1 hover:brightness-105 active:scale-[0.96] disabled:cursor-default disabled:opacity-65"
                            >
                                <ArrowUp
                                    size={40}
                                    strokeWidth={3}
                                />
                                <span className="mt-2 text-2xl font-black">
                                    Higher
                                </span>
                            </button>

                            <button
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    void submitHigherLower(
                                        "lower"
                                    );
                                }}
                                disabled={
                                    higherLowerBusy ||
                                    state.roundStatus !==
                                        "active"
                                }
                                className="flex min-h-28 touch-manipulation flex-col items-center justify-center rounded-2xl border border-indigo-300/25 bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 px-4 text-slate-950 shadow-xl shadow-indigo-500/15 transition hover:-translate-y-1 hover:brightness-105 active:scale-[0.96] disabled:cursor-default disabled:opacity-65"
                            >
                                <ArrowDown
                                    size={40}
                                    strokeWidth={3}
                                />
                                <span className="mt-2 text-2xl font-black">
                                    Lower
                                </span>
                            </button>
                        </div>

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "sort_it_out" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes sort-board-arrive {
                                0% {
                                    transform: scale(0.88);
                                    opacity: 0.3;
                                }
                                72% {
                                    transform: scale(1.05);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }

                            @keyframes sort-board-shake {
                                0%,
                                100% {
                                    transform: translateX(0);
                                }
                                25% {
                                    transform: translateX(-9px);
                                }
                                75% {
                                    transform: translateX(9px);
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <CheckCircle2
                                    className="mx-auto text-emerald-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.sortItOutCorrect ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Correct
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <ListOrdered
                                    className="mx-auto text-lime-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.sortItOutBoardsCompleted || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Boards
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <X
                                    className="mx-auto text-rose-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.sortItOutMistakes || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Mistakes
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div
                            key={
                                state.sortItOutPromptNonce ||
                                "sort-board"
                            }
                            className={`mt-5 rounded-[2rem] border p-5 sm:p-7 ${
                                sortItOutFeedback === "correct"
                                    ? "border-emerald-300/40 bg-emerald-300/10"
                                    : sortItOutFeedback === "wrong"
                                      ? "border-rose-300/40 bg-rose-300/10"
                                      : "border-white/10 bg-white/[0.05]"
                            }`}
                            style={{
                                animation:
                                    sortItOutFeedback === "wrong"
                                        ? "sort-board-shake 230ms ease-out"
                                        : "sort-board-arrive 300ms cubic-bezier(.2,.9,.25,1.15)",
                            }}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <ListOrdered
                                    size={22}
                                    className="text-lime-300"
                                />
                                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
                                    Smallest to largest
                                </p>
                            </div>

                            <p className="mt-4 text-sm font-bold text-white/45">
                                Number{" "}
                                {state.sortItOutExpectedPosition || 1}
                                {" "}of 4
                                {" · "}Best streak:{" "}
                                {state.sortItOutBestStreak || 0}
                            </p>

                            <div className="mt-6 grid grid-cols-2 gap-4">
                                {(state.sortItOutNumbers || []).map(
                                    (numberValue, index) => {
                                        const ordered = [
                                            ...(state.sortItOutNumbers || []),
                                        ].sort((a, b) => a - b);
                                        const completed =
                                            ordered.indexOf(
                                                numberValue
                                            ) <
                                            Math.max(
                                                0,
                                                (state.sortItOutExpectedPosition ||
                                                    1) - 1
                                            );

                                        return (
                                            <button
                                                key={`${state.sortItOutPromptNonce}-${index}-${numberValue}`}
                                                type="button"
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    void submitSortItOut(
                                                        index
                                                    );
                                                }}
                                                disabled={
                                                    sortItOutBusy ||
                                                    state.roundStatus !==
                                                        "active" ||
                                                    completed
                                                }
                                                className={`min-h-28 touch-manipulation rounded-2xl border px-4 text-5xl font-black shadow-xl transition active:scale-[0.96] disabled:cursor-default ${
                                                    completed
                                                        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300 opacity-55"
                                                        : "border-lime-300/20 bg-gradient-to-br from-lime-300 via-emerald-300 to-cyan-300 text-slate-950 shadow-lime-500/15 hover:-translate-y-1 hover:brightness-105"
                                                }`}
                                            >
                                                {completed ? "✓" : numberValue}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "quick_math" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes quick-math-arrive {
                                0% {
                                    transform: scale(0.86);
                                    opacity: 0.3;
                                }
                                72% {
                                    transform: scale(1.06);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }

                            @keyframes quick-math-shake {
                                0%,
                                100% {
                                    transform: translateX(0);
                                }
                                25% {
                                    transform: translateX(-9px);
                                }
                                75% {
                                    transform: translateX(9px);
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <CheckCircle2
                                    className="mx-auto text-emerald-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.quickMathCorrect ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Correct
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Zap
                                    className="mx-auto text-orange-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.quickMathCurrentStreak || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Streak
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <X
                                    className="mx-auto text-rose-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.quickMathMistakes || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Mistakes
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div
                            key={
                                state.quickMathPromptNonce ||
                                "math-question"
                            }
                            className={`mt-5 rounded-[2rem] border px-5 py-9 sm:py-12 ${
                                quickMathFeedback === "correct"
                                    ? "border-emerald-300/40 bg-emerald-300/10"
                                    : quickMathFeedback === "wrong"
                                      ? "border-rose-300/40 bg-rose-300/10"
                                      : "border-white/10 bg-white/[0.05]"
                            }`}
                            style={{
                                animation:
                                    quickMathFeedback === "wrong"
                                        ? "quick-math-shake 230ms ease-out"
                                        : "quick-math-arrive 300ms cubic-bezier(.2,.9,.25,1.15)",
                            }}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <Calculator
                                    size={22}
                                    className="text-orange-300"
                                />
                                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
                                    Choose the correct answer
                                </p>
                            </div>

                            <p className="mt-7 break-words text-6xl font-black leading-none text-orange-200 sm:text-8xl">
                                {state.quickMathExpression ||
                                    "8 + 4"}
                            </p>

                            <p className="mt-6 text-sm font-bold text-white/45">
                                Best streak:{" "}
                                {state.quickMathBestStreak || 0}
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            {(state.quickMathOptions || []).map(
                                (answer, index) => (
                                    <button
                                        key={`${state.quickMathPromptNonce}-${index}-${answer}`}
                                        type="button"
                                        onPointerDown={(event) => {
                                            event.preventDefault();
                                            void submitQuickMath(
                                                answer
                                            );
                                        }}
                                        disabled={
                                            quickMathBusy ||
                                            state.roundStatus !==
                                                "active"
                                        }
                                        className="min-h-24 touch-manipulation rounded-2xl border border-orange-300/20 bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300 px-4 text-4xl font-black text-slate-950 shadow-xl shadow-orange-500/15 transition hover:-translate-y-1 hover:brightness-105 active:scale-[0.96] disabled:cursor-default disabled:opacity-65"
                                    >
                                        {answer}
                                    </button>
                                )
                            )}
                        </div>

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "odd_one_out" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes odd-board-arrive {
                                0% {
                                    transform: scale(0.9);
                                    opacity: 0.35;
                                }
                                70% {
                                    transform: scale(1.03);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }

                            @keyframes odd-board-shake {
                                0%,
                                100% {
                                    transform: translateX(0);
                                }
                                25% {
                                    transform: translateX(-9px);
                                }
                                75% {
                                    transform: translateX(9px);
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <CheckCircle2
                                    className="mx-auto text-emerald-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.oddOneOutCorrect ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Correct
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Zap
                                    className="mx-auto text-teal-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.oddOneOutCurrentStreak || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Streak
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <X
                                    className="mx-auto text-rose-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.oddOneOutMistakes || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Mistakes
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div
                            key={
                                state.oddOneOutPromptNonce ||
                                "odd-board"
                            }
                            className={`mt-5 rounded-[2rem] border p-4 sm:p-6 ${
                                oddOneOutFeedback === "correct"
                                    ? "border-emerald-300/40 bg-emerald-300/10"
                                    : oddOneOutFeedback === "wrong"
                                      ? "border-rose-300/40 bg-rose-300/10"
                                      : "border-white/10 bg-white/[0.05]"
                            }`}
                            style={{
                                animation:
                                    oddOneOutFeedback === "wrong"
                                        ? "odd-board-shake 230ms ease-out"
                                        : "odd-board-arrive 300ms cubic-bezier(.2,.9,.25,1.15)",
                            }}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <Eye
                                    size={22}
                                    className="text-teal-300"
                                />
                                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
                                    Tap the different symbol
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                                {(state.oddOneOutTiles || []).map(
                                    (shape, index) => (
                                        <button
                                            key={`${state.oddOneOutPromptNonce}-${index}`}
                                            type="button"
                                            onPointerDown={(event) => {
                                                event.preventDefault();
                                                void submitOddOneOut(index);
                                            }}
                                            disabled={
                                                oddOneOutBusy ||
                                                state.roundStatus !==
                                                    "active"
                                            }
                                            className="flex aspect-square touch-manipulation items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white shadow-lg transition hover:-translate-y-1 hover:border-teal-300/35 hover:bg-teal-300/10 active:scale-[0.94] disabled:cursor-default disabled:opacity-65"
                                            aria-label={`Symbol ${index + 1}`}
                                        >
                                            <OddOneOutShapeIcon
                                                shape={shape}
                                                className="h-11 w-11 sm:h-14 sm:w-14"
                                            />
                                        </button>
                                    )
                                )}
                            </div>

                            <p className="mt-5 text-sm font-bold text-white/45">
                                Best streak:{" "}
                                {state.oddOneOutBestStreak || 0}
                            </p>
                        </div>

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "color_clash" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes colour-clash-pop {
                                0% {
                                    transform: scale(0.78);
                                    opacity: 0.35;
                                }
                                72% {
                                    transform: scale(1.12);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }

                            @keyframes colour-clash-shake {
                                0%,
                                100% {
                                    transform: translateX(0);
                                }
                                25% {
                                    transform: translateX(-9px);
                                }
                                75% {
                                    transform: translateX(9px);
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <CheckCircle2
                                    className="mx-auto text-emerald-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.colorClashCorrect ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Correct
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Zap
                                    className="mx-auto text-fuchsia-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.colorClashCurrentStreak || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Streak
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <X
                                    className="mx-auto text-rose-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.colorClashMistakes || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Mistakes
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-3 sm:p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={20}
                                />
                                <p className="mt-2 text-3xl font-black sm:text-4xl">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45 sm:text-xs">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div
                            className={`mt-5 rounded-[2rem] border px-5 py-9 sm:py-12 ${
                                colourClashFeedback === "correct"
                                    ? "border-emerald-300/40 bg-emerald-300/10"
                                    : colourClashFeedback === "wrong"
                                      ? "border-rose-300/40 bg-rose-300/10"
                                      : "border-white/10 bg-white/[0.05]"
                            }`}
                            style={{
                                animation:
                                    colourClashFeedback === "correct"
                                        ? "colour-clash-pop 260ms ease-out"
                                        : colourClashFeedback === "wrong"
                                          ? "colour-clash-shake 230ms ease-out"
                                          : undefined,
                            }}
                        >
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                                Tap the text colour, not the word
                            </p>

                            <p
                                key={
                                    state.colorClashPromptNonce ||
                                    "colour-prompt"
                                }
                                className={`mt-6 break-words text-6xl font-black uppercase leading-none sm:text-8xl ${
                                    COLOUR_CLASH_TEXT_CLASS[
                                        (state.colorClashColour ||
                                            "red") as ColourClashColour
                                    ]
                                }`}
                                style={{
                                    animation:
                                        "colour-clash-pop 320ms cubic-bezier(.2,.9,.25,1.25)",
                                }}
                            >
                                {state.colorClashWord ||
                                    "red"}
                            </p>

                            <p className="mt-6 text-sm font-bold text-white/45">
                                Best streak:{" "}
                                {state.colorClashBestStreak || 0}
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            {COLOUR_CLASH_OPTIONS.map(
                                (option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onPointerDown={(event) => {
                                            event.preventDefault();
                                            void submitColourClash(
                                                option.key
                                            );
                                        }}
                                        disabled={
                                            colourClashBusy ||
                                            state.roundStatus !==
                                                "active"
                                        }
                                        className={`flex min-h-20 touch-manipulation items-center justify-center gap-3 rounded-2xl border px-4 text-xl font-black shadow-xl transition hover:-translate-y-1 active:scale-[0.96] disabled:cursor-default disabled:opacity-65 ${option.buttonClass}`}
                                    >
                                        <span
                                            className={`h-5 w-5 rounded-full border border-white/40 shadow-inner ${option.dotClass}`}
                                        />
                                        {option.label}
                                    </button>
                                )
                            )}
                        </div>

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "number_rush" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes number-correct-pop {
                                0% {
                                    transform: scale(0.75);
                                }
                                70% {
                                    transform: scale(1.14);
                                }
                                100% {
                                    transform: scale(1);
                                }
                            }

                            @keyframes number-wrong-shake {
                                0%,
                                100% {
                                    transform: translateX(0);
                                }
                                25% {
                                    transform: translateX(-8px);
                                }
                                75% {
                                    transform: translateX(8px);
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <Hash
                                    className="mx-auto text-cyan-300"
                                    size={21}
                                />
                                <p className="mt-2 text-4xl font-black">
                                    {state.numberRushCorrect ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Correct
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={21}
                                />
                                <p className="mt-2 text-4xl font-black">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Seconds
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <X
                                    className="mx-auto text-rose-300"
                                    size={21}
                                />
                                <p className="mt-2 text-4xl font-black">
                                    {state.numberRushMistakes || 0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Mistakes
                                </p>
                            </div>
                        </div>

                        <div
                            className={`mt-5 rounded-[1.5rem] border px-5 py-4 ${
                                numberRushFeedback === "correct"
                                    ? "border-emerald-300/40 bg-emerald-300/15"
                                    : numberRushFeedback === "wrong"
                                      ? "border-rose-300/40 bg-rose-300/15"
                                      : "border-white/10 bg-white/5"
                            }`}
                            style={{
                                animation:
                                    numberRushFeedback === "correct"
                                        ? "number-correct-pop 260ms ease-out"
                                        : numberRushFeedback === "wrong"
                                          ? "number-wrong-shake 220ms ease-out"
                                          : undefined,
                            }}
                        >
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                                Tap Next
                            </p>
                            <p className="mt-1 text-6xl font-black text-cyan-200">
                                {state.numberRushExpected || 1}
                            </p>
                            <p className="mt-1 text-xs font-bold text-white/40">
                                Boards completed:{" "}
                                {state.numberRushBoardsCompleted || 0}
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                            {(state.numberRushBoard || []).map(
                                (numberValue, index) => {
                                    const isTarget =
                                        numberValue ===
                                        (state.numberRushExpected || 1);

                                    return (
                                        <button
                                            key={`${state.numberRushBoardNonce}-${index}`}
                                            type="button"
                                            onPointerDown={(event) => {
                                                event.preventDefault();
                                                void submitNumberRushTile(index);
                                            }}
                                            disabled={
                                                numberRushBusy ||
                                                state.roundStatus !== "active"
                                            }
                                            className={`aspect-square touch-manipulation rounded-2xl border text-3xl font-black shadow-lg transition active:scale-[0.94] disabled:cursor-default ${
                                                isTarget
                                                    ? "border-cyan-300/30 bg-gradient-to-br from-cyan-300 to-indigo-400 text-slate-950 shadow-cyan-500/20"
                                                    : "border-white/10 bg-white/[0.07] text-white hover:-translate-y-1 hover:bg-white/[0.12]"
                                            }`}
                                        >
                                            {numberValue}
                                        </button>
                                    );
                                }
                            )}
                        </div>

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "match_cards" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <Grid2X2
                                    className="mx-auto text-indigo-300"
                                    size={21}
                                />
                                <p className="mt-2 text-4xl font-black">
                                    {state.matchCardPairsFound ||
                                        state.score ||
                                        0}
                                    /6
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Pairs
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <MousePointerClick
                                    className="mx-auto text-pink-300"
                                    size={21}
                                />
                                <p className="mt-2 text-4xl font-black">
                                    {state.matchCardAttempts || 0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Attempts
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <Activity
                                    className="mx-auto text-amber-300"
                                    size={21}
                                />
                                <p className="mt-2 text-4xl font-black">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        {state.matchCardCompleted ? (
                            <div className="mt-6 rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/10 p-8">
                                <CheckCircle2
                                    size={48}
                                    className="mx-auto text-emerald-300"
                                />
                                <p className="mt-4 text-2xl font-black">
                                    All six pairs matched
                                </p>
                                <p className="mt-2 text-sm font-bold text-white/55">
                                    Wait for the remaining players or the round timer.
                                </p>
                            </div>
                        ) : (
                            <div className="mx-auto mt-6 grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
                                {Array.from(
                                    { length: 12 },
                                    (_, index) => {
                                        const matched =
                                            state.matchCardMatchedIndexes?.includes(
                                                index
                                            ) || false;
                                        const stateSymbol =
                                            state.matchCardDeckView?.[
                                                index
                                            ] || null;
                                        const symbol =
                                            temporaryMatchCards[
                                                index
                                            ] ||
                                            stateSymbol;

                                        return (
                                            <TournamentMemoryCard
                                                key={index}
                                                index={index}
                                                symbol={symbol}
                                                matched={matched}
                                                loading={
                                                    flippingMatchCard ===
                                                    index
                                                }
                                                disabled={
                                                    matched ||
                                                    flippingMatchCard !==
                                                        null ||
                                                    state.roundStatus !==
                                                        "active"
                                                }
                                                onFlip={() =>
                                                    void flipMatchCard(
                                                        index
                                                    )
                                                }
                                            />
                                        );
                                    }
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
                                {error}
                            </p>
                        )}
                    </section>
                ) : state.gameKey === "grab_coins" ? (
                    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-7">
                        <style jsx global>{`
                            @keyframes tournament-grab-arrive {
                                0% {
                                    transform:
                                        translate(-50%, -50%)
                                        scale(0.35)
                                        rotateY(-180deg);
                                    opacity: 0;
                                }
                                70% {
                                    transform:
                                        translate(-50%, -50%)
                                        scale(1.16)
                                        rotateY(20deg);
                                    opacity: 1;
                                }
                                100% {
                                    transform:
                                        translate(-50%, -50%)
                                        scale(1)
                                        rotateY(0deg);
                                    opacity: 1;
                                }
                            }

                            @keyframes tournament-grab-ring {
                                0% {
                                    transform: scale(0.65);
                                    opacity: 0.9;
                                }
                                100% {
                                    transform: scale(1.8);
                                    opacity: 0;
                                }
                            }
                        `}</style>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/10 p-4">
                                <Coins
                                    className="mx-auto text-amber-300"
                                    size={21}
                                />
                                <p className="mt-2 text-5xl font-black">
                                    {state.grabCoinsCollected ||
                                        state.score ||
                                        0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Coins
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <MousePointerClick
                                    className="mx-auto text-pink-300"
                                    size={21}
                                />
                                <p className="mt-2 text-5xl font-black">
                                    {state.secondsRemaining || 0}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">
                                    Seconds
                                </p>
                            </div>
                        </div>

                        <div className="relative mt-5 h-[430px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#17173A] via-slate-950 to-[#102D26]">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.13),transparent_58%)]" />

                            <button
                                key={`${state.grabCoinNonce}-${grabPulseKey}`}
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    void collectGrabCoin();
                                }}
                                disabled={
                                    collectingCoin ||
                                    !state.grabCoinNonce
                                }
                                style={{
                                    left: `${state.grabCoinLeft ?? 50}%`,
                                    top: `${state.grabCoinTop ?? 50}%`,
                                    animation:
                                        "tournament-grab-arrive 380ms cubic-bezier(.2,.9,.25,1.25)",
                                }}
                                className="group absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 touch-manipulation select-none rounded-full outline-none transition hover:scale-110 focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-90 disabled:opacity-60"
                                aria-label="Collect gold coin"
                            >
                                <span
                                    key={`ring-${grabPulseKey}`}
                                    className="pointer-events-none absolute inset-[-10px] rounded-full border-2 border-amber-300/60"
                                    style={{
                                        animation:
                                            grabPulseKey > 0
                                                ? "tournament-grab-ring 420ms ease-out forwards"
                                                : undefined,
                                    }}
                                />

                                <span
                                    className="absolute inset-0 rounded-full p-[4px] shadow-[0_18px_50px_rgba(245,158,11,0.58)]"
                                    style={{
                                        background:
                                            "repeating-conic-gradient(from 0deg,#fff3a8 0deg 6deg,#c77908 6deg 12deg)",
                                    }}
                                >
                                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-amber-100 bg-gradient-to-br from-[#FFF7BD] via-[#F5C84C] to-[#B96A06]">
                                        <span className="absolute inset-[10%] rounded-full border-2 border-amber-800/30 shadow-[inset_0_3px_7px_rgba(255,255,255,0.72),inset_0_-8px_14px_rgba(110,57,0,0.30)]" />
                                        <span className="absolute -left-1/4 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/75 to-transparent blur-sm" />
                                        <span className="relative flex h-[58%] w-[58%] items-center justify-center rounded-full border border-amber-900/20 bg-amber-200/25 text-amber-950">
                                            <CircleDollarSign
                                                size={40}
                                                strokeWidth={2.4}
                                            />
                                        </span>
                                    </span>
                                </span>
                            </button>

                            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur">
                                Tap the moving gold coin
                            </p>
                        </div>

                        {error && (
                            <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
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
                            : state.gameKey === "higher_lower"
                              ? "The first number prediction appears when the 30-second round starts."
                              : state.gameKey === "sort_it_out"
                                ? "The first shuffled number board appears when the 30-second round starts."
                                : state.gameKey === "quick_math"
                                ? "The first maths question appears when the 30-second round starts."
                                : state.gameKey === "odd_one_out"
                                ? "The first symbol board appears when the 30-second round starts."
                                : state.gameKey === "color_clash"
                                ? "The first colour prompt appears when the 30-second round starts."
                                : state.gameKey === "number_rush"
                                ? "The shuffled number board appears when the 30-second round starts."
                                : state.gameKey === "match_cards"
                                ? "The shuffled card board appears when the 45-second round starts."
                                : state.gameKey === "grab_coins"
                              ? "The moving gold coin appears when the 30-second round starts."
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

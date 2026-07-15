"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Citrus, Gem, Grape, Grid2X2, Loader2, Star, Cherry, Circle } from "lucide-react";
import {
    asObject,
    CommonDuelState,
    CountdownCard,
    DuelScoreboard,
    GameFrame,
    MatchmakingPanel,
    PlayerGate,
    PlayerStats,
    readJson,
    ResultPanel,
    useVerifiedGlitterPlayer,
} from "./SpeedDuelShared";

type MatchCardsState = CommonDuelState & {
    your_attempts: number;
    opponent_attempts: number;
    your_matched_indexes: number[];
    your_first_index: number | null;
    your_first_symbol: string | null;
};

type FlipResult = {
    first_index: number;
    second_index: number | null;
    first_symbol: string;
    second_symbol: string | null;
    is_match: boolean | null;
    matched_indexes: number[];
    your_score: number;
    opponent_score: number;
    your_attempts: number;
    match_status: MatchCardsState["match_status"];
    seconds_remaining: number;
};

function emptyState(raw: Record<string, unknown>): MatchCardsState {
    return {
        match_token: String(raw.match_token || ""),
        match_status: (raw.match_status || "waiting") as MatchCardsState["match_status"],
        opponent_name: typeof raw.opponent_name === "string" ? raw.opponent_name : null,
        starts_at: typeof raw.starts_at === "string" ? raw.starts_at : null,
        ends_at: typeof raw.ends_at === "string" ? raw.ends_at : null,
        seconds_until_start: Number(raw.seconds_until_start || 0),
        seconds_remaining: Number(raw.seconds_remaining ?? 20),
        your_score: 0,
        opponent_score: 0,
        your_attempts: 0,
        opponent_attempts: 0,
        your_matched_indexes: [],
        your_first_index: null,
        your_first_symbol: null,
        you_won: null,
        points_awarded: 0,
        result_code: null,
        player_total_points: 0,
        player_total_wins: 0,
        player_total_plays: 0,
    };
}

function SymbolArtwork({ symbol }: { symbol?: string }) {
    const iconClass = "h-9 w-9 sm:h-11 sm:w-11";
    const icons: Record<string, React.ReactNode> = {
        "🍒": <Cherry className={`${iconClass} text-rose-500`} />,
        "🍋": <Citrus className={`${iconClass} text-amber-500`} />,
        "🍉": <Circle className={`${iconClass} fill-emerald-100 text-emerald-500`} />,
        "🍇": <Grape className={`${iconClass} text-violet-500`} />,
        "⭐": <Star className={`${iconClass} fill-amber-200 text-amber-500`} />,
        "💎": <Gem className={`${iconClass} text-cyan-500`} />,
    };

    return icons[symbol || ""] || <Grid2X2 className={`${iconClass} text-[#4F46E5]`} />;
}

function MemoryCard({
    index,
    symbol,
    matched,
    disabled,
    onFlip,
}: {
    index: number;
    symbol?: string;
    matched: boolean;
    disabled: boolean;
    onFlip: () => void;
}) {
    const faceUp = Boolean(symbol) || matched;

    return (
        <button
            type="button"
            onClick={onFlip}
            disabled={disabled}
            className="group aspect-[3/4] touch-manipulation outline-none active:scale-[0.97] disabled:cursor-default"
            style={{ perspective: "1000px" }}
            aria-label={`Card ${index + 1}${faceUp ? ", revealed" : ""}`}
        >
            <span
                className="relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
                style={{
                    transform: faceUp ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
            >
                <span className="absolute inset-0 overflow-hidden rounded-2xl border border-indigo-200/30 bg-gradient-to-br from-[#312E81] via-[#4F46E5] to-[#EC4899] shadow-[0_16px_30px_rgba(15,23,42,0.34)] [backface-visibility:hidden] group-hover:-translate-y-1 group-hover:shadow-[0_20px_38px_rgba(79,70,229,0.32)]">
                    <span className="absolute inset-[7px] rounded-xl border border-white/30" />
                    <span className="absolute inset-[13px] rounded-lg border border-dashed border-white/20" />
                    <span className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,white_1.5px,transparent_1.5px)] [background-size:14px_14px]" />
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 rotate-45 items-center justify-center rounded-xl border border-white/25 bg-white/15 shadow-inner sm:h-14 sm:w-14">
                            <Grid2X2 className="-rotate-45 text-white" size={26} />
                        </span>
                    </span>
                </span>

                <span className={`absolute inset-0 overflow-hidden rounded-2xl border bg-white shadow-[0_16px_30px_rgba(15,23,42,0.24)] [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    matched ? "border-emerald-300 ring-4 ring-emerald-300/20" : "border-slate-200"
                }`}>
                    <span className="absolute left-3 top-2 text-xs font-black text-slate-400">
                        {index + 1}
                    </span>
                    <span className="absolute bottom-2 right-3 rotate-180 text-xs font-black text-slate-400">
                        {index + 1}
                    </span>

                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className={`flex h-[58%] w-[58%] items-center justify-center rounded-2xl border shadow-inner ${
                            matched
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-indigo-100 bg-[#F7F5FF]"
                        }`}>
                            <SymbolArtwork symbol={symbol} />
                        </span>
                    </span>

                    {matched && (
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                            <Check size={16} strokeWidth={3} />
                        </span>
                    )}
                </span>
            </span>
        </button>
    );
}

export default function MatchCardsGame({
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
    const playerState = useVerifiedGlitterPlayer({ eventId, slug });
    const { player, setError, clearPlayer, updatePlayerTotals } = playerState;
    const [match, setMatch] = useState<MatchCardsState | null>(null);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [flipping, setFlipping] = useState(false);
    const [revealed, setRevealed] = useState<Record<number, string>>({});

    const fetchState = useCallback(
        async (token: string, quiet = true) => {
            if (!player) return null;
            try {
                const response = await fetch(
                    `/api/public/events/${encodeURIComponent(slug)}/games/match-cards/match-state`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            playerToken: player.player_token,
                            matchToken: token,
                        }),
                        cache: "no-store",
                    },
                );
                const data = await readJson(response);
                const next = asObject<MatchCardsState>(data.match);
                if (!response.ok || !next) {
                    if (response.status === 401) clearPlayer();
                    throw new Error(
                        typeof data.error === "string"
                            ? data.error
                            : "Unable to refresh the challenge.",
                    );
                }
                setMatch(next);
                updatePlayerTotals(next);
                if (next.your_first_index !== null && next.your_first_symbol) {
                    setRevealed((current) => ({
                        ...current,
                        [next.your_first_index as number]: next.your_first_symbol as string,
                    }));
                }
                if (!quiet) setError("");
                return next;
            } catch (caught) {
                if (!quiet) {
                    setError(
                        caught instanceof Error
                            ? caught.message
                            : "Unable to refresh the challenge.",
                    );
                }
                return null;
            }
        },
        [clearPlayer, player, setError, slug, updatePlayerTotals],
    );

    useEffect(() => {
        if (!match || !["waiting", "countdown", "active"].includes(match.match_status)) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void fetchState(match.match_token, true);
        }, 800);
        return () => window.clearInterval(timer);
    }, [fetchState, match]);

    async function joinMatch() {
        if (!player || joining) return;
        setJoining(true);
        setError("");
        setRevealed({});
        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/join`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        playerToken: player.player_token,
                        gameKey: "match_cards",
                    }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            const basic = asObject<Record<string, unknown>>(data.match);
            if (!response.ok || !basic) {
                throw new Error(typeof data.error === "string" ? data.error : "Unable to find an opponent.");
            }
            const initial = emptyState(basic);
            setMatch(initial);
            await fetchState(initial.match_token, true);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to find an opponent.");
        } finally {
            setJoining(false);
        }
    }

    async function leaveMatch() {
        if (!player || !match || leaving) return;
        setLeaving(true);
        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/leave`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ playerToken: player.player_token, matchToken: match.match_token }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to leave the challenge.");
            setMatch(null);
            setRevealed({});
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to leave the challenge.");
        } finally {
            setLeaving(false);
        }
    }

    async function flipCard(cardIndex: number) {
        if (!player || !match || match.match_status !== "active" || flipping) return;
        if (match.your_matched_indexes.includes(cardIndex)) return;
        setFlipping(true);
        setError("");
        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(slug)}/games/match-cards/flip`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        playerToken: player.player_token,
                        matchToken: match.match_token,
                        cardIndex,
                    }),
                    cache: "no-store",
                },
            );
            const data = await readJson(response);
            const result = asObject<FlipResult>(data.result);
            if (!response.ok || !result) {
                throw new Error(typeof data.error === "string" ? data.error : "Unable to flip the card.");
            }

            setMatch((current) =>
                current
                    ? {
                          ...current,
                          match_status: result.match_status,
                          your_score: result.your_score,
                          opponent_score: result.opponent_score,
                          your_attempts: result.your_attempts,
                          seconds_remaining: result.seconds_remaining,
                          your_matched_indexes: result.matched_indexes || [],
                          your_first_index: result.second_index === null ? result.first_index : null,
                          your_first_symbol: result.second_index === null ? result.first_symbol : null,
                      }
                    : current,
            );

            setRevealed((current) => ({
                ...current,
                [result.first_index]: result.first_symbol,
                ...(result.second_index !== null && result.second_symbol
                    ? { [result.second_index]: result.second_symbol }
                    : {}),
            }));

            if (result.second_index !== null) {
                window.setTimeout(() => {
                    setRevealed((current) => {
                        const next = { ...current };
                        if (!result.is_match) {
                            delete next[result.first_index];
                            delete next[result.second_index as number];
                        }
                        return next;
                    });
                    setFlipping(false);
                    if (result.match_status === "completed") void fetchState(match.match_token, true);
                }, 650);
                return;
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to flip the card.");
        } finally {
            if (!match || match.your_first_index === null) setFlipping(false);
            window.setTimeout(() => setFlipping(false), 700);
        }
    }

    function changePlayer() {
        clearPlayer();
        setMatch(null);
        setRevealed({});
    }

    return (
        <GameFrame
            title="Match the Cards"
            subtitle="Find more matching pairs than your opponent before time runs out."
            eventName={eventName}
            lobbyHref={lobbyHref}
            slug={slug}
            icon={<Grid2X2 size={25} />}
            error={playerState.error}
        >
            <PlayerGate
                loading={playerState.loadingPlayer}
                player={player}
                lookup={playerState.lookup}
                setLookup={playerState.setLookup}
                saving={playerState.savingPlayer}
                onSubmit={playerState.verifyPlayer}
            />

            {player && (
                <>
                    <PlayerStats player={player} />
                    {!match || match.match_status === "waiting" ? (
                        <MatchmakingPanel
                            playerName={player.display_name}
                            status={match?.match_status}
                            joining={joining}
                            leaving={leaving}
                            onJoin={joinMatch}
                            onLeave={leaveMatch}
                            onChangePlayer={changePlayer}
                        />
                    ) : match.match_status === "countdown" ? (
                        <CountdownCard seconds={match.seconds_until_start} opponentName={match.opponent_name} />
                    ) : match.match_status === "completed" ? (
                        <ResultPanel
                            won={match.you_won}
                            points={match.points_awarded}
                            opponentName={match.opponent_name}
                            yourScore={match.your_score}
                            opponentScore={match.opponent_score}
                            joining={joining}
                            onPlayAgain={() => {
                                setMatch(null);
                                setRevealed({});
                                window.setTimeout(() => void joinMatch(), 0);
                            }}
                            slug={slug}
                        />
                    ) : (
                        <>
                            <DuelScoreboard
                                playerName={player.display_name}
                                opponentName={match.opponent_name}
                                yourScore={match.your_score}
                                opponentScore={match.opponent_score}
                                seconds={match.seconds_remaining}
                                label="Pairs"
                            />
                            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl sm:p-6">
                                <p className="mb-5 text-center text-sm font-bold text-white/55">
                                    Your attempts: {match.your_attempts}. Tap a card to flip it. Matched pairs stay face up.
                                </p>
                                <div className="mx-auto grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
                                    {Array.from({ length: 12 }, (_, index) => {
                                        const matched = match.your_matched_indexes.includes(index);
                                        const symbol = revealed[index];

                                        return (
                                            <MemoryCard
                                                key={index}
                                                index={index}
                                                symbol={symbol}
                                                matched={matched}
                                                disabled={
                                                    matched ||
                                                    flipping ||
                                                    match.match_status !== "active"
                                                }
                                                onFlip={() => void flipCard(index)}
                                            />
                                        );
                                    })}
                                </div>
                                {flipping && (
                                    <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-white/55">
                                        <Loader2 size={16} className="animate-spin" /> Checking cards...
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </>
            )}
        </GameFrame>
    );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
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

type GrabState = CommonDuelState;
type CollectResult = {
    verified_coins: number;
    opponent_coins: number;
    seconds_remaining: number;
    match_status: GrabState["match_status"];
};

function initialState(raw: Record<string, unknown>): GrabState {
    return {
        match_token: String(raw.match_token || ""),
        match_status: (raw.match_status || "waiting") as GrabState["match_status"],
        opponent_name: typeof raw.opponent_name === "string" ? raw.opponent_name : null,
        starts_at: typeof raw.starts_at === "string" ? raw.starts_at : null,
        ends_at: typeof raw.ends_at === "string" ? raw.ends_at : null,
        seconds_until_start: Number(raw.seconds_until_start || 0),
        seconds_remaining: Number(raw.seconds_remaining ?? 20),
        your_score: 0,
        opponent_score: 0,
        you_won: null,
        points_awarded: 0,
        result_code: null,
        player_total_points: 0,
        player_total_wins: 0,
        player_total_plays: 0,
    };
}

function hashText(value: string) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function positionForCoin(matchToken: string, coinIndex: number) {
    const first = hashText(`${matchToken}:${coinIndex}:x`);
    const second = hashText(`${matchToken}:${coinIndex}:y`);
    return {
        left: 8 + (first % 76),
        top: 8 + (second % 70),
    };
}

function GoldCoin({
    compact = false,
}: {
    compact?: boolean;
}) {
    return (
        <div
            className={`relative rounded-full p-[3px] shadow-[0_12px_30px_rgba(245,158,11,0.48)] ${
                compact ? "h-9 w-9" : "h-full w-full"
            }`}
            style={{
                background:
                    "repeating-conic-gradient(from 0deg, #fff3a8 0deg 6deg, #d78b09 6deg 12deg)",
            }}
        >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-amber-100/80 bg-gradient-to-br from-[#FFF6B5] via-[#F8C84E] to-[#C97A08]">
                <div className="absolute inset-[10%] rounded-full border-2 border-amber-700/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-5px_8px_rgba(120,65,0,0.28)]" />
                <div className="absolute -left-1/4 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/75 to-transparent blur-sm" />
                <div className="relative flex h-[58%] w-[58%] items-center justify-center rounded-full border border-amber-800/25 bg-amber-300/35 font-black text-amber-950 shadow-inner">
                    <span className={compact ? "text-sm" : "text-2xl sm:text-3xl"}>
                        $
                    </span>
                </div>
            </div>
        </div>
    );
}

function DecorativeCoin({
    left,
    top,
    delay,
    size,
}: {
    left: number;
    top: number;
    delay: number;
    size: number;
}) {
    return (
        <div
            className="pointer-events-none absolute opacity-20"
            style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                animation: `regigo-coin-float 3.2s ease-in-out ${delay}ms infinite`,
            }}
        >
            <GoldCoin />
        </div>
    );
}

export default function GrabCoinsGame({ eventId, eventName, slug, lobbyHref }: {
    eventId: string; eventName: string; slug: string; lobbyHref: string;
}) {
    const playerState = useVerifiedGlitterPlayer({ eventId, slug });
    const { player, setError, clearPlayer, updatePlayerTotals } = playerState;
    const [match, setMatch] = useState<GrabState | null>(null);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [collecting, setCollecting] = useState(false);
    const [coinPulseKey, setCoinPulseKey] = useState(0);

    const fetchState = useCallback(async (token: string, quiet = true) => {
        if (!player) return null;
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/grab-coins/match-state`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: token }), cache: "no-store",
            });
            const data = await readJson(response); const next = asObject<GrabState>(data.match);
            if (!response.ok || !next) {
                if (response.status === 401) clearPlayer();
                throw new Error(typeof data.error === "string" ? data.error : "Unable to refresh the challenge.");
            }
            setMatch(next); updatePlayerTotals(next); if (!quiet) setError(""); return next;
        } catch (caught) {
            if (!quiet) setError(caught instanceof Error ? caught.message : "Unable to refresh the challenge.");
            return null;
        }
    }, [clearPlayer, player, setError, slug, updatePlayerTotals]);

    useEffect(() => {
        if (!match || !["waiting", "countdown", "active"].includes(match.match_status)) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void fetchState(match.match_token, true);
        }, 800);
        return () => window.clearInterval(timer);
    }, [fetchState, match]);

    async function joinMatch() {
        if (!player || joining) return;
        setJoining(true); setError("");
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/join`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, gameKey: "grab_coins" }), cache: "no-store",
            });
            const data = await readJson(response); const basic = asObject<Record<string, unknown>>(data.match);
            if (!response.ok || !basic) throw new Error(typeof data.error === "string" ? data.error : "Unable to find an opponent.");
            const first = initialState(basic); setMatch(first); await fetchState(first.match_token, true);
        } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to find an opponent."); }
        finally { setJoining(false); }
    }

    async function leaveMatch() {
        if (!player || !match || leaving) return;
        setLeaving(true);
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/leave`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: match.match_token }), cache: "no-store",
            });
            const data = await readJson(response); if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to leave.");
            setMatch(null);
        } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to leave."); }
        finally { setLeaving(false); }
    }

    async function collectCoin() {
        if (!player || !match || match.match_status !== "active" || collecting) return;
        setCollecting(true); setError("");
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/grab-coins/collect`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: match.match_token, coinIndex: match.your_score }), cache: "no-store",
            });
            const data = await readJson(response); const result = asObject<CollectResult>(data.result);
            if (!response.ok || !result) throw new Error(typeof data.error === "string" ? data.error : "Unable to collect the coin.");
            setMatch((current) => current ? {
                ...current, your_score: result.verified_coins, opponent_score: result.opponent_coins,
                seconds_remaining: result.seconds_remaining, match_status: result.match_status,
            } : current);
            setCoinPulseKey((current) => current + 1);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to collect the coin.");
            if (match) void fetchState(match.match_token, true);
        } finally { setCollecting(false); }
    }

    function changePlayer() { clearPlayer(); setMatch(null); }
    const coinPosition = useMemo(() => match ? positionForCoin(match.match_token, match.your_score) : { left: 50, top: 50 }, [match]);

    return (
        <GameFrame title="Grab the Coins" subtitle="Collect more moving coins than your opponent."
            eventName={eventName} lobbyHref={lobbyHref} slug={slug}
            icon={<Coins size={25} />} error={playerState.error}>
            <style jsx global>{`
                @keyframes regigo-coin-arrive {
                    0% { transform: translate(-50%, -50%) scale(0.35) rotateY(-180deg); opacity: 0; }
                    65% { transform: translate(-50%, -50%) scale(1.18) rotateY(24deg); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1) rotateY(0deg); opacity: 1; }
                }

                @keyframes regigo-coin-float {
                    0%, 100% { transform: translateY(0) rotateY(0deg); }
                    50% { transform: translateY(-12px) rotateY(180deg); }
                }

                .regigo-coin-arrive {
                    animation: regigo-coin-arrive 420ms cubic-bezier(.2,.9,.25,1.25);
                }
            `}</style>
            <PlayerGate loading={playerState.loadingPlayer} player={player} lookup={playerState.lookup}
                setLookup={playerState.setLookup} saving={playerState.savingPlayer} onSubmit={playerState.verifyPlayer} />
            {player && <>
                <PlayerStats player={player} />
                {!match || match.match_status === "waiting" ?
                    <MatchmakingPanel playerName={player.display_name} status={match?.match_status} joining={joining} leaving={leaving}
                        onJoin={joinMatch} onLeave={leaveMatch} onChangePlayer={changePlayer} />
                : match.match_status === "countdown" ?
                    <CountdownCard seconds={match.seconds_until_start} opponentName={match.opponent_name} />
                : match.match_status === "completed" ?
                    <ResultPanel won={match.you_won} points={match.points_awarded} opponentName={match.opponent_name}
                        yourScore={match.your_score} opponentScore={match.opponent_score} joining={joining}
                        onPlayAgain={() => { setMatch(null); window.setTimeout(() => void joinMatch(), 0); }} slug={slug} />
                : <>
                    <DuelScoreboard playerName={player.display_name} opponentName={match.opponent_name}
                        yourScore={match.your_score} opponentScore={match.opponent_score} seconds={match.seconds_remaining} label="Coins" />
                    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl sm:p-6">
                        <p className="mb-4 text-center text-sm font-bold text-white/55">Tap each coin before it moves to its next position.</p>
                        <div className="relative mx-auto h-[360px] w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#17173A] via-slate-950 to-[#102D26] sm:h-[430px]">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.10),transparent_58%)]" />

                            <DecorativeCoin left={12} top={18} delay={0} size={34} />
                            <DecorativeCoin left={78} top={15} delay={420} size={28} />
                            <DecorativeCoin left={20} top={72} delay={760} size={24} />
                            <DecorativeCoin left={83} top={68} delay={1080} size={38} />
                            <DecorativeCoin left={50} top={84} delay={1320} size={22} />

                            <button
                                key={`${match.match_token}-${match.your_score}-${coinPulseKey}`}
                                type="button"
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    void collectCoin();
                                }}
                                disabled={collecting || match.match_status !== "active"}
                                style={{
                                    left: `${coinPosition.left}%`,
                                    top: `${coinPosition.top}%`,
                                }}
                                className="regigo-coin-arrive group absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 touch-manipulation select-none rounded-full outline-none transition hover:scale-110 focus-visible:ring-4 focus-visible:ring-amber-300/50 active:scale-90 disabled:opacity-70 sm:h-24 sm:w-24"
                                aria-label="Collect gold coin"
                            >
                                <span className="absolute inset-[-14px] rounded-full border border-amber-300/40 opacity-0 transition group-hover:opacity-100 group-hover:animate-ping" />
                                <span className="absolute inset-[-6px] rounded-full bg-amber-300/20 blur-md transition group-hover:bg-amber-300/40" />
                                <GoldCoin />
                                <Sparkles
                                    size={18}
                                    className="pointer-events-none absolute -right-2 -top-2 text-amber-100 opacity-0 transition group-hover:opacity-100"
                                />
                            </button>

                            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur">
                                Tap the gold coin
                            </div>
                        </div>
                    </section>
                </>}
            </>}
        </GameFrame>
    );
}

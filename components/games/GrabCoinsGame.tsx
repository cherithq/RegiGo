"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
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

export default function GrabCoinsGame({ eventId, eventName, slug, lobbyHref }: {
    eventId: string; eventName: string; slug: string; lobbyHref: string;
}) {
    const playerState = useVerifiedGlitterPlayer({ eventId, slug });
    const { player, setError, clearPlayer, updatePlayerTotals } = playerState;
    const [match, setMatch] = useState<GrabState | null>(null);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [collecting, setCollecting] = useState(false);

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
                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:rounded-[2rem]">
                        <p className="mb-4 text-center text-sm font-bold text-slate-500">Tap each coin before it moves to its next position.</p>
                        <div className="relative mx-auto h-[360px] w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#F7F5FF] sm:h-[430px]">
                            <button
                                type="button"
                                onPointerDown={(event) => { event.preventDefault(); void collectCoin(); }}
                                disabled={collecting || match.match_status !== "active"}
                                style={{ left: `${coinPosition.left}%`, top: `${coinPosition.top}%` }}
                                className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 touch-manipulation select-none items-center justify-center rounded-full border-4 border-amber-300 bg-amber-400 text-2xl shadow-xl transition active:scale-90 disabled:opacity-70 sm:h-20 sm:w-20 sm:text-3xl"
                                aria-label="Collect coin"
                            >
                                🪙
                            </button>
                        </div>
                    </section>
                </>}
            </>}
        </GameFrame>
    );
}

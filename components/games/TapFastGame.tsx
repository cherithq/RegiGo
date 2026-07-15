"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick, Zap } from "lucide-react";
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

type TapState = CommonDuelState;
type TapResult = {
    accepted_taps: number;
    verified_taps: number;
    opponent_taps: number;
    seconds_remaining: number;
    match_status: TapState["match_status"];
};

function initialState(raw: Record<string, unknown>): TapState {
    return {
        match_token: String(raw.match_token || ""),
        match_status: (raw.match_status || "waiting") as TapState["match_status"],
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

export default function TapFastGame({ eventId, eventName, slug, lobbyHref }: {
    eventId: string; eventName: string; slug: string; lobbyHref: string;
}) {
    const playerState = useVerifiedGlitterPlayer({ eventId, slug });
    const { player, setError, clearPlayer, updatePlayerTotals } = playerState;
    const [match, setMatch] = useState<TapState | null>(null);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [localTaps, setLocalTaps] = useState(0);
    const pendingRef = useRef(0);
    const flushingRef = useRef(false);

    const fetchState = useCallback(async (token: string, quiet = true) => {
        if (!player) return null;
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/tap-fast/match-state`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: token }), cache: "no-store",
            });
            const data = await readJson(response);
            const next = asObject<TapState>(data.match);
            if (!response.ok || !next) {
                if (response.status === 401) clearPlayer();
                throw new Error(typeof data.error === "string" ? data.error : "Unable to refresh the challenge.");
            }
            setMatch(next);
            updatePlayerTotals(next);
            setLocalTaps((current) => next.match_status === "completed" ? next.your_score : Math.max(current, next.your_score));
            if (!quiet) setError("");
            return next;
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

    const flushTaps = useCallback(async () => {
        if (!player || !match || match.match_status !== "active" || flushingRef.current || pendingRef.current <= 0) return;
        const batch = Math.min(10, pendingRef.current);
        pendingRef.current -= batch;
        flushingRef.current = true;
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/tap-fast/tap`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: match.match_token, taps: batch }), cache: "no-store",
            });
            const data = await readJson(response);
            const result = asObject<TapResult>(data.result);
            if (!response.ok || !result) {
                if (response.status !== 409) pendingRef.current += batch;
                return;
            }
            setMatch((current) => current ? {
                ...current,
                your_score: result.verified_taps,
                opponent_score: result.opponent_taps,
                seconds_remaining: result.seconds_remaining,
                match_status: result.match_status,
            } : current);
            setLocalTaps(Math.max(result.verified_taps + pendingRef.current, 0));
        } catch {
            pendingRef.current += batch;
        } finally {
            flushingRef.current = false;
        }
    }, [match, player, slug]);

    useEffect(() => {
        if (match?.match_status !== "active") return;
        const timer = window.setInterval(() => void flushTaps(), 100);
        return () => window.clearInterval(timer);
    }, [flushTaps, match?.match_status]);

    async function joinMatch() {
        if (!player || joining) return;
        setJoining(true); setError(""); setLocalTaps(0); pendingRef.current = 0;
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/join`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, gameKey: "tap_fast" }), cache: "no-store",
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
            setMatch(null); setLocalTaps(0); pendingRef.current = 0;
        } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to leave."); }
        finally { setLeaving(false); }
    }

    function tap() {
        if (match?.match_status !== "active") return;
        pendingRef.current += 1;
        setLocalTaps((value) => value + 1);
    }

    function changePlayer() { clearPlayer(); setMatch(null); setLocalTaps(0); pendingRef.current = 0; }

    return (
        <GameFrame title="Tap, Tap, Tap" subtitle="Tap faster than your opponent for 20 seconds."
            eventName={eventName} lobbyHref={lobbyHref} slug={slug}
            icon={<MousePointerClick size={25} />} error={playerState.error}>
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
                        onPlayAgain={() => { setMatch(null); setLocalTaps(0); window.setTimeout(() => void joinMatch(), 0); }} slug={slug} />
                : <>
                    <DuelScoreboard playerName={player.display_name} opponentName={match.opponent_name}
                        yourScore={localTaps} opponentScore={match.opponent_score} seconds={match.seconds_remaining} label="Taps" />
                    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-center text-white shadow-2xl sm:p-8">
                        <p className="text-sm font-bold text-white/55">Use one finger and tap as quickly as you can.</p>
                        <button type="button" onPointerDown={(event) => { event.preventDefault(); tap(); }}
                            className="group mx-auto mt-6 flex aspect-square w-full max-w-sm touch-manipulation select-none flex-col items-center justify-center rounded-full border-[10px] border-white/10 bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899] text-white shadow-[0_24px_80px_rgba(79,70,229,0.45)] transition active:scale-95">
                            <Zap size={58} className="transition group-active:scale-90" />
                            <span className="mt-3 text-3xl font-black uppercase tracking-[0.18em] sm:text-4xl">Tap</span>
                        </button>
                        <p className="mt-5 bg-gradient-to-r from-[#A5B4FC] to-[#F9A8D4] bg-clip-text text-6xl font-black text-transparent">{localTaps}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">Your live taps</p>
                    </section>
                </>}
            </>}
        </GameFrame>
    );
}

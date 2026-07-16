"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Gauge, MousePointerClick, Sparkles, Zap } from "lucide-react";
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
    const [tapPulseKey, setTapPulseKey] = useState(0);
    const [tapStreak, setTapStreak] = useState(0);
    const streakTimerRef = useRef<number | null>(null);
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

    useEffect(() => {
        return () => {
            if (streakTimerRef.current !== null) {
                window.clearTimeout(streakTimerRef.current);
            }
        };
    }, []);

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
        setTapPulseKey((value) => value + 1);
        setTapStreak((value) => value + 1);

        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(12);
        }

        if (streakTimerRef.current !== null) {
            window.clearTimeout(streakTimerRef.current);
        }

        streakTimerRef.current = window.setTimeout(() => {
            setTapStreak(0);
            streakTimerRef.current = null;
        }, 650);
    }

    function changePlayer() { clearPlayer(); setMatch(null); setLocalTaps(0); pendingRef.current = 0; }

    return (
        <GameFrame title="Tap, Tap, Tap" subtitle="The only active tournament game. Every match lasts exactly 20 seconds."
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
                        <style jsx global>{`
                            @keyframes regigo-tap-ring {
                                0% {
                                    transform: scale(0.65);
                                    opacity: 0.9;
                                }
                                100% {
                                    transform: scale(1.55);
                                    opacity: 0;
                                }
                            }

                            @keyframes regigo-tap-spark {
                                0% {
                                    transform: translateY(10px) scale(0.6);
                                    opacity: 0;
                                }
                                35% {
                                    opacity: 1;
                                }
                                100% {
                                    transform: translateY(-42px) scale(1.1);
                                    opacity: 0;
                                }
                            }

                            @keyframes regigo-tap-button-glow {
                                0%, 100% {
                                    box-shadow:
                                        0 24px 80px rgba(79, 70, 229, 0.45),
                                        inset 0 10px 22px rgba(255, 255, 255, 0.18),
                                        inset 0 -18px 30px rgba(30, 17, 95, 0.35);
                                }
                                50% {
                                    box-shadow:
                                        0 30px 95px rgba(236, 72, 153, 0.58),
                                        inset 0 14px 28px rgba(255, 255, 255, 0.24),
                                        inset 0 -18px 30px rgba(30, 17, 95, 0.35);
                                }
                            }

                            .regigo-tap-ring {
                                animation: regigo-tap-ring 460ms ease-out forwards;
                            }

                            .regigo-tap-spark {
                                animation: regigo-tap-spark 520ms ease-out forwards;
                            }

                            .regigo-tap-button {
                                animation: regigo-tap-button-glow 1.8s ease-in-out infinite;
                            }
                        `}</style>

                        <div className="pointer-events-none absolute left-[-20%] top-[-30%] h-[420px] w-[420px] rounded-full bg-[#4F46E5]/25 blur-3xl" />
                        <div className="pointer-events-none absolute bottom-[-45%] right-[-20%] h-[460px] w-[460px] rounded-full bg-[#EC4899]/25 blur-3xl" />

                        <div className="relative z-10">
                            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
                                        <Gauge size={21} />
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                                            Live speed
                                        </p>
                                        <p className="mt-1 text-sm font-black text-white">
                                            Keep tapping without stopping
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                                        Streak
                                    </p>
                                    <p className="mt-1 text-lg font-black text-amber-300">
                                        {tapStreak}
                                    </p>
                                </div>
                            </div>

                            <div className="relative mx-auto mt-7 flex aspect-square w-full max-w-[430px] items-center justify-center">
                                <div className="absolute inset-[2%] rounded-full border border-white/10 bg-white/[0.03] shadow-inner" />
                                <div className="absolute inset-[8%] rounded-full border-[10px] border-slate-800 bg-gradient-to-b from-slate-600 to-slate-950 shadow-[0_20px_45px_rgba(0,0,0,0.55),inset_0_6px_10px_rgba(255,255,255,0.15)]" />
                                <div className="absolute inset-[14%] rounded-full border-[6px] border-indigo-300/25 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#701A75] shadow-[inset_0_14px_24px_rgba(255,255,255,0.08),inset_0_-18px_30px_rgba(0,0,0,0.32)]" />

                                {tapPulseKey > 0 && (
                                    <span
                                        key={`ring-${tapPulseKey}`}
                                        className="regigo-tap-ring pointer-events-none absolute inset-[20%] rounded-full border-4 border-pink-300/70"
                                    />
                                )}

                                {tapPulseKey > 0 && (
                                    <span
                                        key={`spark-${tapPulseKey}`}
                                        className="regigo-tap-spark pointer-events-none absolute left-1/2 top-[19%] -translate-x-1/2 text-amber-200"
                                    >
                                        <Sparkles size={28} />
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onPointerDown={(event) => {
                                        event.preventDefault();
                                        tap();
                                    }}
                                    className="regigo-tap-button group relative z-10 flex aspect-square w-[58%] touch-manipulation select-none flex-col items-center justify-center rounded-full border-[8px] border-white/15 bg-gradient-to-br from-[#6366F1] via-[#7C3AED] to-[#EC4899] text-white outline-none transition hover:scale-[1.025] focus-visible:ring-4 focus-visible:ring-pink-300/50 active:translate-y-2 active:scale-[0.96] active:shadow-[0_10px_25px_rgba(79,70,229,0.3)]"
                                >
                                    <span className="absolute inset-[7%] rounded-full border border-white/20 bg-white/[0.04]" />
                                    <span className="absolute left-[18%] top-[12%] h-[18%] w-[38%] -rotate-12 rounded-full bg-white/25 blur-md" />

                                    <Zap
                                        size={62}
                                        className="relative transition group-active:scale-90"
                                    />
                                    <span className="relative mt-3 text-3xl font-black uppercase tracking-[0.18em] sm:text-4xl">
                                        Tap
                                    </span>
                                </button>
                            </div>

                            <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <Activity
                                        size={19}
                                        className="mx-auto text-indigo-300"
                                    />
                                    <p className="mt-2 bg-gradient-to-r from-[#A5B4FC] to-[#F9A8D4] bg-clip-text text-5xl font-black text-transparent">
                                        {localTaps}
                                    </p>
                                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                        Your live taps
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <MousePointerClick
                                        size={19}
                                        className="mx-auto text-pink-300"
                                    />
                                    <p className="mt-2 text-5xl font-black text-white">
                                        {Math.max(
                                            0,
                                            Number(match.seconds_remaining || 0)
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                        Seconds left
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </>}
            </>}
        </GameFrame>
    );
}

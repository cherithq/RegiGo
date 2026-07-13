"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
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

type Mark = "X" | "O";
type TttState = CommonDuelState & {
    board_value: string;
    turn_mark: Mark | null;
    your_mark: Mark;
    winning_mark: Mark | null;
};

function initialState(raw: Record<string, unknown>): TttState {
    return {
        match_token: String(raw.match_token || ""),
        match_status: (raw.match_status || "waiting") as TttState["match_status"],
        opponent_name: typeof raw.opponent_name === "string" ? raw.opponent_name : null,
        starts_at: typeof raw.starts_at === "string" ? raw.starts_at : null,
        ends_at: typeof raw.ends_at === "string" ? raw.ends_at : null,
        seconds_until_start: Number(raw.seconds_until_start || 0),
        seconds_remaining: Number(raw.seconds_remaining ?? 20),
        board_value: ".........",
        turn_mark: null,
        your_mark: "X",
        winning_mark: null,
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

export default function TicTacToeGame({ eventId, eventName, slug, lobbyHref }: {
    eventId: string; eventName: string; slug: string; lobbyHref: string;
}) {
    const playerState = useVerifiedGlitterPlayer({ eventId, slug });
    const { player, setError, clearPlayer, updatePlayerTotals } = playerState;
    const [match, setMatch] = useState<TttState | null>(null);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [movingCell, setMovingCell] = useState<number | null>(null);

    const fetchState = useCallback(async (token: string, quiet = true) => {
        if (!player) return null;
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/tic-tac-toe/state`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: token }), cache: "no-store",
            });
            const data = await readJson(response); const next = asObject<TttState>(data.match);
            if (!response.ok || !next) {
                if (response.status === 401) clearPlayer();
                throw new Error(typeof data.error === "string" ? data.error : "Unable to refresh the match.");
            }
            setMatch(next); updatePlayerTotals(next); if (!quiet) setError(""); return next;
        } catch (caught) {
            if (!quiet) setError(caught instanceof Error ? caught.message : "Unable to refresh the match.");
            return null;
        }
    }, [clearPlayer, player, setError, slug, updatePlayerTotals]);

    useEffect(() => {
        if (!match || !["waiting", "countdown", "active"].includes(match.match_status)) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void fetchState(match.match_token, true);
        }, 650);
        return () => window.clearInterval(timer);
    }, [fetchState, match]);

    async function joinMatch() {
        if (!player || joining) return;
        setJoining(true); setError("");
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/matchmaking/join`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, gameKey: "tic_tac_toe" }), cache: "no-store",
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

    async function placeMark(cellIndex: number) {
        if (!player || !match || match.match_status !== "active" || movingCell !== null) return;
        const mark = match.board_value[cellIndex];
        if (mark !== "." || match.turn_mark !== match.your_mark) return;
        setMovingCell(cellIndex); setError("");
        try {
            const response = await fetch(`/api/public/events/${encodeURIComponent(slug)}/games/tic-tac-toe/move`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerToken: player.player_token, matchToken: match.match_token, cellIndex }), cache: "no-store",
            });
            const data = await readJson(response); const next = asObject<TttState>(data.match);
            if (!response.ok || !next) throw new Error(typeof data.error === "string" ? data.error : "Unable to place your mark.");
            setMatch(next); updatePlayerTotals(next);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to place your mark.");
            void fetchState(match.match_token, true);
        } finally { setMovingCell(null); }
    }

    function changePlayer() { clearPlayer(); setMatch(null); }
    const board = useMemo(() => Array.from({ length: 9 }, (_, index) => {
        const value = match?.board_value[index]; return value === "X" || value === "O" ? value : null;
    }), [match]);
    const yourTurn = match?.match_status === "active" && match.turn_mark === match.your_mark;

    return (
        <GameFrame title="Tic-Tac-Toe" subtitle="Build three in a row before your opponent within the speed timer."
            eventName={eventName} lobbyHref={lobbyHref} slug={slug}
            icon={<Users size={25} />} error={playerState.error}>
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
                    <DuelScoreboard playerName={`${player.display_name} (${match.your_mark})`} opponentName={`${match.opponent_name || "Opponent"} (${match.your_mark === "X" ? "O" : "X"})`}
                        yourScore={match.your_score} opponentScore={match.opponent_score} seconds={match.seconds_remaining} label="Position" />
                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:rounded-[2rem]">
                        <div className="mb-5 text-center">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">{yourTurn ? "Your turn" : "Opponent's turn"}</p>
                            <h2 className="mt-2 text-xl font-black">{yourTurn ? `Place your ${match.your_mark}` : `Waiting for ${match.opponent_name || "opponent"}`}</h2>
                        </div>
                        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
                            {board.map((mark, index) => (
                                <button key={index} type="button" onClick={() => void placeMark(index)}
                                    disabled={!yourTurn || mark !== null || movingCell !== null}
                                    className={`aspect-square rounded-2xl border bg-white text-5xl font-black shadow-sm transition sm:text-6xl ${
                                        mark === "X" ? "border-[#4F46E5]/30 text-[#4F46E5]" : mark === "O" ? "border-[#EC4899]/30 text-[#EC4899]" : yourTurn ? "border-slate-200 hover:border-[#4F46E5]/40 hover:bg-[#FAFAFF]" : "border-slate-200"
                                    } disabled:cursor-default`}>
                                    {movingCell === index ? <Loader2 size={28} className="mx-auto animate-spin text-[#4F46E5]" /> : mark || ""}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={leaveMatch} disabled={leaving}
                            className="mx-auto mt-6 flex min-h-11 items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60">
                            {leaving ? "Leaving…" : "Leave match (forfeit)"}
                        </button>
                    </section>
                </>}
            </>}
        </GameFrame>
    );
}

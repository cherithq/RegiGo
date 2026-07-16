"use client";

import {
    AlertTriangle,
    History,
    Loader2,
    Pause,
    Play,
    RotateCcw,
    ShieldAlert,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type SafetyHistory = {
    id: string;
    action: "pause" | "resume" | "restart";
    roundNumber?: number | null;
    reason?: string | null;
    createdAt?: string | null;
};

type SafetyState = {
    tournamentStatus?: string;
    roundStatus?: string | null;
    roundNumber?: number | null;
    gameTitle?: string | null;
    paused?: boolean;
    pauseReason?: string | null;
    pausedAt?: string | null;
    pausedFromStatus?: string | null;
    pauseElapsedSeconds?: number;
    totalPausedSeconds?: number;
    canPause?: boolean;
    canResume?: boolean;
    canRestart?: boolean;
    history?: SafetyHistory[];
};

async function readPayload(
    response: Response
): Promise<Record<string, any>> {
    const text = await response.text();

    if (!text.trim()) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            "Safety-control API returned an invalid response."
        );
    }
}

export default function TournamentSafetyPanel({
    eventId,
}: {
    eventId: string;
}) {
    const [state, setState] =
        useState<SafetyState>({});
    const [reason, setReason] =
        useState("");
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");

    const reload = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/safety`,
                {
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to load safety controls."
                );
            }

            setState(data.safety || {});
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load safety controls."
            );
        }
    }, [eventId]);

    useEffect(() => {
        void reload();

        const timer = window.setInterval(
            () => void reload(),
            800
        );

        return () =>
            window.clearInterval(timer);
    }, [reload]);

    async function perform(
        action: "pause" | "resume" | "restart"
    ) {
        if (
            action === "restart" &&
            !window.confirm(
                "Restart the current round? Current-round scores and game progress will be deleted, and all participants from this round will be restored."
            )
        ) {
            return;
        }

        setWorking(action);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/safety`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        action,
                        reason,
                    }),
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to update safety state."
                );
            }

            setState(data.safety || {});
            setReason("");
            setMessage(
                action === "pause"
                    ? "The round is paused on every screen."
                    : action === "resume"
                      ? "The round resumed with its remaining time preserved."
                      : "The current round was removed and is ready to be started again."
            );

            window.setTimeout(
                () => window.location.reload(),
                action === "restart" ? 700 : 150
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update safety state."
            );
        } finally {
            setWorking("");
        }
    }

    const history = state.history || [];

    return (
        <section
            className={`rounded-[2rem] border p-6 shadow-sm ${
                state.paused
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-white"
            }`}
        >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                                state.paused
                                    ? "bg-amber-200 text-amber-900"
                                    : "bg-red-50 text-red-700"
                            }`}
                        >
                            <ShieldAlert size={21} />
                        </span>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
                                Live Safety Controls
                            </p>
                            <h2 className="mt-1 text-2xl font-black">
                                {state.paused
                                    ? "Round Paused"
                                    : "Pause or restart safely"}
                            </h2>
                        </div>
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-500">
                        {state.roundNumber
                            ? `Round ${state.roundNumber} · ${state.gameTitle || "Tournament Game"}`
                            : "No tournament round is currently available."}
                    </p>

                    {state.paused && (
                        <p className="mt-2 text-sm font-black text-amber-800">
                            Paused for{" "}
                            {state.pauseElapsedSeconds || 0} seconds
                            {state.pauseReason
                                ? ` · ${state.pauseReason}`
                                : ""}
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Current State
                    </p>
                    <p className="mt-2 text-xl font-black capitalize text-slate-900">
                        {state.tournamentStatus ||
                            "Not created"}
                    </p>
                </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                    value={reason}
                    onChange={(event) =>
                        setReason(
                            event.target.value
                        )
                    }
                    placeholder="Optional reason, e.g. microphone announcement or guest connection issue"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-red-300"
                />

                <div className="flex flex-wrap gap-2">
                    {state.canPause && (
                        <button
                            type="button"
                            onClick={() =>
                                void perform("pause")
                            }
                            disabled={Boolean(working)}
                            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                        >
                            {working === "pause" ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Pause size={18} />
                            )}
                            Pause Round
                        </button>
                    )}

                    {state.canResume && (
                        <button
                            type="button"
                            onClick={() =>
                                void perform("resume")
                            }
                            disabled={Boolean(working)}
                            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                        >
                            {working === "resume" ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Play size={18} />
                            )}
                            Resume Round
                        </button>
                    )}

                    {state.canRestart && (
                        <button
                            type="button"
                            onClick={() =>
                                void perform("restart")
                            }
                            disabled={Boolean(working)}
                            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 disabled:opacity-50"
                        >
                            {working === "restart" ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <RotateCcw size={18} />
                            )}
                            Restart Current Round
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-red-800">
                    <AlertTriangle size={17} />
                    Restart protection
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-red-700/80">
                    Restart is unavailable after results have been revealed.
                    It deletes only the current round and restores its participants.
                </p>
            </div>

            {history.length > 0 && (
                <div className="mt-5">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-700">
                        <History size={17} />
                        Recent Safety Actions
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {history
                            .slice(0, 6)
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                    <p className="text-sm font-black capitalize">
                                        {item.action} · Round{" "}
                                        {item.roundNumber ||
                                            "—"}
                                    </p>
                                    <p className="mt-1 text-xs font-bold text-slate-400">
                                        {item.createdAt
                                            ? new Date(
                                                  item.createdAt
                                              ).toLocaleString(
                                                  "en-SG"
                                              )
                                            : ""}
                                    </p>
                                    {item.reason && (
                                        <p className="mt-2 text-xs font-bold text-slate-500">
                                            {item.reason}
                                        </p>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {message && (
                <p className="mt-5 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-[#4F46E5]">
                    {message}
                </p>
            )}
        </section>
    );
}

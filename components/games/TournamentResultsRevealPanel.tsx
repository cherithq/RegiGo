"use client";

import {
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    PartyPopper,
    Play,
    Trophy,
    UserRoundCheck,
    UserRoundX,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type RevealState = {
    resultAvailable?: boolean;
    tournamentStatus?: string;
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
    canReveal?: boolean;
    canOpenReady?: boolean;
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
            "Result-control API returned an invalid response."
        );
    }
}

export default function TournamentResultsRevealPanel({
    eventId,
}: {
    eventId: string;
}) {
    const [state, setState] =
        useState<RevealState>({});
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");

    const reload = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/reveal`,
                {
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to load result controls."
                );
            }

            setState(data.reveal || {});
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load result controls."
            );
        } finally {
            setLoading(false);
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
        action: "reveal" | "ready"
    ) {
        setWorking(action);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/reveal`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        action,
                    }),
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to update result presentation."
                );
            }

            setState(data.reveal || {});
            setMessage(
                action === "reveal"
                    ? "Results are now visible on the audience and player screens."
                    : "The ready check is now open for advancing players."
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update result presentation."
            );
        } finally {
            setWorking("");
        }
    }

    const advancingNames =
        state.advancingNames || [];
    const eliminatedNames =
        state.eliminatedNames || [];

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                            <PartyPopper size={21} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                                Results Presentation
                            </p>
                            <h2 className="mt-1 text-2xl font-black">
                                {state.resultRoundNumber
                                    ? state.resultIsFinal
                                        ? "Final Result"
                                        : `Round ${state.resultRoundNumber} Result`
                                    : "Waiting for a completed round"}
                            </h2>
                        </div>
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-500">
                        {state.resultGameTitle
                            ? `${state.resultGameTitle} · `
                            : ""}
                        Results remain hidden until the organiser reveals them.
                    </p>
                </div>

                <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                        state.presentationState === "hidden"
                            ? "bg-slate-100 text-slate-600"
                            : state.presentationState === "revealed"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-emerald-100 text-emerald-700"
                    }`}
                >
                    {state.presentationState === "hidden" ? (
                        <EyeOff size={15} />
                    ) : state.presentationState === "revealed" ? (
                        <Eye size={15} />
                    ) : (
                        <CheckCircle2 size={15} />
                    )}
                    {state.presentationState === "hidden"
                        ? "Hidden"
                        : state.presentationState === "revealed"
                          ? "Results Visible"
                          : "Ready Check Open"}
                </div>
            </div>

            {loading ? (
                <div className="mt-6 flex items-center justify-center rounded-2xl bg-slate-50 p-7 text-slate-400">
                    <Loader2
                        size={24}
                        className="animate-spin"
                    />
                </div>
            ) : !state.resultAvailable ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
                    <Trophy
                        size={34}
                        className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-black text-slate-500">
                        The reveal controls activate when the current round finishes.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        <ResultGroup
                            title={
                                state.resultIsFinal
                                    ? "Champion"
                                    : "Advancing"
                            }
                            count={
                                state.advancingCount || 0
                            }
                            names={advancingNames}
                            positive
                        />

                        {!state.resultIsFinal && (
                            <ResultGroup
                                title="Eliminated"
                                count={
                                    state.eliminatedCount || 0
                                }
                                names={eliminatedNames}
                            />
                        )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        {state.canReveal && (
                            <button
                                type="button"
                                onClick={() =>
                                    void perform("reveal")
                                }
                                disabled={Boolean(working)}
                                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                            >
                                {working === "reveal" ? (
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Eye size={18} />
                                )}
                                {state.resultIsFinal
                                    ? "Reveal Champion"
                                    : "Reveal Round Results"}
                            </button>
                        )}

                        {state.canOpenReady && (
                            <button
                                type="button"
                                onClick={() =>
                                    void perform("ready")
                                }
                                disabled={Boolean(working)}
                                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                            >
                                {working === "ready" ? (
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Play size={18} />
                                )}
                                Open Next Ready Check
                            </button>
                        )}
                    </div>
                </>
            )}

            {message && (
                <p className="mt-5 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-[#4F46E5]">
                    {message}
                </p>
            )}
        </section>
    );
}

function ResultGroup({
    title,
    count,
    names,
    positive = false,
}: {
    title: string;
    count: number;
    names: string[];
    positive?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border p-5 ${
                positive
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
            }`}
        >
            <p
                className={`flex items-center gap-2 text-sm font-black ${
                    positive
                        ? "text-emerald-800"
                        : "text-rose-800"
                }`}
            >
                {positive ? (
                    <UserRoundCheck size={17} />
                ) : (
                    <UserRoundX size={17} />
                )}
                {title} · {count}
            </p>

            <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                {names.length === 0 ? (
                    <span className="text-sm font-bold text-slate-400">
                        Results are being calculated.
                    </span>
                ) : (
                    names.map((name) => (
                        <span
                            key={name}
                            className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm"
                        >
                            {name}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}

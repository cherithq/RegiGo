"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Gift,
    Play,
    RefreshCw,
    Sparkles,
    Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CheckedInGuest = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    checked_in_at: string | null;
};

type Winner = {
    id: string;
    event_id: string;
    registration_id: string;
    prize_id?: string | null;
    winner_name: string | null;
    winner_email: string | null;
    prize_name: string | null;
    draw_round: number | null;
    is_excluded?: boolean | null;
    created_at: string | null;
};

type Prize = {
    id: string;
    event_id: string;
    prize_name: string;
    prize_order: number;
    winner_count?: number | null;
    eligible_registration_ids?: string[] | null;
};

type LiveDrawPayload = {
    prizeId: string;
    prizeName: string;
    winnerCount: number;
    drawRound: number;
    durationMs: number;
    guestNames: string[];
    winnerNames: string[];
};

function cleanPrizeName(prizeName?: string | null) {
    const cleaned = String(prizeName || "")
        .trim()
        .replace(/^\d+\s*[.):-]\s*/, "")
        .trim();

    return cleaned || "Prize";
}

function pickRandomGuests(
    guests: CheckedInGuest[],
    count: number
): CheckedInGuest[] {
    const shuffled = [...guests];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[index],
        ];
    }

    return shuffled.slice(0, count);
}

function randomNames(names: string[], count: number) {
    if (names.length === 0) {
        return Array.from({ length: count }, () => "Selecting...");
    }

    const shuffled = [...names];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[index],
        ];
    }

    return Array.from({ length: count }, (_, index) => {
        return shuffled[index % shuffled.length] || "Selecting...";
    });
}

export default function LuckyDrawAudienceDisplay({
    eventId,
    eventName,
    guests = [],
    initialWinners = [],
    initialPrizes = [],
}: {
    eventId: string;
    eventName: string;
    guests?: CheckedInGuest[];
    initialWinners?: Winner[];
    initialPrizes?: Prize[];
}) {
    const [winners, setWinners] = useState<Winner[]>(initialWinners);
    const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());
    const [liveDraw, setLiveDraw] = useState<LiveDrawPayload | null>(null);
    const [shuffleNames, setShuffleNames] = useState<string[]>([]);
    const [drawing, setDrawing] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
    const [selectedPrizeId, setSelectedPrizeId] = useState(
        initialPrizes[0]?.id || ""
    );
    const [controlMessage, setControlMessage] = useState("");

    const liveDrawRef = useRef<LiveDrawPayload | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const shuffleTimerRef = useRef<number | null>(null);
    const finishTimerRef = useRef<number | null>(null);
    const revealTimerRef = useRef<number | null>(null);
    const saveWinnersTimerRef = useRef<number | null>(null);
    const reloadDebounceRef = useRef<number | null>(null);

    const selectedPrize = useMemo(() => {
        return prizes.find((prize) => prize.id === selectedPrizeId) || null;
    }, [prizes, selectedPrizeId]);

    const excludedRegistrationIds = useMemo(() => {
        return new Set(
            winners
                .filter((winner) => winner.is_excluded !== false)
                .map((winner) => winner.registration_id)
        );
    }, [winners]);

    const eligibleGuests = useMemo(() => {
        if (!selectedPrize) return [];

        const restrictedIds = Array.isArray(
            selectedPrize.eligible_registration_ids
        )
            ? selectedPrize.eligible_registration_ids
            : [];

        const prizePool =
            restrictedIds.length > 0
                ? guests.filter((guest) => restrictedIds.includes(guest.id))
                : guests;

        return prizePool.filter(
            (guest) => !excludedRegistrationIds.has(guest.id)
        );
    }, [excludedRegistrationIds, guests, selectedPrize]);

    const reloadDrawData = useCallback(
        async (showSpinner = false) => {
            if (showSpinner) {
                setRefreshing(true);
            }

            const [winnersResult, prizesResult] = await Promise.all([
                supabase
                    .from("lucky_draw_winners")
                    .select("*")
                    .eq("event_id", eventId)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("lucky_draw_prizes")
                    .select("*")
                    .eq("event_id", eventId)
                    .order("prize_order", { ascending: true }),
            ]);

            if (!winnersResult.error) {
                setWinners((winnersResult.data || []) as Winner[]);
            }

            if (!prizesResult.error) {
                setPrizes((prizesResult.data || []) as Prize[]);
            }

            setLastUpdatedAt(new Date());

            if (showSpinner) {
                setRefreshing(false);
            }
        },
        [eventId]
    );

    const beginLiveDraw = useCallback(
        (payload: LiveDrawPayload) => {
            if (
                !payload ||
                !Array.isArray(payload.guestNames) ||
                payload.guestNames.length === 0
            ) {
                return;
            }

            if (shuffleTimerRef.current !== null) {
                window.clearInterval(shuffleTimerRef.current);
            }

            if (finishTimerRef.current !== null) {
                window.clearTimeout(finishTimerRef.current);
            }

            if (revealTimerRef.current !== null) {
                window.clearTimeout(revealTimerRef.current);
            }

            const winnerCount = Math.max(
                1,
                Math.min(50, Number(payload.winnerCount || 1))
            );

            const safePayload: LiveDrawPayload = {
                ...payload,
                winnerCount,
                winnerNames: Array.isArray(payload.winnerNames)
                    ? payload.winnerNames.slice(0, winnerCount)
                    : [],
            };

            liveDrawRef.current = safePayload;
            setLiveDraw(safePayload);
            setDrawing(true);
            setShuffleNames(
                randomNames(safePayload.guestNames, winnerCount)
            );

            shuffleTimerRef.current = window.setInterval(() => {
                setShuffleNames(
                    randomNames(safePayload.guestNames, winnerCount)
                );
            }, 90);

            finishTimerRef.current = window.setTimeout(() => {
                if (shuffleTimerRef.current !== null) {
                    window.clearInterval(shuffleTimerRef.current);
                    shuffleTimerRef.current = null;
                }

                setShuffleNames(
                    safePayload.winnerNames.length > 0
                        ? safePayload.winnerNames
                        : Array.from(
                              { length: winnerCount },
                              () => "Winner selected"
                          )
                );
                setDrawing(false);

                // Keep the winning names on screen briefly, then switch to
                // the saved result cards from the database.
                revealTimerRef.current = window.setTimeout(async () => {
                    await reloadDrawData();
                    liveDrawRef.current = null;
                    setLiveDraw(null);
                    revealTimerRef.current = null;
                }, 2800);
            }, Math.max(1000, Number(safePayload.durationMs || 5200)));
        },
        [reloadDrawData]
    );

    useEffect(() => {
        const channel = supabase
            .channel(`lucky-draw-live-${eventId}`, {
                config: {
                    broadcast: {
                        self: false,
                    },
                },
            })
            .on(
                "broadcast",
                { event: "draw-start" },
                ({ payload }) => {
                    beginLiveDraw(payload as LiveDrawPayload);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "lucky_draw_winners",
                    filter: `event_id=eq.${eventId}`,
                },
                () => {
                    // Do not interrupt the live animation while a draw is
                    // running. The reveal timer reloads the saved winners.
                    if (liveDrawRef.current) return;

                    if (reloadDebounceRef.current !== null) {
                        window.clearTimeout(reloadDebounceRef.current);
                    }

                    reloadDebounceRef.current = window.setTimeout(() => {
                        void reloadDrawData();
                    }, 350);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "lucky_draw_prizes",
                    filter: `event_id=eq.${eventId}`,
                },
                () => {
                    if (!liveDrawRef.current) {
                        void reloadDrawData();
                    }
                }
            )
            .subscribe((status) => {
                setConnectionStatus(status);
            });

        channelRef.current = channel;

        const pollTimer = window.setInterval(() => {
            if (
                document.visibilityState === "visible" &&
                !liveDrawRef.current
            ) {
                void reloadDrawData();
            }
        }, 2500);

        return () => {
            window.clearInterval(pollTimer);

            if (shuffleTimerRef.current !== null) {
                window.clearInterval(shuffleTimerRef.current);
            }

            if (finishTimerRef.current !== null) {
                window.clearTimeout(finishTimerRef.current);
            }

            if (revealTimerRef.current !== null) {
                window.clearTimeout(revealTimerRef.current);
            }

            if (saveWinnersTimerRef.current !== null) {
                window.clearTimeout(saveWinnersTimerRef.current);
            }

            if (reloadDebounceRef.current !== null) {
                window.clearTimeout(reloadDebounceRef.current);
            }

            liveDrawRef.current = null;
            channelRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [beginLiveDraw, eventId, reloadDrawData]);

    async function startDrawFromAudience() {
        if (drawing || liveDrawRef.current) return;

        setControlMessage("");

        if (!selectedPrize) {
            setControlMessage("Select a prize first.");
            return;
        }

        const winnerCount = Math.max(
            1,
            Math.min(50, Number(selectedPrize.winner_count || 1))
        );

        if (eligibleGuests.length < winnerCount) {
            setControlMessage(
                `This prize needs ${winnerCount} winner${
                    winnerCount === 1 ? "" : "s"
                }, but only ${eligibleGuests.length} eligible guest${
                    eligibleGuests.length === 1 ? " is" : "s are"
                } available.`
            );
            return;
        }

        const winningGuests = pickRandomGuests(
            eligibleGuests,
            winnerCount
        );

        const drawRound =
            winners.reduce(
                (highest, winner) =>
                    Math.max(highest, Number(winner.draw_round || 0)),
                0
            ) + 1;

        const durationMs = 5200;

        const payload: LiveDrawPayload = {
            prizeId: selectedPrize.id,
            prizeName: cleanPrizeName(selectedPrize.prize_name),
            winnerCount,
            drawRound,
            durationMs,
            guestNames: eligibleGuests.map(
                (guest) => guest.full_name || "Unnamed Guest"
            ),
            winnerNames: winningGuests.map(
                (guest) => guest.full_name || "Unnamed Guest"
            ),
        };

        beginLiveDraw(payload);

        const broadcastResult = await channelRef.current?.send({
            type: "broadcast",
            event: "draw-start",
            payload,
        });

        if (
            broadcastResult &&
            broadcastResult !== "ok"
        ) {
            setControlMessage(
                "The draw started on this screen, but another audience screen may not be connected."
            );
        }

        if (saveWinnersTimerRef.current !== null) {
            window.clearTimeout(saveWinnersTimerRef.current);
        }

        saveWinnersTimerRef.current = window.setTimeout(async () => {
            const rows = winningGuests.map((winner) => ({
                event_id: eventId,
                registration_id: winner.id,
                prize_id: selectedPrize.id,
                winner_name: winner.full_name || "Unnamed Guest",
                winner_email: winner.email || "",
                prize_name: selectedPrize.prize_name,
                draw_round: drawRound,
                is_excluded: true,
            }));

            const { data, error } = await supabase
                .from("lucky_draw_winners")
                .insert(rows)
                .select("*");

            if (error) {
                setControlMessage(
                    `The animation completed, but the winners could not be saved: ${error.message}`
                );
                return;
            }

            setWinners((current) => [
                ...((data || []) as Winner[]),
                ...current,
            ]);
            setControlMessage(
                `${winnerCount} winner${
                    winnerCount === 1 ? "" : "s"
                } saved for ${selectedPrize.prize_name}.`
            );
            saveWinnersTimerRef.current = null;
        }, durationMs);
    }

    const latestDraw = useMemo(() => {
        const sorted = [...winners].sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return bTime - aTime;
        });

        const newestWinner = sorted[0];

        if (!newestWinner) {
            return {
                round: null as number | null,
                winners: [] as Winner[],
                prizeName: "",
            };
        }

        const round =
            newestWinner.draw_round === null
                ? null
                : Number(newestWinner.draw_round);

        const drawWinners =
            round === null
                ? [newestWinner]
                : sorted.filter(
                      (winner) => Number(winner.draw_round) === round
                  );

        const prize =
            prizes.find((item) => item.id === newestWinner.prize_id) || null;

        return {
            round,
            winners: drawWinners,
            prizeName:
                cleanPrizeName(
                    prize?.prize_name ||
                        newestWinner.prize_name ||
                        "Lucky Draw Prize"
                ),
        };
    }, [prizes, winners]);

    const configuredWinnerCount = Math.max(
        1,
        Number(selectedPrize?.winner_count || 1)
    );

    const drawControls = (
        <div
            className="mx-auto mb-6 w-full max-w-3xl"
            aria-label={`Lucky draw controls for ${eventName}`}
        >
            <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/15 bg-slate-950/90 p-3 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center">
                <select
                    value={selectedPrizeId}
                    onChange={(event) => {
                        setSelectedPrizeId(event.target.value);
                        setControlMessage("");
                    }}
                    disabled={drawing || Boolean(liveDraw)}
                    aria-label="Select lucky draw prize"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none disabled:opacity-50"
                >
                    <option value="" className="text-slate-950">
                        Select prize
                    </option>

                    {prizes.map((prize) => (
                        <option
                            key={prize.id}
                            value={prize.id}
                            className="text-slate-950"
                        >
                            {prize.prize_order}.{" "}
                            {cleanPrizeName(prize.prize_name)} —{" "}
                            {Math.max(
                                1,
                                Number(prize.winner_count || 1)
                            )} winner
                            {Math.max(
                                1,
                                Number(prize.winner_count || 1)
                            ) === 1
                                ? ""
                                : "s"}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={() => void startDrawFromAudience()}
                    disabled={
                        drawing ||
                        Boolean(liveDraw) ||
                        !selectedPrize ||
                        eligibleGuests.length < configuredWinnerCount
                    }
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-7 text-sm font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Play size={17} fill="currentColor" />
                    {drawing || liveDraw ? "Drawing..." : "Spin Live"}
                </button>
            </div>

            {controlMessage && (
                <p className="mt-2 rounded-xl border border-white/10 bg-slate-950/85 px-4 py-3 text-center text-xs font-bold text-white/75 backdrop-blur">
                    {controlMessage}
                </p>
            )}
        </div>
    );

    if (liveDraw) {
        return (
            <>
                {drawControls}
                <section className="w-full">
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-white backdrop-blur">
                        <Sparkles
                            size={15}
                            className={drawing ? "animate-pulse" : ""}
                        />
                        {drawing ? "Live Name Shuffle" : "Winners Revealed"}
                    </div>

                    <p className="mt-5 text-sm font-black uppercase tracking-[0.28em] text-[#F9A8D4]">
                        Draw Round {liveDraw.drawRound}
                    </p>

                    <h2 className="mx-auto mt-3 max-w-5xl text-3xl font-black tracking-tight sm:text-5xl md:text-7xl">
                        {liveDraw.prizeName}
                    </h2>

                    <p className="mt-3 text-sm font-semibold text-white/60 sm:text-base">
                        {drawing
                            ? `Selecting ${liveDraw.winnerCount} winner${
                                  liveDraw.winnerCount === 1 ? "" : "s"
                              } live`
                            : `All ${liveDraw.winnerCount} winner${
                                  liveDraw.winnerCount === 1 ? "" : "s"
                              } selected`}
                    </p>
                </div>

                <div
                    className={`mx-auto mt-8 grid w-full max-w-7xl gap-4 sm:gap-5 ${
                        liveDraw.winnerCount === 1
                            ? "grid-cols-1 max-w-3xl"
                            : liveDraw.winnerCount === 2
                              ? "grid-cols-1 sm:grid-cols-2"
                              : liveDraw.winnerCount <= 4
                                ? "grid-cols-2 lg:grid-cols-4"
                                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
                    }`}
                >
                    {Array.from({ length: liveDraw.winnerCount }).map(
                        (_, index) => (
                            <article
                                key={index}
                                className={`relative overflow-hidden rounded-[2rem] border p-5 text-center shadow-2xl backdrop-blur-xl sm:p-7 md:p-9 ${
                                    drawing
                                        ? "border-white/15 bg-white/10"
                                        : "border-white bg-white text-slate-950"
                                }`}
                            >
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.25),transparent_65%)]" />

                                <div className="relative z-10">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-lg font-black text-white shadow-lg">
                                        {index + 1}
                                    </div>

                                    <p
                                        className={`mt-4 text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs ${
                                            drawing
                                                ? "text-white/45"
                                                : "text-[#4F46E5]"
                                        }`}
                                    >
                                        Winner {index + 1}
                                    </p>

                                    <h3
                                        className={`mt-3 min-h-12 break-words text-2xl font-black tracking-tight sm:text-3xl md:text-4xl ${
                                            drawing
                                                ? "animate-pulse text-white"
                                                : "text-slate-950"
                                        }`}
                                    >
                                        {shuffleNames[index] || "Selecting..."}
                                    </h3>
                                </div>
                            </article>
                        )
                    )}
                </div>
                </section>
            </>
        );
    }

    if (latestDraw.winners.length === 0) {
        return (
            <>
                {drawControls}
                <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10 md:p-14">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/10 text-white shadow-lg sm:h-24 sm:w-24">
                    <Gift size={44} />
                </div>

                <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/80">
                    <Sparkles size={15} />
                    Ready for the next draw
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl md:text-6xl">
                    Waiting for the live draw
                </h2>

                <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/40">
                    Live connection: {connectionStatus}
                </p>

                <button
                    type="button"
                    onClick={() => void reloadDrawData(true)}
                    disabled={refreshing}
                    className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                    <RefreshCw
                        size={17}
                        className={refreshing ? "animate-spin" : ""}
                    />
                    Refresh Display
                </button>
                </section>
            </>
        );
    }

    const gridClass =
        latestDraw.winners.length === 1
            ? "grid-cols-1 max-w-3xl"
            : latestDraw.winners.length === 2
              ? "grid-cols-1 sm:grid-cols-2 max-w-5xl"
              : latestDraw.winners.length <= 4
                ? "grid-cols-2 lg:grid-cols-4 max-w-7xl"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-7xl";

    return (
        <>
            {drawControls}
            <section className="w-full">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                    <Trophy size={15} />
                    {latestDraw.winners.length} Winner
                    {latestDraw.winners.length === 1 ? "" : "s"}
                </div>

                <p className="mt-5 text-sm font-black uppercase tracking-[0.28em] text-[#F9A8D4]">
                    {latestDraw.round !== null
                        ? `Draw Round ${latestDraw.round}`
                        : "Latest Draw"}
                </p>

                <h2 className="mx-auto mt-3 max-w-5xl text-3xl font-black tracking-tight sm:text-5xl md:text-7xl">
                    {latestDraw.prizeName}
                </h2>
            </div>

            <div
                className={`mx-auto mt-8 grid w-full ${gridClass} gap-4 sm:gap-5 md:mt-10`}
            >
                {latestDraw.winners.map((winner, index) => (
                    <article
                        key={winner.id}
                        className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white p-5 text-center text-slate-950 shadow-2xl sm:p-7 md:rounded-[2.25rem]"
                    >
                        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#EC4899]/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-[#4F46E5]/15 blur-3xl" />

                        <div className="relative z-10">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-lg font-black text-white shadow-lg sm:h-14 sm:w-14">
                                {index + 1}
                            </div>

                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#4F46E5] sm:text-xs">
                                Winner {index + 1}
                            </p>

                            <h3 className="mt-2 break-words text-xl font-black tracking-tight sm:text-2xl md:text-3xl">
                                {winner.winner_name || "Unnamed Guest"}
                            </h3>
                        </div>
                    </article>
                ))}
            </div>

            <div className="mt-7 flex items-center justify-center text-center">
                <button
                    type="button"
                    onClick={() => void reloadDrawData(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                    <RefreshCw
                        size={14}
                        className={refreshing ? "animate-spin" : ""}
                    />
                    Updated{" "}
                    {lastUpdatedAt.toLocaleTimeString("en-SG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })}
                </button>
            </div>
            </section>
        </>
    );
}

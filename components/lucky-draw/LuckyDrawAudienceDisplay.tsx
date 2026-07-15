"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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
    drawId?: string;
    prizeId?: string;
    prizeName?: string;
    winnerCount: number;
    drawRound?: number;
    durationMs: number;
    guestNames: string[];
    winnerNames: string[];
    displayNames?: string[];
};

type LiveDrawNamesPayload = {
    drawId?: string;
    names?: string[];
};

type Props = {
    eventId: string;
    eventName: string;
    guests?: CheckedInGuest[];
    initialWinners?: Winner[];
    initialPrizes?: Prize[];
    displaySettings?: unknown;
};

function getAudienceLayout(nameCount: number) {
    if (nameCount <= 1) {
        return {
            maxWidthClass: "max-w-5xl",
            gapClass: "gap-5",
            cardClass:
                "min-h-[320px] rounded-[2.5rem] px-10 py-12",
            nameClass:
                "text-5xl sm:text-6xl md:text-7xl lg:text-8xl",
        };
    }

    if (nameCount === 2) {
        return {
            maxWidthClass: "max-w-7xl",
            gapClass: "gap-5",
            cardClass:
                "min-h-[280px] rounded-[2rem] px-8 py-10",
            nameClass:
                "text-4xl sm:text-5xl md:text-6xl",
        };
    }

    if (nameCount === 3) {
        return {
            maxWidthClass: "max-w-[1500px]",
            gapClass: "gap-4",
            cardClass:
                "min-h-[240px] rounded-[2rem] px-6 py-8",
            nameClass:
                "text-3xl sm:text-4xl md:text-5xl",
        };
    }

    if (nameCount <= 5) {
        return {
            maxWidthClass: "max-w-[1750px]",
            gapClass: "gap-4",
            cardClass:
                "min-h-[210px] rounded-[1.75rem] px-5 py-7",
            nameClass:
                "text-2xl sm:text-3xl md:text-4xl",
        };
    }

    if (nameCount <= 10) {
        return {
            maxWidthClass: "max-w-[1900px]",
            gapClass: "gap-3",
            cardClass:
                "min-h-[145px] rounded-2xl px-3 py-5",
            nameClass:
                "text-lg sm:text-xl md:text-2xl",
        };
    }

    return {
        maxWidthClass: "max-w-[1900px]",
        gapClass: "gap-2",
        cardClass:
            "min-h-[95px] rounded-xl px-2 py-3",
        nameClass:
            "text-sm sm:text-base md:text-lg",
    };
}

export default function LuckyDrawAudienceDisplay(props: Props) {
    const {
        eventId,
        initialWinners = [],
    } = props;

    const [winners, setWinners] =
        useState<Winner[]>(initialWinners);
    const [liveDraw, setLiveDraw] =
        useState<LiveDrawPayload | null>(null);
    const [displayNames, setDisplayNames] =
        useState<string[]>([]);

    const liveDrawRef =
        useRef<LiveDrawPayload | null>(null);
    const finishTimerRef =
        useRef<number | null>(null);
    const clearLiveDrawTimerRef =
        useRef<number | null>(null);
    const reloadTimerRef =
        useRef<number | null>(null);

    const reloadWinners = useCallback(async () => {
        const { data, error } = await supabase
            .from("lucky_draw_winners")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });

        if (!error) {
            setWinners((data || []) as Winner[]);
        }
    }, [eventId]);

    const beginLiveDraw = useCallback(
        (payload: LiveDrawPayload) => {
            if (!payload) return;

            const winnerCount = Math.max(
                1,
                Math.floor(
                    Number(
                        payload.winnerCount ||
                            payload.winnerNames?.length ||
                            1
                    )
                )
            );

            const firstNames = Array.isArray(
                payload.displayNames
            )
                ? payload.displayNames
                      .map((name) =>
                          String(name || "").trim()
                      )
                      .slice(0, winnerCount)
                : [];

            if (finishTimerRef.current !== null) {
                window.clearTimeout(
                    finishTimerRef.current
                );
            }

            if (
                clearLiveDrawTimerRef.current !== null
            ) {
                window.clearTimeout(
                    clearLiveDrawTimerRef.current
                );
            }

            const safePayload: LiveDrawPayload = {
                ...payload,
                winnerCount,
                durationMs: Math.max(
                    1000,
                    Number(payload.durationMs || 5200)
                ),
            };

            liveDrawRef.current = safePayload;
            setLiveDraw(safePayload);
            setDisplayNames(firstNames);

            // Safety fallback only. Normal live updates are sent directly by
            // the backend through draw-frame and draw-finish broadcasts.
            finishTimerRef.current =
                window.setTimeout(async () => {
                    await reloadWinners();
                    liveDrawRef.current = null;
                    setLiveDraw(null);
                    finishTimerRef.current = null;
                }, safePayload.durationMs + 8000);
        },
        [reloadWinners]
    );

    const applyLiveDrawFrame = useCallback(
        (payload: LiveDrawNamesPayload) => {
            const activeDraw = liveDrawRef.current;

            if (!activeDraw) return;

            if (
                activeDraw.drawId &&
                payload.drawId &&
                activeDraw.drawId !== payload.drawId
            ) {
                return;
            }

            const names = Array.isArray(payload.names)
                ? payload.names
                      .map((name) =>
                          String(name || "").trim()
                      )
                : [];

            setDisplayNames(names);
        },
        []
    );

    const finishLiveDraw = useCallback(
        (payload: LiveDrawNamesPayload) => {
            const activeDraw = liveDrawRef.current;

            if (!activeDraw) return;

            if (
                activeDraw.drawId &&
                payload.drawId &&
                activeDraw.drawId !== payload.drawId
            ) {
                return;
            }

            if (finishTimerRef.current !== null) {
                window.clearTimeout(
                    finishTimerRef.current
                );
                finishTimerRef.current = null;
            }

            const names = Array.isArray(payload.names)
                ? payload.names
                      .map((name) =>
                          String(name || "").trim()
                      )
                      .filter(Boolean)
                : [];

            setDisplayNames(names);

            if (
                clearLiveDrawTimerRef.current !== null
            ) {
                window.clearTimeout(
                    clearLiveDrawTimerRef.current
                );
            }

            clearLiveDrawTimerRef.current =
                window.setTimeout(async () => {
                    await reloadWinners();
                    liveDrawRef.current = null;
                    setLiveDraw(null);
                    clearLiveDrawTimerRef.current = null;
                }, 2600);
        },
        [reloadWinners]
    );

    useEffect(() => {
        const channel = supabase
            .channel(
                `lucky-draw-live-${eventId}`,
                {
                    config: {
                        broadcast: {
                            self: false,
                        },
                    },
                }
            )
            .on(
                "broadcast",
                { event: "draw-start" },
                ({ payload }) => {
                    beginLiveDraw(
                        payload as LiveDrawPayload
                    );
                }
            )
            .on(
                "broadcast",
                { event: "draw-frame" },
                ({ payload }) => {
                    applyLiveDrawFrame(
                        payload as LiveDrawNamesPayload
                    );
                }
            )
            .on(
                "broadcast",
                { event: "draw-finish" },
                ({ payload }) => {
                    finishLiveDraw(
                        payload as LiveDrawNamesPayload
                    );
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
                    if (liveDrawRef.current) return;

                    if (
                        reloadTimerRef.current !== null
                    ) {
                        window.clearTimeout(
                            reloadTimerRef.current
                        );
                    }

                    reloadTimerRef.current =
                        window.setTimeout(() => {
                            void reloadWinners();
                        }, 300);
                }
            )
            .subscribe();

        const pollingTimer =
            window.setInterval(() => {
                if (
                    document.visibilityState ===
                        "visible" &&
                    !liveDrawRef.current
                ) {
                    void reloadWinners();
                }
            }, 2500);

        return () => {
            window.clearInterval(pollingTimer);

            if (finishTimerRef.current !== null) {
                window.clearTimeout(
                    finishTimerRef.current
                );
            }

            if (
                clearLiveDrawTimerRef.current !== null
            ) {
                window.clearTimeout(
                    clearLiveDrawTimerRef.current
                );
            }

            if (reloadTimerRef.current !== null) {
                window.clearTimeout(
                    reloadTimerRef.current
                );
            }

            liveDrawRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [
        applyLiveDrawFrame,
        beginLiveDraw,
        eventId,
        finishLiveDraw,
        reloadWinners,
    ]);

    const latestWinnerNames = useMemo(() => {
        const sorted = [...winners].sort(
            (first, second) =>
                new Date(
                    second.created_at || 0
                ).getTime() -
                new Date(
                    first.created_at || 0
                ).getTime()
        );

        const newestWinner = sorted[0];

        if (!newestWinner) return [];

        const newestRound =
            newestWinner.draw_round === null
                ? null
                : Number(
                      newestWinner.draw_round
                  );

        const latestWinners =
            newestRound === null
                ? [newestWinner]
                : sorted.filter(
                      (winner) =>
                          Number(
                              winner.draw_round
                          ) === newestRound
                  );

        return latestWinners
            .map((winner) =>
                String(
                    winner.winner_name || ""
                ).trim()
            )
            .filter(Boolean);
    }, [winners]);

    const names =
        liveDraw !== null
            ? displayNames
            : latestWinnerNames;

    const layout = getAudienceLayout(names.length);
    const columns = Math.max(1, Math.min(10, names.length));
    const remainder = names.length % columns;
    const lastRowStartIndex =
        remainder === 0 ? -1 : names.length - remainder;
    const centeredLastRowColumn =
        remainder === 0
            ? undefined
            : Math.floor((columns - remainder) / 2) + 1;

    const gridStyle = {
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    };

    return (
        <section className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950 px-3 py-5 text-white sm:px-4 md:px-6">
            <div className="pointer-events-none fixed left-[-20%] top-[-30%] h-[650px] w-[650px] rounded-full bg-[#4F46E5]/30 blur-3xl" />
            <div className="pointer-events-none fixed bottom-[-35%] right-[-20%] h-[750px] w-[750px] rounded-full bg-[#EC4899]/25 blur-3xl" />

            {names.length > 0 ? (
                <div
                    className={`relative z-10 mx-auto grid w-full ${layout.maxWidthClass} ${layout.gapClass}`}
                    style={gridStyle}
                >
                    {names.map((name, index) => (
                        <div
                            key={`${name}-${index}`}
                            className={`flex items-center justify-center border border-white/15 bg-white/10 text-center shadow-xl backdrop-blur-xl ${layout.cardClass}`}
                            style={
                                index === lastRowStartIndex &&
                                centeredLastRowColumn
                                    ? {
                                          gridColumnStart:
                                              centeredLastRowColumn,
                                      }
                                    : undefined
                            }
                        >
                            <span
                                className={`break-words font-black leading-tight tracking-tight ${layout.nameClass}`}
                            >
                                {name}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </section>
    );
}

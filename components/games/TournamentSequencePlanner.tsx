"use client";

import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Calculator,
    CircleDollarSign,
    Coins,
    Eye,
    Grid2X2,
    Hash,
    ListOrdered,
    Palette,
    RotateCcw,
    Save,
    Swords,
    Trophy,
    Zap,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

export type TournamentGameKey =
    | "tap_fast"
    | "coin_flip"
    | "tic_tac_toe"
    | "grab_coins"
    | "match_cards"
    | "number_rush"
    | "color_clash"
    | "odd_one_out"
    | "quick_math"
    | "sort_it_out"
    | "higher_lower";

type FinalGameKey = Exclude<
    TournamentGameKey,
    "tic_tac_toe"
>;

type PlanState = {
    tournamentStatus?: string;
    currentRound?: number;
    activePlayers?: number;
    finalSize?: number;
    steps?: TournamentGameKey[];
    finalGameKey?: FinalGameKey;
    suggestedGameKey?: TournamentGameKey;
    isFinalNext?: boolean;
};

const RECOMMENDED_STEPS: TournamentGameKey[] = [
    "tic_tac_toe",
    "coin_flip",
    "match_cards",
    "grab_coins",
    "number_rush",
    "color_clash",
    "odd_one_out",
    "quick_math",
    "sort_it_out",
    "higher_lower",
    "tap_fast",
];

const GAME_DETAILS: Record<
    TournamentGameKey,
    {
        title: string;
        subtitle: string;
        icon: React.ReactNode;
    }
> = {
    tap_fast: {
        title: "Tap, Tap, Tap",
        subtitle: "20-second speed round",
        icon: <Zap size={18} />,
    },
    coin_flip: {
        title: "Coin Flip",
        subtitle: "Three guesses",
        icon: <Coins size={18} />,
    },
    tic_tac_toe: {
        title: "Tic-Tac-Toe",
        subtitle: "Paired elimination",
        icon: <Swords size={18} />,
    },
    grab_coins: {
        title: "Grab the Coins",
        subtitle: "30-second coin hunt",
        icon: <CircleDollarSign size={18} />,
    },
    match_cards: {
        title: "Match the Cards",
        subtitle: "45-second memory round",
        icon: <Grid2X2 size={18} />,
    },
    number_rush: {
        title: "Number Rush",
        subtitle: "30-second number-order challenge",
        icon: <Hash size={18} />,
    },
    color_clash: {
        title: "Colour Clash",
        subtitle: "30-second colour-recognition challenge",
        icon: <Palette size={18} />,
    },
    odd_one_out: {
        title: "Odd One Out",
        subtitle: "30-second visual-search challenge",
        icon: <Eye size={18} />,
    },
    quick_math: {
        title: "Quick Maths",
        subtitle: "30-second arithmetic challenge",
        icon: <Calculator size={18} />,
    },
    sort_it_out: {
        title: "Sort It Out",
        subtitle: "30-second number-sorting challenge",
        icon: <ListOrdered size={18} />,
    },
    higher_lower: {
        title: "Higher or Lower",
        subtitle: "30-second prediction challenge",
        icon: <ArrowUpDown size={18} />,
    },
};

const ALL_GAMES = Object.keys(
    GAME_DETAILS
) as TournamentGameKey[];

const FINAL_GAMES = ALL_GAMES.filter(
    (
        gameKey
    ): gameKey is FinalGameKey =>
        gameKey !== "tic_tac_toe"
);

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
            "The round-sequence API returned an invalid response."
        );
    }
}

export default function TournamentSequencePlanner({
    eventId,
    onSuggestedGameChange,
}: {
    eventId: string;
    onSuggestedGameChange: (
        gameKey: TournamentGameKey
    ) => void;
}) {
    const [plan, setPlan] =
        useState<PlanState>({});
    const [steps, setSteps] = useState<
        TournamentGameKey[]
    >(RECOMMENDED_STEPS);
    const [finalGameKey, setFinalGameKey] =
        useState<FinalGameKey>("tap_fast");
    const [loading, setLoading] =
        useState(true);
    const [saving, setSaving] =
        useState(false);
    const [message, setMessage] =
        useState("");

    const loadPlan = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/plan`,
                {
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    String(
                        data.error ||
                            "Unable to load the tournament sequence."
                    )
                );
            }

            const nextPlan =
                (data.plan || {}) as PlanState;
            const nextSteps =
                Array.isArray(nextPlan.steps) &&
                nextPlan.steps.length > 0
                    ? nextPlan.steps
                    : RECOMMENDED_STEPS;

            setPlan(nextPlan);
            setSteps(nextSteps);
            setFinalGameKey(
                nextPlan.finalGameKey ||
                    "tap_fast"
            );

            if (nextPlan.suggestedGameKey) {
                onSuggestedGameChange(
                    nextPlan.suggestedGameKey
                );
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load the tournament sequence."
            );
        } finally {
            setLoading(false);
        }
    }, [
        eventId,
        onSuggestedGameChange,
    ]);

    useEffect(() => {
        void loadPlan();
    }, [loadPlan]);

    const suggestedDetails = useMemo(
        () =>
            GAME_DETAILS[
                plan.suggestedGameKey ||
                    "tic_tac_toe"
            ],
        [plan.suggestedGameKey]
    );

    function moveStep(
        index: number,
        direction: -1 | 1
    ) {
        const target = index + direction;

        if (
            target < 0 ||
            target >= steps.length
        ) {
            return;
        }

        setSteps((current) => {
            const next = [...current];
            [next[index], next[target]] = [
                next[target],
                next[index],
            ];
            return next;
        });
    }

    function updateStep(
        index: number,
        gameKey: TournamentGameKey
    ) {
        setSteps((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? gameKey
                    : item
            )
        );
    }

    function addStep() {
        if (steps.length >= 12) {
            return;
        }

        setSteps((current) => [
            ...current,
            "tap_fast",
        ]);
    }

    function removeStep(index: number) {
        if (steps.length <= 1) {
            return;
        }

        setSteps((current) =>
            current.filter(
                (_, itemIndex) =>
                    itemIndex !== index
            )
        );
    }

    async function savePlan() {
        setSaving(true);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/plan`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        steps,
                        finalGameKey,
                    }),
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    String(
                        data.error ||
                            "Unable to save the tournament sequence."
                    )
                );
            }

            const nextPlan =
                (data.plan || {}) as PlanState;
            setPlan(nextPlan);
            setSteps(
                nextPlan.steps || steps
            );
            setFinalGameKey(
                nextPlan.finalGameKey ||
                    finalGameKey
            );
            setMessage(
                data.message ||
                    "Tournament sequence saved."
            );

            if (nextPlan.suggestedGameKey) {
                onSuggestedGameChange(
                    nextPlan.suggestedGameKey
                );
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save the tournament sequence."
            );
        } finally {
            setSaving(false);
        }
    }

    const editingLocked = [
        "countdown",
        "active",
    ].includes(
        plan.tournamentStatus || ""
    );

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <ListOrdered size={21} />
                        </span>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                Tournament Sequence
                            </p>
                            <h2 className="mt-1 text-2xl font-black">
                                Plan every elimination round
                            </h2>
                        </div>
                    </div>

                    <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-500">
                        The organiser still starts every round manually. The
                        saved sequence automatically selects the recommended
                        next game.
                    </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-[#F7F5FF] px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#4F46E5]">
                        Suggested Next Game
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="text-[#4F46E5]">
                            {suggestedDetails.icon}
                        </span>
                        <div>
                            <p className="font-black text-slate-900">
                                {plan.isFinalNext
                                    ? `Final: ${suggestedDetails.title}`
                                    : suggestedDetails.title}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                                {plan.isFinalNext
                                    ? `${plan.activePlayers || 0} finalists remain`
                                    : `Planned Round ${
                                          Number(
                                              plan.currentRound ||
                                                  0
                                          ) + 1
                                      }`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
                    Loading tournament sequence...
                </p>
            ) : (
                <>
                    <div className="mt-6 grid gap-3">
                        {steps.map(
                            (gameKey, index) => {
                                const detail =
                                    GAME_DETAILS[
                                        gameKey
                                    ];
                                const completed =
                                    index <
                                    Number(
                                        plan.currentRound ||
                                            0
                                    );
                                const next =
                                    !plan.isFinalNext &&
                                    index ===
                                        Number(
                                            plan.currentRound ||
                                                0
                                        );

                                return (
                                    <div
                                        key={`${index}-${gameKey}`}
                                        className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[70px_1fr_260px_auto] md:items-center ${
                                            completed
                                                ? "border-emerald-200 bg-emerald-50"
                                                : next
                                                  ? "border-indigo-200 bg-[#F7F5FF]"
                                                  : "border-slate-200 bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-black text-slate-500 shadow-sm">
                                            {index + 1}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-[#4F46E5]">
                                                {detail.icon}
                                            </span>
                                            <div>
                                                <p className="font-black">
                                                    {detail.title}
                                                </p>
                                                <p className="text-xs font-bold text-slate-500">
                                                    {completed
                                                        ? "Completed round position"
                                                        : next
                                                          ? "Next planned elimination round"
                                                          : detail.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        <select
                                            value={gameKey}
                                            onChange={(event) =>
                                                updateStep(
                                                    index,
                                                    event
                                                        .target
                                                        .value as TournamentGameKey
                                                )
                                            }
                                            disabled={
                                                editingLocked ||
                                                completed
                                            }
                                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {ALL_GAMES.map(
                                                (
                                                    option
                                                ) => (
                                                    <option
                                                        key={
                                                            option
                                                        }
                                                        value={
                                                            option
                                                        }
                                                    >
                                                        {
                                                            GAME_DETAILS[
                                                                option
                                                            ]
                                                                .title
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveStep(
                                                        index,
                                                        -1
                                                    )
                                                }
                                                disabled={
                                                    editingLocked ||
                                                    completed ||
                                                    index ===
                                                        0
                                                }
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-35"
                                                aria-label="Move game up"
                                            >
                                                <ArrowUp
                                                    size={
                                                        16
                                                    }
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveStep(
                                                        index,
                                                        1
                                                    )
                                                }
                                                disabled={
                                                    editingLocked ||
                                                    completed ||
                                                    index ===
                                                        steps.length -
                                                            1
                                                }
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-35"
                                                aria-label="Move game down"
                                            >
                                                <ArrowDown
                                                    size={
                                                        16
                                                    }
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeStep(
                                                        index
                                                    )
                                                }
                                                disabled={
                                                    editingLocked ||
                                                    completed ||
                                                    steps.length <=
                                                        1
                                                }
                                                className="h-10 rounded-xl bg-red-50 px-3 text-xs font-black text-red-600 disabled:opacity-35"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                            <button
                                type="button"
                                onClick={addStep}
                                disabled={
                                    editingLocked ||
                                    steps.length >= 12
                                }
                                className="h-11 w-full rounded-xl bg-slate-50 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                            >
                                Add another elimination round
                            </button>
                        </div>

                        <label className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">
                                <Trophy size={16} />
                                Final 10 Game
                            </span>

                            <select
                                value={finalGameKey}
                                onChange={(event) =>
                                    setFinalGameKey(
                                        event.target
                                            .value as FinalGameKey
                                    )
                                }
                                disabled={
                                    editingLocked
                                }
                                className="mt-3 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-black text-slate-700 outline-none disabled:opacity-50"
                            >
                                {FINAL_GAMES.map(
                                    (gameKey) => (
                                        <option
                                            key={
                                                gameKey
                                            }
                                            value={
                                                gameKey
                                            }
                                        >
                                            {
                                                GAME_DETAILS[
                                                    gameKey
                                                ].title
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSteps(
                                    RECOMMENDED_STEPS
                                );
                                setFinalGameKey(
                                    "tap_fast"
                                );
                                setMessage(
                                    "Recommended sequence loaded. Save it to apply."
                                );
                            }}
                            disabled={editingLocked}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-40"
                        >
                            <RotateCcw size={16} />
                            Recommended Sequence
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                void savePlan()
                            }
                            disabled={
                                editingLocked ||
                                saving
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 text-sm font-black text-white shadow-lg disabled:opacity-40"
                        >
                            <Save size={16} />
                            {saving
                                ? "Saving..."
                                : "Save Sequence"}
                        </button>
                    </div>

                    {editingLocked && (
                        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                            Sequence editing is locked while a round is
                            counting down or active.
                        </p>
                    )}

                    {message && (
                        <p className="mt-4 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-[#4F46E5]">
                            {message}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

"use client";

import { useMemo, useState } from "react";
import { Gift, RotateCw, Sparkles, Trophy, Users } from "lucide-react";
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
    created_at: string | null;
};

type Prize = {
    id: string;
    event_id: string;
    prize_name: string;
    prize_order: number;
    eligible_registration_ids?: string[] | null;
    eligible_group_id?: string | null;
    created_at: string | null;
    updated_at?: string | null;
};

type DisplaySettings = {
    primary_color?: string | null;
    secondary_color?: string | null;
    background_color?: string | null;
    background_image_url?: string | null;
    background_image_opacity?: number | null;
};

const wheelColors = [
    "#4F46E5",
    "#EC4899",
    "#8B5CF6",
    "#06B6D4",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
];

export default function LuckyDrawAudienceDisplay({
    eventId,
    eventName,
    guests,
    initialWinners,
    initialPrizes,
    displaySettings,
}: {
    eventId: string;
    eventName: string;
    guests: CheckedInGuest[];
    initialWinners: Winner[];
    initialPrizes: Prize[];
    displaySettings?: DisplaySettings | null;
}) {
    const settings = {
        primary_color: displaySettings?.primary_color || "#4F46E5",
        secondary_color: displaySettings?.secondary_color || "#EC4899",
        background_color: displaySettings?.background_color || "#111827",
        background_image_url: displaySettings?.background_image_url || "",
        background_image_opacity: Number(
            displaySettings?.background_image_opacity ?? 0.35
        ),
    };

    const sortedPrizes = useMemo(() => {
        return [...initialPrizes].sort(
            (a, b) => Number(a.prize_order || 0) - Number(b.prize_order || 0)
        );
    }, [initialPrizes]);

    const [winners, setWinners] = useState<Winner[]>(initialWinners);
    const [selectedPrizeId, setSelectedPrizeId] = useState(
        sortedPrizes[0]?.id || ""
    );
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [selectedWinner, setSelectedWinner] = useState<CheckedInGuest | null>(
        null
    );
    const [message, setMessage] = useState("");

    const selectedPrize = useMemo(() => {
        return sortedPrizes.find((prize) => prize.id === selectedPrizeId) || null;
    }, [sortedPrizes, selectedPrizeId]);

    const effectivePrizeName = selectedPrize?.prize_name || "Lucky Draw";

    const winnerRegistrationIds = useMemo(() => {
        return new Set(winners.map((winner) => winner.registration_id));
    }, [winners]);

    const selectedPrizeEligibleIds = useMemo(() => {
        return selectedPrize?.eligible_registration_ids || [];
    }, [selectedPrize]);

    const prizePoolGuests = useMemo(() => {
        if (!selectedPrize) {
            return guests;
        }

        if (selectedPrizeEligibleIds.length === 0) {
            return guests;
        }

        return guests.filter((guest) => selectedPrizeEligibleIds.includes(guest.id));
    }, [guests, selectedPrize, selectedPrizeEligibleIds]);

    const eligibleGuests = useMemo(() => {
        return prizePoolGuests.filter(
            (guest) => !winnerRegistrationIds.has(guest.id)
        );
    }, [prizePoolGuests, winnerRegistrationIds]);

    async function saveWinner(winner: CheckedInGuest) {
        const { data, error } = await supabase
            .from("lucky_draw_winners")
            .insert({
                event_id: eventId,
                registration_id: winner.id,
                prize_id: selectedPrize?.id || null,
                winner_name: winner.full_name || "Unnamed Guest",
                winner_email: winner.email || "",
                prize_name: effectivePrizeName,
                draw_round: winners.length + 1,
            })
            .select("*")
            .single();

        if (error) {
            if (error.code === "23505") {
                setMessage(
                    "This guest has already won before. Spin again to draw another eligible guest."
                );

                const { data: latestWinnerRows } = await supabase
                    .from("lucky_draw_winners")
                    .select("*")
                    .eq("event_id", eventId);

                setWinners((latestWinnerRows || []) as Winner[]);
                return;
            }

            setMessage(error.message);
            return;
        }

        setWinners((current) => [data as Winner, ...current]);
        setSelectedWinner(winner);
        setMessage("");
    }

    async function spinWheel() {
        if (spinning) return;

        setMessage("");
        setSelectedWinner(null);

        if (guests.length === 0) {
            setMessage("No checked-in guests yet.");
            return;
        }

        const { data: latestWinnerRows, error: latestWinnerError } =
            await supabase
                .from("lucky_draw_winners")
                .select("*")
                .eq("event_id", eventId);

        if (latestWinnerError) {
            setMessage(latestWinnerError.message);
            return;
        }

        const latestWinnerList = (latestWinnerRows || []) as Winner[];

        setWinners(latestWinnerList);

        const latestWinnerIds = new Set(
            latestWinnerList.map((winner) => winner.registration_id)
        );

        const freshEligibleGuests = prizePoolGuests.filter(
            (guest) => !latestWinnerIds.has(guest.id)
        );

        if (freshEligibleGuests.length === 0) {
            setMessage(
                "No eligible guests available. Everyone in this draw pool may have already won."
            );
            return;
        }

        const winnerIndex = Math.floor(
            Math.random() * freshEligibleGuests.length
        );
        const winner = freshEligibleGuests[winnerIndex];

        const segmentAngle = 360 / freshEligibleGuests.length;
        const winnerCenterAngle = winnerIndex * segmentAngle + segmentAngle / 2;

        const targetAngle = 360 - winnerCenterAngle;
        const currentRemainder = ((rotation % 360) + 360) % 360;
        const adjustment = (targetAngle - currentRemainder + 360) % 360;
        const fullSpins = 7 * 360;
        const newRotation = rotation + fullSpins + adjustment;

        setSpinning(true);
        setRotation(newRotation);

        window.setTimeout(async () => {
            await saveWinner(winner);
            setSpinning(false);
        }, 5600);
    }

    return (
        <div
            className="relative min-h-screen w-full overflow-hidden p-8 text-white"
            style={{
                background: settings.background_color,
            }}
        >
            {settings.background_image_url && (
                <img
                    src={settings.background_image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                        opacity: settings.background_image_opacity,
                    }}
                />
            )}

            <div className="absolute inset-0 bg-black/40" />

            <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] items-center pt-20">
                <div className="grid w-full items-center gap-10 xl:grid-cols-[1fr_0.7fr]">
                    <section className="flex flex-col items-center">
                        {sortedPrizes.length > 0 && (
                            <div className="mb-8 w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                                <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-white/50">
                                    Current Prize
                                </p>

                                <select
                                    value={selectedPrizeId}
                                    onChange={(event) => {
                                        setSelectedPrizeId(event.target.value);
                                        setSelectedWinner(null);
                                        setMessage("");
                                    }}
                                    className="h-16 w-full rounded-2xl border border-white/10 bg-slate-900 px-5 text-xl font-black text-white outline-none"
                                >
                                    {sortedPrizes.map((prize) => (
                                        <option key={prize.id} value={prize.id}>
                                            {prize.prize_order}. {prize.prize_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {sortedPrizes.length === 0 && (
                            <div className="mb-8 w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-5 text-center backdrop-blur">
                                <p className="text-sm font-black uppercase tracking-[0.25em] text-white/50">
                                    Current Prize
                                </p>

                                <p className="mt-2 text-3xl font-black text-white">
                                    Lucky Draw
                                </p>
                            </div>
                        )}

                        <div className="relative flex h-[420px] w-[420px] items-center justify-center sm:h-[560px] sm:w-[560px]">
                            <div className="absolute -top-2 z-20 h-0 w-0 border-l-[24px] border-r-[24px] border-t-[46px] border-l-transparent border-r-transparent border-t-white drop-shadow-2xl" />

                            <div
                                className="absolute inset-0 rounded-full blur-3xl"
                                style={{
                                    background: `linear-gradient(135deg, ${settings.primary_color}66, ${settings.secondary_color}66)`,
                                }}
                            />

                            <div className="relative flex h-full w-full items-center justify-center rounded-full border-[12px] border-white bg-white shadow-2xl">
                                <WheelSvg
                                    guests={eligibleGuests}
                                    rotation={rotation}
                                    spinning={spinning}
                                />

                                <div
                                    className="absolute flex h-28 w-28 items-center justify-center rounded-full border-8 border-white text-white shadow-xl sm:h-36 sm:w-36"
                                    style={{
                                        background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})`,
                                    }}
                                >
                                    <Gift size={42} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={spinWheel}
                            disabled={
                                spinning ||
                                guests.length === 0 ||
                                eligibleGuests.length === 0
                            }
                            className="mt-10 inline-flex h-16 min-w-[280px] items-center justify-center gap-3 rounded-2xl px-10 text-xl font-black text-white shadow-2xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                                background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})`,
                            }}
                        >
                            <RotateCw
                                size={24}
                                className={spinning ? "animate-spin" : ""}
                            />
                            {spinning ? "Spinning..." : "Spin Wheel"}
                        </button>

                        {message && (
                            <p className="mt-5 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white/80">
                                {message}
                            </p>
                        )}
                    </section>

                    <section className="rounded-[2.5rem] border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
                        <div
                            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white shadow-xl"
                            style={{
                                color: settings.primary_color,
                            }}
                        >
                            {selectedWinner ? (
                                <Trophy size={42} />
                            ) : (
                                <Sparkles size={42} />
                            )}
                        </div>

                        <p className="mt-8 text-sm font-black uppercase tracking-[0.35em] text-white/50">
                            {selectedWinner ? "Winner" : "Ready to Draw"}
                        </p>

                        {selectedWinner ? (
                            <>
                                <h2 className="mt-4 text-5xl font-black tracking-tight text-white md:text-6xl">
                                    {selectedWinner.full_name || "Unnamed Guest"}
                                </h2>

                                <p
                                    className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-lg font-black"
                                    style={{
                                        color: settings.primary_color,
                                    }}
                                >
                                    {effectivePrizeName}
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
                                    {effectivePrizeName}
                                </h2>

                                <p className="mt-6 text-xl font-bold text-white/60">
                                    Ready to spin the wheel
                                </p>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function WheelSvg({
    guests,
    rotation,
    spinning,
}: {
    guests: CheckedInGuest[];
    rotation: number;
    spinning: boolean;
}) {
    const size = 440;
    const radius = 210;
    const center = 220;

    if (guests.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-center">
                <div>
                    <Users className="mx-auto text-slate-400" size={46} />
                    <p className="mt-3 max-w-[220px] text-sm font-black text-slate-500">
                        No eligible guests
                    </p>
                </div>
            </div>
        );
    }

    return (
        <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size} ${size}`}
            className="rounded-full"
            style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                    ? "transform 5.6s cubic-bezier(0.12, 0.75, 0.1, 1)"
                    : "none",
            }}
        >
            {guests.length === 1 ? (
                <>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill={wheelColors[0]}
                    />
                    <WheelLabel
                        x={center}
                        y={center - 135}
                        angle={0}
                        name={guests[0].full_name || "Guest"}
                    />
                </>
            ) : (
                guests.map((guest, index) => {
                    const segmentAngle = 360 / guests.length;
                    const startAngle = index * segmentAngle;
                    const endAngle = startAngle + segmentAngle;
                    const labelAngle = startAngle + segmentAngle / 2;
                    const labelPoint = polarToCartesian(
                        center,
                        center,
                        radius * 0.63,
                        labelAngle
                    );

                    return (
                        <g key={guest.id}>
                            <path
                                d={describeSegment(
                                    center,
                                    center,
                                    radius,
                                    startAngle,
                                    endAngle
                                )}
                                fill={wheelColors[index % wheelColors.length]}
                                stroke="white"
                                strokeWidth="3"
                            />

                            <WheelLabel
                                x={labelPoint.x}
                                y={labelPoint.y}
                                angle={labelAngle}
                                name={guest.full_name || "Guest"}
                            />
                        </g>
                    );
                })
            )}
        </svg>
    );
}

function WheelLabel({
    x,
    y,
    angle,
    name,
}: {
    x: number;
    y: number;
    angle: number;
    name: string;
}) {
    const displayName = name.length > 18 ? `${name.slice(0, 18)}...` : name;
    const shouldFlip = angle > 90 && angle < 270;

    return (
        <text
            x={x}
            y={y}
            fill="white"
            fontSize="13"
            fontWeight="900"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${shouldFlip ? angle + 180 : angle}, ${x}, ${y})`}
        >
            {displayName}
        </text>
    );
}

function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

function describeSegment(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
        `M ${x} ${y}`,
        `L ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
        "Z",
    ].join(" ");
}
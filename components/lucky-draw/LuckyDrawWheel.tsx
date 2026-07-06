"use client";

import { useMemo, useState } from "react";
import {
    CheckCircle2,
    Gift,
    History,
    RotateCw,
    Sparkles,
    Trophy,
    Users,
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
    winner_name: string | null;
    winner_email: string | null;
    prize_name: string | null;
    draw_round: number | null;
    created_at: string | null;
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

export default function LuckyDrawWheel({
    eventId,
    eventName,
    guests,
    initialWinners,
}: {
    eventId: string;
    eventName: string;
    guests: CheckedInGuest[];
    initialWinners: Winner[];
}) {
    const [winners, setWinners] = useState<Winner[]>(initialWinners);
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [selectedWinner, setSelectedWinner] = useState<CheckedInGuest | null>(
        null
    );
    const [prizeName, setPrizeName] = useState("");
    const [allowRepeatWinners, setAllowRepeatWinners] = useState(false);
    const [message, setMessage] = useState("");

    const winnerRegistrationIds = useMemo(
        () => new Set(winners.map((winner) => winner.registration_id)),
        [winners]
    );

    const eligibleGuests = useMemo(() => {
        if (allowRepeatWinners) return guests;

        return guests.filter((guest) => !winnerRegistrationIds.has(guest.id));
    }, [guests, winnerRegistrationIds, allowRepeatWinners]);

    const latestWinners = useMemo(() => {
        return [...winners].sort((a, b) => {
            const aDate = new Date(a.created_at || 0).getTime();
            const bDate = new Date(b.created_at || 0).getTime();

            return bDate - aDate;
        });
    }, [winners]);

    async function saveWinner(winner: CheckedInGuest) {
        const cleanPrizeName =
            prizeName.trim() || `Prize ${latestWinners.length + 1}`;

        const { data, error } = await supabase
            .from("lucky_draw_winners")
            .insert({
                event_id: eventId,
                registration_id: winner.id,
                winner_name: winner.full_name || "Unnamed Guest",
                winner_email: winner.email || "",
                prize_name: cleanPrizeName,
                draw_round: latestWinners.length + 1,
            })
            .select("*")
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setWinners((current) => [data as Winner, ...current]);
        setSelectedWinner(winner);
        setMessage(`${winner.full_name || "Guest"} won ${cleanPrizeName}.`);
    }

    async function spinWheel() {
        if (spinning) return;

        setMessage("");
        setSelectedWinner(null);

        if (eligibleGuests.length === 0) {
            setMessage("No eligible checked-in guests available for the lucky draw.");
            return;
        }

        const winnerIndex = Math.floor(Math.random() * eligibleGuests.length);
        const winner = eligibleGuests[winnerIndex];

        const segmentAngle = 360 / eligibleGuests.length;
        const winnerCenterAngle = winnerIndex * segmentAngle + segmentAngle / 2;

        const targetAngle = 360 - winnerCenterAngle;
        const currentRemainder = ((rotation % 360) + 360) % 360;
        const adjustment = (targetAngle - currentRemainder + 360) % 360;
        const fullSpins = 6 * 360;
        const newRotation = rotation + fullSpins + adjustment;

        setSpinning(true);
        setRotation(newRotation);

        window.setTimeout(async () => {
            await saveWinner(winner);
            setSpinning(false);
        }, 5200);
    }

    async function clearWinners() {
        const confirmed = window.confirm(
            "Clear all lucky draw winners for this event? This allows everyone to be drawn again."
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("lucky_draw_winners")
            .delete()
            .eq("event_id", eventId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setWinners([]);
        setSelectedWinner(null);
        setMessage("Lucky draw history cleared.");
    }

    return (
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Sparkles size={16} />
                            Wheel of Fortune
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                            Spin for a Winner
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Only checked-in guests are loaded into the wheel. The winner is
                            saved immediately after the spin.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                        {eligibleGuests.length} eligible
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center">
                    <div className="relative flex h-[360px] w-[360px] items-center justify-center sm:h-[480px] sm:w-[480px]">
                        <div className="absolute -top-1 z-20 h-0 w-0 border-l-[18px] border-r-[18px] border-t-[34px] border-l-transparent border-r-transparent border-t-slate-950" />

                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4F46E5]/20 to-[#EC4899]/20 blur-2xl" />

                        <div className="relative flex h-full w-full items-center justify-center rounded-full border-[10px] border-white bg-white shadow-2xl">
                            <WheelSvg
                                guests={eligibleGuests}
                                rotation={rotation}
                                spinning={spinning}
                            />

                            <div className="absolute flex h-24 w-24 items-center justify-center rounded-full border-8 border-white bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-xl sm:h-32 sm:w-32">
                                <Gift size={36} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid w-full gap-4 md:grid-cols-[1fr_auto]">
                        <input
                            value={prizeName}
                            onChange={(event) => setPrizeName(event.target.value)}
                            placeholder="Prize name e.g. $50 Voucher, Grand Prize"
                            className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />

                        <button
                            type="button"
                            onClick={spinWheel}
                            disabled={spinning || eligibleGuests.length === 0}
                            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-8 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RotateCw size={18} className={spinning ? "animate-spin" : ""} />
                            {spinning ? "Spinning..." : "Spin Wheel"}
                        </button>
                    </div>

                    <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-600">
                        <input
                            type="checkbox"
                            checked={allowRepeatWinners}
                            onChange={(event) => setAllowRepeatWinners(event.target.checked)}
                            className="h-5 w-5 accent-[#4F46E5]"
                        />
                        Allow previous winners to be drawn again
                    </label>

                    {message && (
                        <div className="mt-5 w-full rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-5 text-sm font-bold text-[#4F46E5]">
                            {message}
                        </div>
                    )}

                    {selectedWinner && (
                        <div className="mt-6 w-full rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-600 shadow-sm">
                                <Trophy size={32} />
                            </div>

                            <p className="mt-4 text-sm font-black uppercase tracking-[0.25em] text-emerald-700">
                                Winner
                            </p>

                            <h3 className="mt-2 text-3xl font-black text-emerald-900">
                                {selectedWinner.full_name || "Unnamed Guest"}
                            </h3>

                            <p className="mt-2 font-semibold text-emerald-700">
                                {selectedWinner.email || "No email"}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Users size={16} />
                                Draw Pool
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950">
                                Checked-In Guests
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                These guests are automatically pulled from successful check-ins.
                            </p>
                        </div>

                        <span className="rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            {guests.length}
                        </span>
                    </div>

                    <div className="mt-6 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                        {guests.length > 0 ? (
                            guests.map((guest) => {
                                const alreadyWon = winnerRegistrationIds.has(guest.id);

                                return (
                                    <div
                                        key={guest.id}
                                        className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                                    >
                                        <div>
                                            <p className="font-black text-slate-950">
                                                {guest.full_name || "Unnamed Guest"}
                                            </p>
                                            <p className="text-sm font-semibold text-slate-500">
                                                {guest.email || "No email"}
                                            </p>
                                        </div>

                                        {alreadyWon ? (
                                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                                                Won
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                                Eligible
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <EmptyBox text="No checked-in guests yet. Once guests are scanned in, they will appear here automatically." />
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <History size={16} />
                                Winner History
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950">
                                Winners
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Winners are saved so the draw can continue without repeating.
                            </p>
                        </div>

                        {winners.length > 0 && (
                            <button
                                type="button"
                                onClick={clearWinners}
                                className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="mt-6 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                        {latestWinners.length > 0 ? (
                            latestWinners.map((winner, index) => (
                                <div
                                    key={winner.id}
                                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-sm font-black text-[#4F46E5]">
                                            #{latestWinners.length - index}
                                        </div>

                                        <div>
                                            <p className="font-black text-slate-950">
                                                {winner.winner_name || "Unnamed Guest"}
                                            </p>

                                            <p className="text-sm font-semibold text-slate-500">
                                                {winner.winner_email || "No email"}
                                            </p>

                                            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                                                <Gift size={13} />
                                                {winner.prize_name || "Prize"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyBox text="No winners drawn yet." />
                        )}
                    </div>
                </div>
            </section>
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
                    <Users className="mx-auto text-slate-400" size={42} />
                    <p className="mt-3 max-w-[220px] text-sm font-black text-slate-500">
                        No checked-in guests yet
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
                    ? "transform 5.2s cubic-bezier(0.12, 0.75, 0.1, 1)"
                    : "none",
            }}
        >
            {guests.length === 1 ? (
                <>
                    <circle cx={center} cy={center} r={radius} fill={wheelColors[0]} />
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
                                d={describeSegment(center, center, radius, startAngle, endAngle)}
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
    const displayName = name.length > 16 ? `${name.slice(0, 16)}...` : name;
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

function EmptyBox({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <CheckCircle2 className="mx-auto text-slate-300" size={34} />
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                {text}
            </p>
        </div>
    );
}
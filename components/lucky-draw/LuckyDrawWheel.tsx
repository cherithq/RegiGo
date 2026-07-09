"use client";

import { useMemo, useState } from "react";
import {
    Check,
    CheckCircle2,
    Filter,
    Gift,
    History,
    Plus,
    RotateCw,
    Search,
    Sparkles,
    Trash2,
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
    custom_answers?: Record<string, unknown> | null;
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
    eligible_registration_ids: string[];
    created_at: string | null;
    updated_at?: string | null;
};

type RegistrationField = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    field_options?: any;
    options?: any;
    sort_order?: number;
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

const HAS_VALUE_FILTER = "__HAS_VALUE__";

const HIDDEN_FILTER_FIELD_TYPES = new Set([
    "email",
    "phone",
    "file",
    "date",
    "time",
]);

const HIDDEN_FILTER_KEYS = new Set([
    "id",
    "eventid",
    "registrationid",
    "registrationstatus",
    "qrtoken",
    "qrcode",
    "qrcodeurl",
    "tickettypeid",
    "tickettype",
    "fullname",
    "name",
    "email",
    "emailaddress",
    "phone",
    "phonenumber",
    "mobile",
    "mobilenumber",
    "countrycode",
    "createdat",
    "updatedat",
    "checkedinat",
]);

export default function LuckyDrawWheel({
    eventId,
    eventName,
    guests = [],
    initialWinners = [],
    initialPrizes = [],
    registrationFields = [],
}: {
    eventId: string;
    eventName: string;
    guests?: CheckedInGuest[];
    initialWinners?: Winner[];
    initialPrizes?: Prize[];
    registrationFields?: RegistrationField[];
}) {
    const [winners, setWinners] = useState<Winner[]>(initialWinners);

    const [prizes, setPrizes] = useState<Prize[]>(
        [...initialPrizes].sort(
            (a, b) => Number(a.prize_order || 0) - Number(b.prize_order || 0)
        )
    );

    const [selectedPrizeId, setSelectedPrizeId] = useState<string>(
        initialPrizes[0]?.id || ""
    );

    const [newPrizeName, setNewPrizeName] = useState("");
    const [guestSearch, setGuestSearch] = useState("");
    const [fieldFilterKey, setFieldFilterKey] = useState("");
    const [fieldFilterValue, setFieldFilterValue] = useState("");
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [selectedWinner, setSelectedWinner] = useState<CheckedInGuest | null>(
        null
    );
    const [message, setMessage] = useState("");

    const selectedPrize = useMemo(() => {
        return prizes.find((prize) => prize.id === selectedPrizeId) || null;
    }, [prizes, selectedPrizeId]);

    const winnerRegistrationIds = useMemo(() => {
        return new Set(winners.map((winner) => winner.registration_id));
    }, [winners]);

    const selectedPrizeEligibleIds = useMemo(() => {
        if (!selectedPrize?.eligible_registration_ids) return [];
        return selectedPrize.eligible_registration_ids;
    }, [selectedPrize]);

    const availableFilterFields = useMemo(() => {
        let sourceFields: RegistrationField[] = [];

        if (registrationFields.length > 0) {
            sourceFields = registrationFields;
        } else {
            const keys = new Set<string>();

            guests.forEach((guest) => {
                Object.keys(guest.custom_answers || {}).forEach((key) => {
                    keys.add(key);
                });
            });

            sourceFields = Array.from(keys).map((key) => ({
                id: key,
                field_label: formatAutoLabel(key),
                field_key: key,
                field_type: "text",
            }));
        }

        const cleanedFields = sourceFields
            .filter((field) => shouldShowLuckyDrawFilterField(field, guests))
            .sort(
                (a, b) =>
                    Number(a.sort_order || 0) - Number(b.sort_order || 0)
            );

        return dedupeFilterFields(cleanedFields);
    }, [registrationFields, guests]);

    const selectedFilterField = useMemo(() => {
        return (
            availableFilterFields.find(
                (field) => field.field_key === fieldFilterKey
            ) || null
        );
    }, [availableFilterFields, fieldFilterKey]);

    const fieldFilterOptions = useMemo(() => {
        if (!fieldFilterKey) return [];

        const values = new Set<string>();

        const configuredChoices = getConfiguredChoices(selectedFilterField);

        configuredChoices.forEach((choice) => {
            if (choice) values.add(choice);
        });

        guests.forEach((guest) => {
            const answer = getGuestAnswer(guest, fieldFilterKey);

            normaliseAnswerValues(answer).forEach((value) => {
                if (value) values.add(value);
            });
        });

        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [guests, fieldFilterKey, selectedFilterField]);

    const filteredGuests = useMemo(() => {
        const keyword = guestSearch.trim().toLowerCase();

        return guests.filter((guest) => {
            const searchableText = [
                guest.full_name,
                guest.email,
                guest.phone,
                guest.department,
                ...Object.values(guest.custom_answers || {}).flatMap((value) =>
                    normaliseAnswerValues(value)
                ),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = keyword
                ? searchableText.includes(keyword)
                : true;

            if (!matchesSearch) return false;

            if (!fieldFilterKey || !fieldFilterValue) {
                return true;
            }

            const answerValues = normaliseAnswerValues(
                getGuestAnswer(guest, fieldFilterKey)
            );

            if (fieldFilterValue === HAS_VALUE_FILTER) {
                return answerValues.length > 0;
            }

            return answerValues.some(
                (value) =>
                    value.trim().toLowerCase() ===
                    fieldFilterValue.trim().toLowerCase()
            );
        });
    }, [guests, guestSearch, fieldFilterKey, fieldFilterValue]);

    const prizePoolGuests = useMemo(() => {
        if (!selectedPrize) return [];

        if (selectedPrizeEligibleIds.length === 0) {
            return guests;
        }

        return guests.filter((guest) =>
            selectedPrizeEligibleIds.includes(guest.id)
        );
    }, [guests, selectedPrize, selectedPrizeEligibleIds]);

    const eligibleGuests = useMemo(() => {
        return prizePoolGuests.filter(
            (guest) => !winnerRegistrationIds.has(guest.id)
        );
    }, [prizePoolGuests, winnerRegistrationIds]);

    const latestWinners = useMemo(() => {
        return [...winners].sort((a, b) => {
            const aDate = new Date(a.created_at || 0).getTime();
            const bDate = new Date(b.created_at || 0).getTime();

            return bDate - aDate;
        });
    }, [winners]);

    async function addPrize() {
        const cleanPrizeName = newPrizeName.trim();

        if (!cleanPrizeName) {
            setMessage("Enter a prize name first.");
            return;
        }

        const nextOrder =
            prizes.length > 0
                ? Math.max(
                      ...prizes.map((prize) => Number(prize.prize_order || 0))
                  ) + 1
                : 1;

        const { data, error } = await supabase
            .from("lucky_draw_prizes")
            .insert({
                event_id: eventId,
                prize_name: cleanPrizeName,
                prize_order: nextOrder,
                eligible_registration_ids: [],
            })
            .select("*")
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        const createdPrize = data as Prize;

        setPrizes((current) => [...current, createdPrize]);
        setSelectedPrizeId(createdPrize.id);
        setNewPrizeName("");
        setMessage("Prize created. You can now select eligible guests for it.");
    }

    async function deletePrize(prizeId: string) {
        const confirmed = window.confirm(
            "Delete this prize? Winner history will remain, but this prize setup will be removed."
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("lucky_draw_prizes")
            .delete()
            .eq("id", prizeId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setPrizes((current) => current.filter((prize) => prize.id !== prizeId));

        if (selectedPrizeId === prizeId) {
            const nextPrize = prizes.find((prize) => prize.id !== prizeId);
            setSelectedPrizeId(nextPrize?.id || "");
        }

        setMessage("Prize deleted.");
    }

    async function updatePrizeEligibleIds(prizeId: string, ids: string[]) {
        const uniqueIds = Array.from(new Set(ids));

        const { error } = await supabase
            .from("lucky_draw_prizes")
            .update({
                eligible_registration_ids: uniqueIds,
                updated_at: new Date().toISOString(),
            })
            .eq("id", prizeId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setPrizes((current) =>
            current.map((prize) =>
                prize.id === prizeId
                    ? {
                          ...prize,
                          eligible_registration_ids: uniqueIds,
                      }
                    : prize
            )
        );
    }

    async function toggleGuestEligibility(registrationId: string) {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        const currentIds = selectedPrizeEligibleIds;

        const nextIds = currentIds.includes(registrationId)
            ? currentIds.filter((id) => id !== registrationId)
            : [...currentIds, registrationId];

        await updatePrizeEligibleIds(selectedPrize.id, nextIds);
    }

    async function selectAllGuestsForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        await updatePrizeEligibleIds(
            selectedPrize.id,
            guests.map((guest) => guest.id)
        );

        setMessage(
            `All checked-in guests are selected for ${selectedPrize.prize_name}.`
        );
    }

    async function selectFilteredGuestsForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        if (filteredGuests.length === 0) {
            setMessage("No guests match the current filter.");
            return;
        }

        await updatePrizeEligibleIds(
            selectedPrize.id,
            filteredGuests.map((guest) => guest.id)
        );

        setMessage(
            `${filteredGuests.length} filtered guest${
                filteredGuests.length === 1 ? "" : "s"
            } selected for ${selectedPrize.prize_name}.`
        );
    }

    async function clearSelectedGuestsForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        await updatePrizeEligibleIds(selectedPrize.id, []);

        setMessage(
            `Eligibility restriction cleared. ${selectedPrize.prize_name} is now open to all checked-in guests.`
        );
    }

    async function saveWinner(winner: CheckedInGuest) {
        if (!selectedPrize) {
            setMessage("Select a prize before spinning.");
            return;
        }

        const { data, error } = await supabase
            .from("lucky_draw_winners")
            .insert({
                event_id: eventId,
                registration_id: winner.id,
                prize_id: selectedPrize.id,
                winner_name: winner.full_name || "Unnamed Guest",
                winner_email: winner.email || "",
                prize_name: selectedPrize.prize_name,
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

        setMessage(
            `${winner.full_name || "Guest"} won ${selectedPrize.prize_name}.`
        );
    }

    async function spinWheel() {
        if (spinning) return;

        setMessage("");
        setSelectedWinner(null);

        if (!selectedPrize) {
            setMessage("Create or select a prize first.");
            return;
        }

        if (eligibleGuests.length === 0) {
            setMessage(
                "No eligible checked-in guests available for this prize. Check the selected group or previous winners."
            );
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
                            Spin for Selected Prize
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            {eventName}
                        </p>

                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                            The wheel only includes checked-in guests who are eligible for the selected prize.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                        {eligibleGuests.length} eligible
                    </div>
                </div>

                <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-2 text-sm font-black text-slate-700">
                        Selected Prize
                    </p>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <select
                            value={selectedPrizeId}
                            onChange={(event) => {
                                setSelectedPrizeId(event.target.value);
                                setSelectedWinner(null);
                                setMessage("");
                            }}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                        >
                            <option value="">Select prize</option>
                            {prizes.map((prize) => (
                                <option key={prize.id} value={prize.id}>
                                    {prize.prize_order}. {prize.prize_name}
                                </option>
                            ))}
                        </select>

                        {selectedPrize && (
                            <button
                                type="button"
                                onClick={() => deletePrize(selectedPrize.id)}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 text-sm font-black text-red-600 transition hover:bg-red-100"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                        <input
                            value={newPrizeName}
                            onChange={(event) => setNewPrizeName(event.target.value)}
                            placeholder="Add prize e.g. Grand Prize, 1st Prize, Top 3 Prize"
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5]"
                        />

                        <button
                            type="button"
                            onClick={addPrize}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-[#4F46E5]"
                        >
                            <Plus size={16} />
                            Add Prize
                        </button>
                    </div>

                    {selectedPrize && (
                        <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600">
                            {selectedPrizeEligibleIds.length > 0 ? (
                                <p>
                                    This prize is restricted to{" "}
                                    <span className="font-black text-[#4F46E5]">
                                        {selectedPrizeEligibleIds.length}
                                    </span>{" "}
                                    selected checked-in guest
                                    {selectedPrizeEligibleIds.length === 1 ? "" : "s"}.
                                </p>
                            ) : (
                                <p>
                                    No restriction set. This prize is open to{" "}
                                    <span className="font-black text-[#4F46E5]">
                                        all checked-in guests
                                    </span>
                                    .
                                </p>
                            )}
                        </div>
                    )}
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

                    <button
                        type="button"
                        onClick={spinWheel}
                        disabled={spinning || !selectedPrize || eligibleGuests.length === 0}
                        className="mt-8 inline-flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-8 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RotateCw
                            size={18}
                            className={spinning ? "animate-spin" : ""}
                        />
                        {spinning ? "Spinning..." : "Spin Selected Prize"}
                    </button>

                    {message && (
                        <div className="mt-5 w-full rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-5 text-sm font-bold text-[#4F46E5]">
                            {message}
                        </div>
                    )}

                    {selectedWinner && selectedPrize && (
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

                            <p className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700">
                                {selectedPrize.prize_name}
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
                                Prize Eligibility
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950">
                                Select Eligible Guests
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Filter guests by useful registration answers, then select all matching guests for the current prize.
                            </p>
                        </div>

                        <span className="rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            {selectedPrizeEligibleIds.length || "All"}
                        </span>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <button
                            type="button"
                            onClick={selectAllGuestsForPrize}
                            disabled={!selectedPrize || guests.length === 0}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Check size={16} />
                            Select All
                        </button>

                        <button
                            type="button"
                            onClick={selectFilteredGuestsForPrize}
                            disabled={!selectedPrize || filteredGuests.length === 0}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Filter size={16} />
                            Select Filtered
                        </button>

                        <button
                            type="button"
                            onClick={clearSelectedGuestsForPrize}
                            disabled={!selectedPrize}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Clear Restriction
                        </button>
                    </div>

                    <div className="relative mt-5">
                        <Search
                            size={17}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            value={guestSearch}
                            onChange={(event) => setGuestSearch(event.target.value)}
                            placeholder="Search checked-in guests by name, email, phone or answer..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                            <Filter size={16} className="text-[#4F46E5]" />
                            Filter by Registration Answer
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <select
                                value={fieldFilterKey}
                                onChange={(event) => {
                                    setFieldFilterKey(event.target.value);
                                    setFieldFilterValue("");
                                }}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                            >
                                <option value="">No field filter</option>

                                {availableFilterFields.map((field) => (
                                    <option
                                        key={field.id || field.field_key}
                                        value={field.field_key}
                                    >
                                        {field.field_label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={fieldFilterValue}
                                onChange={(event) =>
                                    setFieldFilterValue(event.target.value)
                                }
                                disabled={!fieldFilterKey}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select value</option>
                                <option value={HAS_VALUE_FILTER}>Has any value</option>

                                {fieldFilterOptions.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(fieldFilterKey || fieldFilterValue) && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs font-bold text-slate-500">
                                    Showing{" "}
                                    <span className="font-black text-[#4F46E5]">
                                        {filteredGuests.length}
                                    </span>{" "}
                                    matching checked-in guest
                                    {filteredGuests.length === 1 ? "" : "s"}.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFieldFilterKey("");
                                        setFieldFilterValue("");
                                    }}
                                    className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                        {!selectedPrize ? (
                            <EmptyBox text="Create or select a prize before choosing eligible guests." />
                        ) : filteredGuests.length > 0 ? (
                            filteredGuests.map((guest) => {
                                const selected =
                                    selectedPrizeEligibleIds.length === 0
                                        ? false
                                        : selectedPrizeEligibleIds.includes(guest.id);

                                const alreadyWon = winnerRegistrationIds.has(guest.id);

                                const selectedFieldAnswer = fieldFilterKey
                                    ? displayAnswerValue(
                                          getGuestAnswer(guest, fieldFilterKey)
                                      )
                                    : "";

                                return (
                                    <button
                                        key={guest.id}
                                        type="button"
                                        onClick={() => toggleGuestEligibility(guest.id)}
                                        className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                                            selected
                                                ? "border-[#4F46E5] bg-[#F7F5FF]"
                                                : "border-slate-100 bg-slate-50 hover:bg-[#F7F5FF]"
                                        }`}
                                    >
                                        <div>
                                            <p className="font-black text-slate-950">
                                                {guest.full_name || "Unnamed Guest"}
                                            </p>

                                            <p className="text-sm font-semibold text-slate-500">
                                                {guest.email || "No email"}
                                            </p>

                                            {fieldFilterKey && (
                                                <p className="mt-1 text-xs font-black text-[#4F46E5]">
                                                    {selectedFilterField?.field_label ||
                                                        fieldFilterKey}
                                                    : {selectedFieldAnswer || "-"}
                                                </p>
                                            )}

                                            {alreadyWon && (
                                                <p className="mt-1 text-xs font-black text-amber-600">
                                                    Already won before
                                                </p>
                                            )}
                                        </div>

                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                selected
                                                    ? "bg-[#4F46E5] text-white"
                                                    : "bg-white text-slate-300"
                                            }`}
                                        >
                                            <Check size={16} />
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <EmptyBox text="No checked-in guests found for this filter." />
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
                                Winners are saved so they are excluded from future draws.
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

function getGuestAnswer(guest: CheckedInGuest, fieldKey: string) {
    const customAnswers = guest.custom_answers || {};
    const candidateKeys = getEquivalentAnswerKeys(fieldKey);

    for (const key of candidateKeys) {
        if (customAnswers[key] !== undefined) {
            return customAnswers[key];
        }
    }

    const normalisedCandidates = candidateKeys.map((key) =>
        normaliseFilterText(key)
    );

    for (const [answerKey, answerValue] of Object.entries(customAnswers)) {
        const normalisedAnswerKey = normaliseFilterText(answerKey);

        if (normalisedCandidates.includes(normalisedAnswerKey)) {
            return answerValue;
        }
    }

    const normalisedKey = normaliseFilterText(fieldKey);

    if (
        normalisedKey === "department" ||
        normalisedKey === "departmentoutlet"
    ) {
        return guest.department;
    }

    return undefined;
}

function getEquivalentAnswerKeys(fieldKey: string) {
    const normalisedKey = normaliseFilterText(fieldKey);

    if (
        normalisedKey === "department" ||
        normalisedKey === "departmentoutlet"
    ) {
        return [
            fieldKey,
            "department",
            "department_outlet",
            "departmentOutlet",
            "department / outlet",
        ];
    }

    if (
        normalisedKey === "dietaryrequest" ||
        normalisedKey === "dietaryrequirements" ||
        normalisedKey === "dietary"
    ) {
        return [
            fieldKey,
            "dietary",
            "dietary_request",
            "dietary_requirements",
            "dietaryRequest",
            "dietaryRequirements",
        ];
    }

    if (
        normalisedKey === "requiretransport" ||
        normalisedKey === "requiretransportfromoutlet" ||
        normalisedKey === "transport"
    ) {
        return [
            fieldKey,
            "require_transport",
            "require_transport_from_outlet",
            "requireTransport",
            "requireTransportFromOutlet",
            "transport",
        ];
    }

    return [fieldKey];
}

function normaliseAnswerValues(value: unknown): string[] {
    if (value === null || value === undefined) return [];

    if (Array.isArray(value)) {
        return value
            .flatMap((item) => normaliseAnswerValues(item))
            .filter(Boolean);
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;

        if ("label" in record) {
            return normaliseAnswerValues(record.label);
        }

        if ("value" in record) {
            return normaliseAnswerValues(record.value);
        }

        return [JSON.stringify(record)];
    }

    const text = String(value).trim();
    return text ? [text] : [];
}

function displayAnswerValue(value: unknown) {
    return normaliseAnswerValues(value).join(", ");
}

function getConfiguredChoices(field: RegistrationField | null) {
    if (!field) return [];

    const options = field.field_options || field.options || {};

    const normalChoices = Array.isArray(options.choices)
        ? options.choices.filter(Boolean)
        : [];

    const imageChoiceLabels = Array.isArray(options.image_choices)
        ? options.image_choices
              .map((choice: any) => choice?.label)
              .filter(Boolean)
        : [];

    return Array.from(new Set([...normalChoices, ...imageChoiceLabels]));
}

function formatAutoLabel(key: string) {
    return key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function normaliseFilterText(value?: string | null) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function isUuidLike(value?: string | null) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || "").trim()
    );
}

function shouldShowLuckyDrawFilterField(
    field: RegistrationField,
    guests: CheckedInGuest[]
) {
    const fieldKey = field.field_key || "";
    const fieldLabel = field.field_label || "";

    if (!fieldKey || !fieldLabel) return false;

    if (isUuidLike(fieldKey) || isUuidLike(fieldLabel)) {
        return false;
    }

    const normalisedKey = normaliseFilterText(fieldKey);
    const normalisedLabel = normaliseFilterText(fieldLabel);

    if (
        HIDDEN_FILTER_KEYS.has(normalisedKey) ||
        HIDDEN_FILTER_KEYS.has(normalisedLabel)
    ) {
        return false;
    }

    if (HIDDEN_FILTER_FIELD_TYPES.has(field.field_type)) {
        return false;
    }

    const configuredChoices = getConfiguredChoices(field);

    const guestAnswerValues = guests.flatMap((guest) =>
        normaliseAnswerValues(getGuestAnswer(guest, fieldKey))
    );

    if (configuredChoices.length === 0 && guestAnswerValues.length === 0) {
        return false;
    }

    return true;
}

function getFilterGroupKey(field: RegistrationField) {
    const combined = normaliseFilterText(
        `${field.field_label || ""} ${field.field_key || ""}`
    );

    if (combined.includes("department")) {
        return "departmentoutlet";
    }

    if (combined.includes("dietary")) {
        return "dietaryrequirements";
    }

    if (combined.includes("requiretransport") || combined.includes("transport")) {
        return "requiretransportfromoutlet";
    }

    return (
        normaliseFilterText(field.field_label) ||
        normaliseFilterText(field.field_key)
    );
}

function getFilterDisplayLabel(field: RegistrationField) {
    const groupKey = getFilterGroupKey(field);

    if (groupKey === "departmentoutlet") {
        return "Department / Outlet";
    }

    if (groupKey === "dietaryrequirements") {
        return "Dietary Requirements";
    }

    if (groupKey === "requiretransportfromoutlet") {
        return "Require Transport from Outlet";
    }

    return field.field_label;
}

function getFilterFieldScore(field: RegistrationField) {
    const text = normaliseFilterText(
        `${field.field_label || ""} ${field.field_key || ""}`
    );

    let score = 0;

    if (text.includes("outlet")) score += 20;
    if (text.includes("requirements")) score += 20;
    if (text.includes("request")) score += 10;
    if (text.includes("fromoutlet")) score += 30;

    return score;
}

function dedupeFilterFields(fields: RegistrationField[]) {
    const grouped = new Map<string, RegistrationField>();

    for (const field of fields) {
        const groupKey = getFilterGroupKey(field);

        if (!groupKey) continue;

        const existing = grouped.get(groupKey);

        if (!existing) {
            grouped.set(groupKey, {
                ...field,
                field_label: getFilterDisplayLabel(field),
            });
            continue;
        }

        if (getFilterFieldScore(field) > getFilterFieldScore(existing)) {
            grouped.set(groupKey, {
                ...field,
                field_label: getFilterDisplayLabel(field),
            });
        }
    }

    return Array.from(grouped.values());
}
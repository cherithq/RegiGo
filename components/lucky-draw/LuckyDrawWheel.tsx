"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Check,
    CheckCircle2,
    Download,
    Filter,
    Gift,
    History,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Trophy,
    UserPlus,
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
    is_excluded?: boolean | null;
    created_at: string | null;
};

type Prize = {
    id: string;
    event_id: string;
    prize_name: string;
    prize_order: number;
    winner_count?: number | null;
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

function escapeCsvCell(value: unknown) {
    let text = String(value ?? "");

    // Prevent spreadsheet applications from interpreting user-controlled
    // values as formulas.
    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

function makeCsvFileName(value: string) {
    const cleanName = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return cleanName || "event";
}

function getLiveDrawLayout(nameCount: number) {
    if (nameCount <= 1) {
        return {
            maxWidthClass: "max-w-5xl",
            gapClass: "gap-5",
            cardClass:
                "min-h-[260px] rounded-[2.5rem] px-10 py-12",
            nameClass:
                "text-5xl sm:text-6xl md:text-7xl",
        };
    }

    if (nameCount === 2) {
        return {
            maxWidthClass: "max-w-7xl",
            gapClass: "gap-5",
            cardClass:
                "min-h-[230px] rounded-[2rem] px-8 py-10",
            nameClass:
                "text-4xl sm:text-5xl md:text-6xl",
        };
    }

    if (nameCount === 3) {
        return {
            maxWidthClass: "max-w-[1500px]",
            gapClass: "gap-4",
            cardClass:
                "min-h-[210px] rounded-[2rem] px-6 py-8",
            nameClass:
                "text-3xl sm:text-4xl md:text-5xl",
        };
    }

    if (nameCount <= 5) {
        return {
            maxWidthClass: "max-w-[1750px]",
            gapClass: "gap-4",
            cardClass:
                "min-h-[180px] rounded-[1.75rem] px-5 py-7",
            nameClass:
                "text-2xl sm:text-3xl md:text-4xl",
        };
    }

    if (nameCount <= 10) {
        return {
            maxWidthClass: "max-w-[1900px]",
            gapClass: "gap-3",
            cardClass:
                "min-h-[130px] rounded-2xl px-3 py-5",
            nameClass:
                "text-lg sm:text-xl md:text-2xl",
        };
    }

    return {
        maxWidthClass: "max-w-[1900px]",
        gapClass: "gap-2",
        cardClass:
            "min-h-[92px] rounded-xl px-2 py-3",
        nameClass:
            "text-sm sm:text-base md:text-lg",
    };
}

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
    const [winnerHistorySearch, setWinnerHistorySearch] = useState("");
    const [winnerFieldFilterKey, setWinnerFieldFilterKey] = useState("");
    const [winnerFieldFilterValue, setWinnerFieldFilterValue] = useState("");
    const [draftEligibleIds, setDraftEligibleIds] = useState<string[]>(
        initialPrizes[0]?.eligible_registration_ids || []
    );
    const [savingEligibility, setSavingEligibility] = useState(false);
    const [restoringRegistrationId, setRestoringRegistrationId] =
        useState<string | null>(null);
    const [addingAllWinnersBack, setAddingAllWinnersBack] =
        useState(false);
    const [fieldFilterKey, setFieldFilterKey] = useState("");
    const [fieldFilterValue, setFieldFilterValue] = useState("");
    const [spinning, setSpinning] = useState(false);
    const [shufflePreview, setShufflePreview] = useState<string[]>([]);
    const liveDrawChannelRef = useRef<
        ReturnType<typeof supabase.channel> | null
    >(null);
    const liveDrawChannelReadyRef = useRef(false);
    const shuffleIntervalRef = useRef<number | null>(null);
    const drawTimeoutRef = useRef<number | null>(null);
    const [selectedWinners, setSelectedWinners] = useState<CheckedInGuest[]>([]);
    const [winnerCountDraft, setWinnerCountDraft] = useState<number>(
        Math.max(1, Number(initialPrizes[0]?.winner_count || 1))
    );
    const [savingWinnerCount, setSavingWinnerCount] = useState(false);
    const [message, setMessage] = useState("");

    const selectedPrize = useMemo(() => {
        return prizes.find((prize) => prize.id === selectedPrizeId) || null;
    }, [prizes, selectedPrizeId]);

    useEffect(() => {
        setWinnerCountDraft(
            Math.max(1, Number(selectedPrize?.winner_count || 1))
        );
    }, [selectedPrize?.id, selectedPrize?.winner_count]);

    useEffect(() => {
        setDraftEligibleIds(
            Array.isArray(selectedPrize?.eligible_registration_ids)
                ? selectedPrize.eligible_registration_ids.map(String)
                : []
        );
    }, [selectedPrize?.id, selectedPrize?.eligible_registration_ids]);


    useEffect(() => {
        const channel = supabase.channel(`lucky-draw-live-${eventId}`, {
            config: {
                broadcast: {
                    self: false,
                },
            },
        });

        channel.subscribe((status) => {
            liveDrawChannelReadyRef.current = status === "SUBSCRIBED";
        });
        liveDrawChannelRef.current = channel;

        return () => {
            if (shuffleIntervalRef.current !== null) {
                window.clearInterval(shuffleIntervalRef.current);
            }

            if (drawTimeoutRef.current !== null) {
                window.clearTimeout(drawTimeoutRef.current);
            }

            liveDrawChannelReadyRef.current = false;
            liveDrawChannelRef.current = null;
            void supabase.removeChannel(channel);
        };
    }, [eventId]);

    const excludedWinnerRegistrationIds = useMemo(() => {
        return new Set(
            winners
                .filter((winner) => winner.is_excluded !== false)
                .map((winner) => winner.registration_id)
        );
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

    const draftEligibleIdSet = useMemo(() => {
        return new Set(draftEligibleIds);
    }, [draftEligibleIds]);

    const newFilteredGuestIds = useMemo(() => {
        return filteredGuests
            .map((guest) => guest.id)
            .filter((registrationId) => !draftEligibleIdSet.has(registrationId));
    }, [filteredGuests, draftEligibleIdSet]);

    const hasUnsavedEligibilityChanges = useMemo(() => {
        const saved = [...selectedPrizeEligibleIds].sort();
        const draft = [...draftEligibleIds].sort();

        if (saved.length !== draft.length) return true;

        return saved.some((id, index) => id !== draft[index]);
    }, [draftEligibleIds, selectedPrizeEligibleIds]);

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
            (guest) => !excludedWinnerRegistrationIds.has(guest.id)
        );
    }, [prizePoolGuests, excludedWinnerRegistrationIds]);

    const latestWinners = useMemo(() => {
        return [...winners].sort((a, b) => {
            const aDate = new Date(a.created_at || 0).getTime();
            const bDate = new Date(b.created_at || 0).getTime();

            return bDate - aDate;
        });
    }, [winners]);

    const winnerGuestByRegistrationId = useMemo(() => {
        return new Map(
            guests.map((guest) => [guest.id, guest] as const)
        );
    }, [guests]);

    const selectedWinnerFilterField = useMemo(() => {
        return (
            availableFilterFields.find(
                (field) =>
                    field.field_key === winnerFieldFilterKey
            ) || null
        );
    }, [availableFilterFields, winnerFieldFilterKey]);

    const winnerFieldFilterOptions = useMemo(() => {
        if (!winnerFieldFilterKey) return [];

        const values = new Set<string>();

        getConfiguredChoices(
            selectedWinnerFilterField
        ).forEach((choice) => {
            if (choice) values.add(choice);
        });

        latestWinners.forEach((winner) => {
            const guest =
                winnerGuestByRegistrationId.get(
                    winner.registration_id
                );

            if (!guest) return;

            normaliseAnswerValues(
                getGuestAnswer(
                    guest,
                    winnerFieldFilterKey
                )
            ).forEach((value) => {
                if (value) values.add(value);
            });
        });

        return Array.from(values).sort((first, second) =>
            first.localeCompare(second)
        );
    }, [
        latestWinners,
        selectedWinnerFilterField,
        winnerFieldFilterKey,
        winnerGuestByRegistrationId,
    ]);

    const hasWinnerHistoryFilters =
        Boolean(winnerHistorySearch.trim()) ||
        Boolean(winnerFieldFilterKey) ||
        Boolean(winnerFieldFilterValue);

    const filteredWinnerHistory = useMemo(() => {
        const keyword =
            winnerHistorySearch.trim().toLowerCase();

        return latestWinners.filter((winner) => {
            const guest =
                winnerGuestByRegistrationId.get(
                    winner.registration_id
                );

            const searchableText = [
                winner.winner_name,
                winner.winner_email,
                winner.prize_name,
                winner.draw_round?.toString(),
                guest?.phone,
                guest?.department,
                ...Object.values(
                    guest?.custom_answers || {}
                ).flatMap((value) =>
                    normaliseAnswerValues(value)
                ),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (
                keyword &&
                !searchableText.includes(keyword)
            ) {
                return false;
            }

            if (
                !winnerFieldFilterKey ||
                !winnerFieldFilterValue
            ) {
                return true;
            }

            if (!guest) return false;

            const answerValues =
                normaliseAnswerValues(
                    getGuestAnswer(
                        guest,
                        winnerFieldFilterKey
                    )
                );

            if (
                winnerFieldFilterValue ===
                HAS_VALUE_FILTER
            ) {
                return answerValues.length > 0;
            }

            return answerValues.some(
                (value) =>
                    value.trim().toLowerCase() ===
                    winnerFieldFilterValue
                        .trim()
                        .toLowerCase()
            );
        });
    }, [
        latestWinners,
        winnerHistorySearch,
        winnerFieldFilterKey,
        winnerFieldFilterValue,
        winnerGuestByRegistrationId,
    ]);

    function exportWinnerHistoryToCsv() {
        if (filteredWinnerHistory.length === 0) {
            setMessage("There are no winner records to export.");
            return;
        }

        const header = [
            "Winner Name",
            "Winner Email",
            "Prize",
            "Won At",
        ];

        const rows = filteredWinnerHistory.map((winner) => {
            return [
                winner.winner_name || "",
                winner.winner_email || "",
                winner.prize_name || "",
                winner.created_at
                    ? new Date(
                          winner.created_at
                      ).toLocaleString("en-SG")
                    : "",
            ];
        });

        const csv = [
            header,
            ...rows,
        ]
            .map((row) =>
                row.map(escapeCsvCell).join(",")
            )
            .join("\r\n");

        const blob = new Blob(
            ["\uFEFF", csv],
            {
                type:
                    "text/csv;charset=utf-8;",
            }
        );

        const downloadUrl =
            URL.createObjectURL(blob);
        const anchor =
            document.createElement("a");
        const dateStamp = new Date()
            .toISOString()
            .slice(0, 10);

        anchor.href = downloadUrl;
        anchor.download = `${makeCsvFileName(
            eventName
        )}-lucky-draw-winners-${dateStamp}.csv`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(downloadUrl);

        setMessage(
            `Exported ${filteredWinnerHistory.length} winner record${
                filteredWinnerHistory.length === 1
                    ? ""
                    : "s"
            } to CSV.`
        );
    }

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
                winner_count: 1,
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
        setWinnerCountDraft(1);
        setNewPrizeName("");
        setMessage("Prize created. You can now select eligible guests for it.");
    }

    async function savePrizeWinnerCount() {
        if (!selectedPrize) {
            setMessage("Select a prize first.");
            return;
        }

        const nextCount = Math.max(
            1,
            Math.floor(Number(winnerCountDraft) || 1)
        );

        setSavingWinnerCount(true);
        setMessage("");

        const { error } = await supabase
            .from("lucky_draw_prizes")
            .update({
                winner_count: nextCount,
                updated_at: new Date().toISOString(),
            })
            .eq("id", selectedPrize.id)
            .eq("event_id", eventId);

        if (error) {
            setMessage(error.message);
            setSavingWinnerCount(false);
            return;
        }

        setPrizes((current) =>
            current.map((prize) =>
                prize.id === selectedPrize.id
                    ? { ...prize, winner_count: nextCount }
                    : prize
            )
        );
        setWinnerCountDraft(nextCount);
        setSavingWinnerCount(false);
        setMessage(
            `${selectedPrize.prize_name} will draw ${nextCount} winner${
                nextCount === 1 ? "" : "s"
            } per draw.`
        );
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

    async function updatePrizeEligibleIds(
        prizeId: string,
        ids: string[]
    ): Promise<boolean> {
        if (savingEligibility) return false;

        const uniqueIds = Array.from(
            new Set(
                ids
                    .filter(
                        (id): id is string =>
                            typeof id === "string" && id.trim().length > 0
                    )
                    .map((id) => id.trim())
            )
        );

        setSavingEligibility(true);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${encodeURIComponent(
                    eventId
                )}/lucky-draw/prizes/${encodeURIComponent(
                    prizeId
                )}/eligible-guests`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        registrationIds: uniqueIds,
                    }),
                }
            );

            const responseText = await response.text();
            let result: {
                error?: string;
                eligibleRegistrationIds?: string[];
            } = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `The eligibility API returned ${response.status} instead of JSON.`
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to save selected guests."
                );
            }

            const savedIds = Array.isArray(
                result.eligibleRegistrationIds
            )
                ? result.eligibleRegistrationIds.map(String)
                : uniqueIds;

            setPrizes((current) =>
                current.map((prize) =>
                    prize.id === prizeId
                        ? {
                              ...prize,
                              eligible_registration_ids: savedIds,
                          }
                        : prize
                )
            );

            setDraftEligibleIds(savedIds);
            return true;
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save selected guests."
            );
            return false;
        } finally {
            setSavingEligibility(false);
        }
    }

    function toggleGuestEligibility(registrationId: string) {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        setDraftEligibleIds((current) =>
            current.includes(registrationId)
                ? current.filter((id) => id !== registrationId)
                : [...current, registrationId]
        );

        setMessage(
            "Selection updated. Press Save Selected Guests to apply it to this prize."
        );
    }

    function selectFilteredGuestsForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        if (filteredGuests.length === 0) {
            setMessage("No guests match the current filter.");
            return;
        }

        if (newFilteredGuestIds.length === 0) {
            setMessage(
                "Everyone matching this filter is already in your current selection."
            );
            return;
        }

        setDraftEligibleIds((current) =>
            Array.from(new Set([...current, ...newFilteredGuestIds]))
        );

        setMessage(
            `${newFilteredGuestIds.length} guest${
                newFilteredGuestIds.length === 1 ? "" : "s"
            } added to your current selection. Change the filter to add another group, then save.`
        );
    }

    function useFilteredGuestsOnlyForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        if (filteredGuests.length === 0) {
            setMessage("No guests match the current filter.");
            return;
        }

        const filteredIds = filteredGuests.map((guest) => guest.id);

        setDraftEligibleIds(Array.from(new Set(filteredIds)));

        setMessage(
            `${filteredIds.length} filtered guest${
                filteredIds.length === 1 ? "" : "s"
            } now make up the full selection for ${selectedPrize.prize_name}. Press Save Selected to apply it.`
        );
    }

    function clearSelectedGuestsForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        setDraftEligibleIds([]);
        setMessage(
            `No restricted guests are selected. Saving this will open ${selectedPrize.prize_name} to all checked-in guests.`
        );
    }

    async function saveSelectedGuestsForPrize() {
        if (!selectedPrize) {
            setMessage("Select or create a prize first.");
            return;
        }

        const saved = await updatePrizeEligibleIds(
            selectedPrize.id,
            draftEligibleIds
        );

        if (!saved) return;

        if (draftEligibleIds.length === 0) {
            setMessage(
                `${selectedPrize.prize_name} is now open to all checked-in guests.`
            );
            return;
        }

        setMessage(
            `${draftEligibleIds.length} guest${
                draftEligibleIds.length === 1 ? "" : "s"
            } saved for ${selectedPrize.prize_name}.`
        );
    }

    async function saveWinners(
        winningGuests: CheckedInGuest[],
        drawRound: number
    ) {
        if (!selectedPrize || winningGuests.length === 0) {
            return false;
        }

        const payload = winningGuests.map((winner) => ({
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
            .insert(payload)
            .select("*");

        if (error) {
            setMessage(error.message);
            return false;
        }

        const savedWinners = (data || []) as Winner[];

        setWinners((current) => [...savedWinners, ...current]);
        setSelectedWinners(winningGuests);

        const winnerNames = winningGuests
            .map((winner) => winner.full_name || "Guest")
            .join(", ");

        setMessage(
            `${winnerNames} won ${selectedPrize.prize_name}.`
        );

        return true;
    }

    async function startLiveDraw() {
        if (spinning) return;

        setMessage("");
        setSelectedWinners([]);

        if (!selectedPrize) {
            setMessage("Create or select a prize first.");
            return;
        }

        const winnerCount = Math.max(
            1,
            Math.floor(
                Number(selectedPrize.winner_count || winnerCountDraft || 1)
            )
        );

        if (eligibleGuests.length === 0) {
            setMessage(
                "No eligible checked-in guests are available for this prize. Add previous winners back or change the eligible group."
            );
            return;
        }

        if (eligibleGuests.length < winnerCount) {
            setMessage(
                `This prize needs ${winnerCount} winner${
                    winnerCount === 1 ? "" : "s"
                }, but only ${eligibleGuests.length} eligible guest${
                    eligibleGuests.length === 1 ? " is" : "s are"
                } available.`
            );
            return;
        }

        const winningGuests = pickRandomGuests(eligibleGuests, winnerCount);
        const drawRound =
            winners.reduce(
                (highest, winner) =>
                    Math.max(highest, Number(winner.draw_round || 0)),
                0
            ) + 1;

        const durationMs = 5200;
        const guestNames = eligibleGuests.map(
            (guest) => guest.full_name || "Unnamed Guest"
        );
        const winnerNames = winningGuests.map(
            (guest) => guest.full_name || "Unnamed Guest"
        );

        if (shuffleIntervalRef.current !== null) {
            window.clearInterval(shuffleIntervalRef.current);
        }

        if (drawTimeoutRef.current !== null) {
            window.clearTimeout(drawTimeoutRef.current);
        }

        const drawId = `${eventId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        const initialDisplayNames = pickRandomNames(
            guestNames,
            winnerCount
        );

        setShufflePreview(initialDisplayNames);
        setSpinning(true);

        // Give Supabase Realtime a brief moment to finish subscribing.
        // This prevents the audience display from missing the first draw.
        for (
            let attempt = 0;
            attempt < 20 && !liveDrawChannelReadyRef.current;
            attempt += 1
        ) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
        }

        const broadcastResult = await liveDrawChannelRef.current?.send({
            type: "broadcast",
            event: "draw-start",
            payload: {
                drawId,
                prizeId: selectedPrize.id,
                prizeName: selectedPrize.prize_name,
                winnerCount,
                drawRound,
                durationMs,
                guestNames,
                winnerNames,
                displayNames: initialDisplayNames,
            },
        });

        if (
            broadcastResult &&
            broadcastResult !== "ok"
        ) {
            setMessage(
                "The draw started, but the audience display did not confirm the live connection. Keep the audience page open and refresh it before the next draw."
            );
        }

        shuffleIntervalRef.current = window.setInterval(() => {
            const nextDisplayNames = pickRandomNames(
                guestNames,
                winnerCount
            );

            setShufflePreview(nextDisplayNames);

            void liveDrawChannelRef.current?.send({
                type: "broadcast",
                event: "draw-frame",
                payload: {
                    drawId,
                    names: nextDisplayNames,
                },
            });
        }, 90);

        drawTimeoutRef.current = window.setTimeout(async () => {
            if (shuffleIntervalRef.current !== null) {
                window.clearInterval(shuffleIntervalRef.current);
                shuffleIntervalRef.current = null;
            }

            const finalWinnerNames = winningGuests.map(
                (winner) =>
                    winner.full_name || "Unnamed Guest"
            );

            setShufflePreview(finalWinnerNames);

            await liveDrawChannelRef.current?.send({
                type: "broadcast",
                event: "draw-finish",
                payload: {
                    drawId,
                    names: finalWinnerNames,
                },
            });

            await saveWinners(winningGuests, drawRound);
            setSpinning(false);
            drawTimeoutRef.current = null;
        }, durationMs);
    }

    async function reloadWinnerHistory() {
        const { data, error } = await supabase
            .from("lucky_draw_winners")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        setWinners((data || []) as Winner[]);
    }

    async function addWinnerBack(winner: Winner) {
        if (
            !winner.registration_id ||
            !excludedWinnerRegistrationIds.has(winner.registration_id)
        ) {
            return;
        }

        setRestoringRegistrationId(winner.registration_id);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${encodeURIComponent(
                    eventId
                )}/lucky-draw/winners/add-back`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        registrationId: winner.registration_id,
                    }),
                }
            );

            const responseText = await response.text();
            let result: {
                error?: string;
                updatedCount?: number;
            } = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `The add-back API returned ${response.status} instead of JSON.`
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to add this winner back."
                );
            }

            if (Number(result.updatedCount || 0) === 0) {
                throw new Error(
                    "No winner record was updated. Check that this winner belongs to the current event."
                );
            }

            // Reload from the database so every historical row for this
            // registration is confirmed as restored.
            await reloadWinnerHistory();

            setMessage(
                `${winner.winner_name || "Guest"} has been added back to the draw. Winner history remains saved.`
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to add this winner back."
            );
        } finally {
            setRestoringRegistrationId(null);
        }
    }

    async function addAllWinnersBack() {
        const activeRegistrationIds = Array.from(
            excludedWinnerRegistrationIds
        );

        if (activeRegistrationIds.length === 0) {
            setMessage("All previous winners are already back in the draw.");
            return;
        }

        const confirmed = window.confirm(
            `Add ${activeRegistrationIds.length} previous winner${
                activeRegistrationIds.length === 1 ? "" : "s"
            } back to the draw? Their full winner history will remain.`
        );

        if (!confirmed) return;

        setAddingAllWinnersBack(true);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${encodeURIComponent(
                    eventId
                )}/lucky-draw/winners/add-back`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        addAll: true,
                    }),
                }
            );

            const responseText = await response.text();
            let result: {
                error?: string;
                updatedCount?: number;
            } = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `The add-back API returned ${response.status} instead of JSON.`
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to add all winners back."
                );
            }

            if (Number(result.updatedCount || 0) === 0) {
                throw new Error(
                    "No excluded winner records were found for this event."
                );
            }

            // Reload the complete history so the UI reflects the database
            // state and every past winner becomes eligible again.
            await reloadWinnerHistory();

            setMessage(
                "All previous winners have been added back to the draw. Their history remains saved."
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to add all winners back."
            );
        } finally {
            setAddingAllWinnersBack(false);
        }
    }


    const liveMachineNames = shufflePreview
        .map((name) => String(name || "").trim())
        .filter(Boolean);
    const liveMachineLayout = getLiveDrawLayout(
        liveMachineNames.length
    );
    const liveMachineColumns = Math.max(
        1,
        Math.min(10, liveMachineNames.length)
    );
    const liveMachineRemainder =
        liveMachineNames.length % liveMachineColumns;
    const liveMachineLastRowStart =
        liveMachineRemainder === 0
            ? -1
            : liveMachineNames.length -
              liveMachineRemainder;
    const liveMachineCenteredColumn =
        liveMachineRemainder === 0
            ? undefined
            : Math.floor(
                  (liveMachineColumns -
                      liveMachineRemainder) /
                      2
              ) + 1;
    const liveMachineGridStyle = {
        gridTemplateColumns: `repeat(${liveMachineColumns}, minmax(0, 1fr))`,
    };

    return (
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Sparkles size={16} />
                            Live Name Shuffle
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                            Draw Winners Live
                        </h2>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            {eventName}
                        </p>

                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                            Eligible guest names shuffle live on the admin and audience screens before all selected winners are revealed together.
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
                                setSelectedWinners([]);
                                setShufflePreview([]);
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

                    {selectedPrize && (
                        <div className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <label
                                        htmlFor="winner-count"
                                        className="block text-sm font-black text-slate-700"
                                    >
                                        Number of winners for this prize
                                    </label>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                        Enter any quantity. A draw can only proceed when enough eligible guests are available.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        id="winner-count"
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={winnerCountDraft}
                                        onChange={(event) =>
                                            setWinnerCountDraft(
                                                Math.max(
                                                    1,
                                                    Math.floor(
                                                        Number(event.target.value) || 1
                                                    )
                                                )
                                            )
                                        }
                                        className="h-12 w-24 rounded-2xl border border-slate-200 bg-white px-4 text-center text-base font-black outline-none transition focus:border-[#4F46E5]"
                                    />
                                    <button
                                        type="button"
                                        onClick={savePrizeWinnerCount}
                                        disabled={savingWinnerCount}
                                        className="h-12 rounded-2xl bg-[#4F46E5] px-5 text-sm font-black text-white transition hover:bg-[#4338CA] disabled:opacity-50"
                                    >
                                        {savingWinnerCount ? "Saving..." : "Save Qty"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
                    <div className="w-full overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 p-5 shadow-2xl sm:p-7">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                                    <Sparkles
                                        size={14}
                                        className={spinning ? "animate-pulse" : ""}
                                    />
                                    {spinning ? "Live Draw Running" : "Live Draw Machine"}
                                </div>

                                <h3 className="mt-4 text-2xl font-black text-white sm:text-3xl">
                                    {selectedPrize?.prize_name || "Select a prize"}
                                </h3>

                                <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
                                    {selectedPrize
                                        ? `${Math.max(
                                              1,
                                              Number(
                                                  selectedPrize.winner_count || 1
                                              )
                                          )} winner${
                                              Math.max(
                                                  1,
                                                  Number(
                                                      selectedPrize.winner_count || 1
                                                  )
                                              ) === 1
                                                  ? ""
                                                  : "s"
                                          } will be revealed together.`
                                        : "Choose a prize before starting the live draw."}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white/80">
                                {eligibleGuests.length} eligible
                            </div>
                        </div>

                        <div className="relative mt-6 min-h-[250px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 px-3 py-5 sm:px-4 md:px-6">
                            <div className="pointer-events-none absolute left-[-20%] top-[-80%] h-[520px] w-[520px] rounded-full bg-[#4F46E5]/30 blur-3xl" />
                            <div className="pointer-events-none absolute bottom-[-100%] right-[-20%] h-[580px] w-[580px] rounded-full bg-[#EC4899]/25 blur-3xl" />

                            {liveMachineNames.length > 0 ? (
                                <div
                                    className={`relative z-10 mx-auto grid w-full ${liveMachineLayout.maxWidthClass} ${liveMachineLayout.gapClass}`}
                                    style={liveMachineGridStyle}
                                >
                                    {liveMachineNames.map(
                                        (name, index) => (
                                            <div
                                                key={`${name}-${index}`}
                                                className={`flex items-center justify-center border border-white/15 bg-white/10 text-center shadow-xl backdrop-blur-xl ${liveMachineLayout.cardClass}`}
                                                style={
                                                    index ===
                                                        liveMachineLastRowStart &&
                                                    liveMachineCenteredColumn
                                                        ? {
                                                              gridColumnStart:
                                                                  liveMachineCenteredColumn,
                                                          }
                                                        : undefined
                                                }
                                            >
                                                <span
                                                    className={`break-words font-black leading-tight tracking-tight text-white ${liveMachineLayout.nameClass} ${
                                                        spinning
                                                            ? "animate-pulse"
                                                            : ""
                                                    }`}
                                                >
                                                    {name}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="relative z-10 flex min-h-[220px] items-center justify-center text-center">
                                    <p className="max-w-md text-sm font-bold leading-6 text-white/40">
                                        Names will appear here when the live draw starts.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={startLiveDraw}
                        disabled={
                            spinning ||
                            !selectedPrize ||
                            eligibleGuests.length === 0
                        }
                        className="mt-8 inline-flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-8 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Sparkles
                            size={18}
                            className={spinning ? "animate-pulse" : ""}
                        />
                        {spinning
                            ? "Drawing Winners Live..."
                            : selectedPrize
                              ? `Start Live Draw for ${Math.max(
                                    1,
                                    Number(selectedPrize.winner_count || 1)
                                )} Winner${
                                    Math.max(
                                        1,
                                        Number(selectedPrize.winner_count || 1)
                                    ) === 1
                                        ? ""
                                        : "s"
                                }`
                              : "Select a Prize"}
                    </button>

                    {message && (
                        <div className="mt-5 w-full rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-5 text-sm font-bold text-[#4F46E5]">
                            {message}
                        </div>
                    )}

                    {selectedWinners.length > 0 && selectedPrize && (
                        <div className="mt-6 w-full rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6">
                            <div className="text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-600 shadow-sm">
                                    <Trophy size={32} />
                                </div>

                                <p className="mt-4 text-sm font-black uppercase tracking-[0.25em] text-emerald-700">
                                    {selectedWinners.length === 1
                                        ? "Winner"
                                        : `${selectedWinners.length} Winners`}
                                </p>

                                <p className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-700">
                                    {selectedPrize.prize_name}
                                </p>
                            </div>

                            <div
                                className={`mt-5 grid gap-3 ${
                                    selectedWinners.length === 1
                                        ? "grid-cols-1"
                                        : "sm:grid-cols-2"
                                }`}
                            >
                                {selectedWinners.map((winner, index) => (
                                    <div
                                        key={winner.id}
                                        className="rounded-2xl bg-white p-4 text-center shadow-sm"
                                    >
                                        <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                                            Winner {index + 1}
                                        </p>
                                        <h3 className="mt-2 text-xl font-black text-emerald-900">
                                            {winner.full_name || "Unnamed Guest"}
                                        </h3>
                                        <p className="mt-1 break-all text-sm font-semibold text-emerald-700">
                                            {winner.email || "No email"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Users size={16} />
                            Prize Eligibility
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                            Select Guests for Each Prize
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Choose the prize you are configuring, select guests
                            across one or more filters, then save the complete
                            selection for that prize.
                        </p>
                    </div>

                    <div className="mt-5">
                        <label
                            htmlFor="eligibility-prize"
                            className="mb-2 block text-sm font-black text-slate-700"
                        >
                            Prize to configure
                        </label>

                        <select
                            id="eligibility-prize"
                            value={selectedPrizeId}
                            onChange={(event) => {
                                setSelectedPrizeId(event.target.value);
                                setMessage("");
                            }}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black outline-none transition focus:border-[#4F46E5]"
                        >
                            <option value="">Select prize</option>

                            {prizes.map((prize) => {
                                const count = Array.isArray(
                                    prize.eligible_registration_ids
                                )
                                    ? prize.eligible_registration_ids.length
                                    : 0;

                                return (
                                    <option key={prize.id} value={prize.id}>
                                        {prize.prize_order}. {prize.prize_name} —{" "}
                                        {count === 0
                                            ? "All guests"
                                            : `${count} saved`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {selectedPrize && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-4">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    Saved for prize
                                </p>
                                <p className="mt-2 text-2xl font-black text-[#4F46E5]">
                                    {selectedPrizeEligibleIds.length}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {selectedPrizeEligibleIds.length === 0
                                        ? "All guests are eligible"
                                        : "Restricted guest list"}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600">
                                    Selected now
                                </p>
                                <p className="mt-2 text-2xl font-black text-emerald-700">
                                    {draftEligibleIds.length}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-emerald-700/70">
                                    {hasUnsavedEligibilityChanges
                                        ? "Not saved yet"
                                        : "Matches saved list"}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    Current filter
                                </p>
                                <p className="mt-2 text-2xl font-black text-slate-950">
                                    {filteredGuests.length}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {newFilteredGuestIds.length} new to add
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={useFilteredGuestsOnlyForPrize}
                            disabled={
                                savingEligibility ||
                                !selectedPrize ||
                                filteredGuests.length === 0
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-4 text-sm font-black text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Filter size={16} />
                            Use Filter Only ({filteredGuests.length})
                        </button>

                        <button
                            type="button"
                            onClick={selectFilteredGuestsForPrize}
                            disabled={
                                savingEligibility ||
                                !selectedPrize ||
                                filteredGuests.length === 0 ||
                                newFilteredGuestIds.length === 0
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Plus size={16} />
                            Add Filtered ({newFilteredGuestIds.length})
                        </button>

                        <button
                            type="button"
                            onClick={clearSelectedGuestsForPrize}
                            disabled={savingEligibility || !selectedPrize}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Open to All Guests
                        </button>

                        <button
                            type="button"
                            onClick={() => void saveSelectedGuestsForPrize()}
                            disabled={savingEligibility || !selectedPrize}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <CheckCircle2
                                size={17}
                                className={
                                    savingEligibility ? "animate-pulse" : ""
                                }
                            />
                            {savingEligibility
                                ? "Saving..."
                                : draftEligibleIds.length === 0
                                  ? "Save: Open to All Guests"
                                  : `Save Selected (${draftEligibleIds.length})`}
                        </button>
                    </div>

                    {selectedPrize && !hasUnsavedEligibilityChanges && (
                        <p className="mt-3 text-center text-xs font-bold text-slate-400">
                            The current selection already matches the saved list.
                            You can still press Save Selected again.
                        </p>
                    )}

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
                                    draftEligibleIdSet.has(guest.id);

                                const alreadyWon = excludedWinnerRegistrationIds.has(guest.id);

                                const selectedFieldAnswer = fieldFilterKey
                                    ? displayAnswerValue(
                                          getGuestAnswer(guest, fieldFilterKey)
                                      )
                                    : "";

                                return (
                                    <button
                                        key={guest.id}
                                        type="button"
                                        onClick={() =>
                                            toggleGuestEligibility(guest.id)
                                        }
                                        disabled={savingEligibility}
                                        className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-wait disabled:opacity-60 ${
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

                                            <p
                                                className={`mt-2 text-xs font-black ${
                                                    selected
                                                        ? "text-emerald-600"
                                                        : "text-slate-400"
                                                }`}
                                            >
                                                {selected
                                                    ? "Selected — save to apply"
                                                    : "Not selected"}
                                            </p>
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
                                Every winner remains listed here. Their name is removed from future draws after winning, and you can add them back without deleting their history.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-black text-[#4F46E5]">
                                    {latestWinners.length} total winner record
                                    {latestWinners.length === 1 ? "" : "s"}
                                </span>

                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                                    {excludedWinnerRegistrationIds.size} currently removed
                                </span>
                            </div>
                        </div>

                        {winners.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={exportWinnerHistoryToCsv}
                                    disabled={
                                        filteredWinnerHistory.length === 0
                                    }
                                    className="inline-flex items-center gap-2 rounded-2xl bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5] transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <Download size={16} />
                                    Export CSV (
                                    {filteredWinnerHistory.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={addAllWinnersBack}
                                    disabled={
                                        addingAllWinnersBack ||
                                        excludedWinnerRegistrationIds.size === 0
                                    }
                                    className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {addingAllWinnersBack
                                        ? "Adding Back..."
                                        : `Add All Back (${excludedWinnerRegistrationIds.size})`}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative mt-5">
                        <Search
                            size={17}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={winnerHistorySearch}
                            onChange={(event) =>
                                setWinnerHistorySearch(event.target.value)
                            }
                            placeholder="Search winner name, email, prize or draw round..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                            <Filter
                                size={16}
                                className="text-[#4F46E5]"
                            />
                            Filter by Registration Answer
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <select
                                value={winnerFieldFilterKey}
                                onChange={(event) => {
                                    setWinnerFieldFilterKey(
                                        event.target.value
                                    );
                                    setWinnerFieldFilterValue("");
                                }}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                            >
                                <option value="">
                                    No field filter
                                </option>

                                {availableFilterFields.map(
                                    (field) => (
                                        <option
                                            key={
                                                field.id ||
                                                field.field_key
                                            }
                                            value={
                                                field.field_key
                                            }
                                        >
                                            {
                                                field.field_label
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <select
                                value={winnerFieldFilterValue}
                                onChange={(event) =>
                                    setWinnerFieldFilterValue(
                                        event.target.value
                                    )
                                }
                                disabled={!winnerFieldFilterKey}
                                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">
                                    Select value
                                </option>
                                <option value={HAS_VALUE_FILTER}>
                                    Has any value
                                </option>

                                {winnerFieldFilterOptions.map(
                                    (value) => (
                                        <option
                                            key={value}
                                            value={value}
                                        >
                                            {value}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {(winnerFieldFilterKey ||
                            winnerFieldFilterValue) && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs font-bold text-slate-500">
                                    Showing{" "}
                                    <span className="font-black text-[#4F46E5]">
                                        {
                                            filteredWinnerHistory.length
                                        }
                                    </span>{" "}
                                    matching winner record
                                    {filteredWinnerHistory.length ===
                                    1
                                        ? ""
                                        : "s"}
                                    .
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setWinnerFieldFilterKey(
                                            ""
                                        );
                                        setWinnerFieldFilterValue(
                                            ""
                                        );
                                    }}
                                    className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-500">
                        The CSV export uses the current winner filters.
                    </p>

                    {hasWinnerHistoryFilters && (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                            Showing{" "}
                            <span className="font-black text-[#4F46E5]">
                                {filteredWinnerHistory.length}
                            </span>{" "}
                            of {latestWinners.length} winner record
                            {latestWinners.length === 1 ? "" : "s"}.
                        </p>
                    )}

                    <div className="mt-4 space-y-3">
                        {filteredWinnerHistory.length > 0 ? (
                            filteredWinnerHistory.map((winner) => { 
                                const originalIndex = latestWinners.findIndex(
                                    (item) => item.id === winner.id
                                );
                                const isStillExcluded =
                                    excludedWinnerRegistrationIds.has(
                                        winner.registration_id
                                    );
                                const isRestoring =
                                    restoringRegistrationId ===
                                    winner.registration_id;

                                return (
                                <div
                                    key={winner.id}
                                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-sm font-black text-[#4F46E5]">
                                            #{latestWinners.length - originalIndex}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-slate-950">
                                                {winner.winner_name || "Unnamed Guest"}
                                            </p>

                                            <p className="break-all text-sm font-semibold text-slate-500">
                                                {winner.winner_email || "No email"}
                                            </p>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                                                    <Gift size={13} />
                                                    {winner.prize_name || "Prize"}
                                                </p>

                                                {isStillExcluded ? (
                                                    <>
                                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                                                            Removed from draw
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void addWinnerBack(
                                                                    winner
                                                                )
                                                            }
                                                            disabled={
                                                                isRestoring ||
                                                                addingAllWinnersBack
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#4F46E5] transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50"
                                                        >
                                                            <UserPlus
                                                                size={13}
                                                                className={
                                                                    isRestoring
                                                                        ? "animate-pulse"
                                                                        : ""
                                                                }
                                                            />
                                                            {isRestoring
                                                                ? "Adding Back..."
                                                                : "Add Back to Draw"}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                                                        Back in draw
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-2 text-xs font-bold text-slate-400">
                                                Draw round {winner.draw_round || "-"}
                                                {winner.created_at
                                                    ? ` • ${new Date(
                                                          winner.created_at
                                                      ).toLocaleString(
                                                          "en-SG"
                                                      )}`
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        ) : latestWinners.length === 0 ? (
                            <EmptyBox text="No winners drawn yet." />
                        ) : (
                            <EmptyBox text="No winner history matches the selected filters." />
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
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

function pickRandomNames(names: string[], count: number): string[] {
    if (names.length === 0) {
        return Array.from({ length: count }, () => "Waiting...");
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
        // Legacy combined values are treated as Department only.
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
            "Department",
            "department_outlet",
            "departmentOutlet",
            "department / outlet",
        ];
    }

    if (normalisedKey === "outlet" || normalisedKey === "outletname") {
        return [
            fieldKey,
            "outlet",
            "outlet_name",
            "outletName",
            "Outlet",
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

    if (combined.includes("requiretransport") || combined.includes("transport")) {
        return "requiretransport";
    }

    if (combined.includes("departmentoutlet")) {
        return "department";
    }

    if (combined.includes("department")) {
        return "department";
    }

    if (combined.includes("outlet")) {
        return "outlet";
    }

    if (combined.includes("dietary")) {
        return "dietaryrequirements";
    }

    return (
        normaliseFilterText(field.field_label) ||
        normaliseFilterText(field.field_key)
    );
}

function getFilterDisplayLabel(field: RegistrationField) {
    const groupKey = getFilterGroupKey(field);

    if (groupKey === "department") {
        return "Department";
    }

    if (groupKey === "outlet") {
        return "Outlet";
    }

    if (groupKey === "dietaryrequirements") {
        return "Dietary Requirements";
    }

    if (groupKey === "requiretransport") {
        return "Transport Required";
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
"use client";

import {
    CheckCircle2,
    Clock3,
    Loader2,
    Mail,
    MailCheck,
    MailOpen,
    Pencil,
    RefreshCw,
    Save,
    Search,
    Send,
    Trash2,
    UserMinus,
    Users,
    X,
    XCircle,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type InvitationStatus =
    | "not_invited"
    | "pending"
    | "opened"
    | "accepted"
    | "declined"
    | "cancelled"
    | "expired";

type InvitationRecord = {
    id: string;
    registration_id: string;
    status: InvitationStatus;
    sent_at: string | null;
    opened_at: string | null;
    responded_at: string | null;
    expires_at: string | null;
    decline_reason: string | null;
};

type GuestRow = {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    department: string | null;
    dietary_request: string | null;
    selected_ticket_quantity:
        | number
        | null;
    registration_status: string | null;
    rsvp_status: InvitationStatus;
    invitation_sent_at: string | null;
    invitation_opened_at: string | null;
    rsvp_responded_at: string | null;
    created_at: string | null;
    invitation: InvitationRecord | null;
};

type Payload = {
    event: {
        id: string;
        event_name: string;
        event_slug: string;
        event_date: string | null;
        event_time: string | null;
        venue: string | null;
    };
    stats: {
        total: number;
        notInvited: number;
        pending: number;
        accepted: number;
        declined: number;
    };
    guests: GuestRow[];
};

type EditGuestDraft = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    dietaryRequest: string;
    partySize: string;
};

type Filter =
    | "all"
    | InvitationStatus;

async function readJson(response: Response) {
    const text = await response.text();

    if (!text.trim()) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error:
                text ||
                "The server returned an invalid response.",
        };
    }
}

function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function InvitationManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] =
        useState<Filter>("all");
    const [selected, setSelected] = useState<
        string[]
    >([]);
    const [
        editingGuest,
        setEditingGuest,
    ] = useState<EditGuestDraft | null>(
        null,
    );
    const [
        deletingGuestId,
        setDeletingGuestId,
    ] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(
                `/api/events/${eventId}/invitations`,
                {
                    cache: "no-store",
                },
            );

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to load invitations.",
                );
            }

            setData(result as Payload);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load invitations.",
            );
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        function handleImportedGuests(
            event: Event,
        ) {
            const detail =
                (
                    event as CustomEvent<{
                        registrationIds?: string[];
                    }>
                ).detail;
            const registrationIds =
                Array.isArray(
                    detail
                        ?.registrationIds,
                )
                    ? detail.registrationIds
                    : [];

            setSelected(
                registrationIds,
            );
            setFilter(
                "all",
            );
            setQuery(
                "",
            );
            void reload();
        }

        window.addEventListener(
            "regigo:invitations-imported",
            handleImportedGuests,
        );

        return () => {
            window.removeEventListener(
                "regigo:invitations-imported",
                handleImportedGuests,
            );
        };
    }, [reload]);

    const filteredGuests = useMemo(() => {
        if (!data) return [];

        const cleanQuery =
            query.trim().toLowerCase();

        return data.guests.filter((guest) => {
            const status =
                guest.invitation?.status ||
                guest.rsvp_status ||
                "not_invited";

            const matchesFilter =
                filter === "all" ||
                status === filter;

            const matchesQuery =
                !cleanQuery ||
                [
                    guest.full_name,
                    guest.email,
                    guest.department,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(cleanQuery);

            return matchesFilter && matchesQuery;
        });
    }, [data, filter, query]);

    const allVisibleSelected =
        filteredGuests.length > 0 &&
        filteredGuests.every((guest) =>
            selected.includes(guest.id),
        );

    function toggleAll() {
        if (allVisibleSelected) {
            const visible = new Set(
                filteredGuests.map(
                    (guest) => guest.id,
                ),
            );

            setSelected((current) =>
                current.filter(
                    (id) => !visible.has(id),
                ),
            );
            return;
        }

        setSelected((current) =>
            Array.from(
                new Set([
                    ...current,
                    ...filteredGuests.map(
                        (guest) => guest.id,
                    ),
                ]),
            ),
        );
    }

    function toggleGuest(id: string) {
        setSelected((current) =>
            current.includes(id)
                ? current.filter(
                      (item) => item !== id,
                  )
                : [...current, id],
        );
    }

    async function runAction(
        action: "send" | "remind" | "cancel",
    ) {
        if (selected.length === 0) {
            setMessage(
                "Select at least one guest.",
            );
            return;
        }

        if (
            action === "cancel" &&
            !window.confirm(
                "Cancel the selected pending invitations?",
            )
        ) {
            return;
        }

        setWorking(action);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/invitations`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        action,
                        registrationIds: selected,
                    }),
                },
            );

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to manage invitations.",
                );
            }

            setMessage(
                result.message ||
                    "Invitation action completed.",
            );
            setSelected([]);
            await reload();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to manage invitations.",
            );
        } finally {
            setWorking("");
        }
    }

    function openEdit(
        guest: GuestRow,
    ) {
        setEditingGuest({
            id:
                guest.id,
            fullName:
                guest.full_name ||
                "",
            email:
                guest.email ||
                "",
            phone:
                guest.phone ||
                "",
            department:
                guest.department ||
                "",
            dietaryRequest:
                guest.dietary_request ||
                "",
            partySize:
                String(
                    Math.max(
                        1,
                        Number(
                            guest.selected_ticket_quantity ||
                                1,
                        ),
                    ),
                ),
        });
        setMessage(
            "",
        );
    }

    async function saveEditedGuest() {
        if (!editingGuest) {
            return;
        }

        setWorking(
            `edit:${editingGuest.id}`,
        );
        setMessage(
            "",
        );

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/invitations/guests`,
                    {
                        method:
                            "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                registrationId:
                                    editingGuest.id,
                                fullName:
                                    editingGuest.fullName,
                                email:
                                    editingGuest.email,
                                phone:
                                    editingGuest.phone,
                                department:
                                    editingGuest.department,
                                dietaryRequest:
                                    editingGuest.dietaryRequest,
                                quantity:
                                    Number(
                                        editingGuest.partySize,
                                    ) ||
                                    1,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to update the guest.",
                );
            }

            setEditingGuest(
                null,
            );
            setMessage(
                result.message ||
                    "Guest details updated.",
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to update the guest.",
            );
        } finally {
            setWorking(
                "",
            );
        }
    }

    async function deleteGuest(
        guest: GuestRow,
    ) {
        const invitationStatus =
            guest.invitation
                ?.status ||
            guest.rsvp_status ||
            "not_invited";
        const warning =
            invitationStatus ===
            "accepted"
                ? `Delete ${guest.full_name}? This guest has accepted the invitation. Their invitation and event registration will be permanently removed.`
                : `Delete ${guest.full_name}? Their invitation and event registration will be permanently removed.`;

        if (
            !window.confirm(
                warning,
            )
        ) {
            return;
        }

        setDeletingGuestId(
            guest.id,
        );
        setMessage(
            "",
        );

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/invitations/guests`,
                    {
                        method:
                            "DELETE",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                registrationId:
                                    guest.id,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to delete the guest.",
                );
            }

            setSelected(
                (
                    current,
                ) =>
                    current.filter(
                        (
                            id,
                        ) =>
                            id !==
                            guest.id,
                    ),
            );
            setMessage(
                result.message ||
                    "Guest deleted.",
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to delete the guest.",
            );
        } finally {
            setDeletingGuestId(
                "",
            );
        }
    }

    if (loading && !data) {
        return (
            <div className="flex min-h-[380px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <div className="flex items-center gap-3 font-black text-slate-500">
                    <Loader2
                        size={20}
                        className="animate-spin"
                    />
                    Loading invitations...
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-700">
                <p className="font-black">
                    Invitations could not be
                    loaded.
                </p>
                <p className="mt-2 text-sm">
                    {message}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat
                    label="Total Guests"
                    value={data.stats.total}
                    icon={Users}
                />
                <Stat
                    label="Not Invited"
                    value={data.stats.notInvited}
                    icon={Mail}
                />
                <Stat
                    label="Awaiting RSVP"
                    value={data.stats.pending}
                    icon={Clock3}
                />
                <Stat
                    label="Accepted"
                    value={data.stats.accepted}
                    icon={CheckCircle2}
                />
                <Stat
                    label="Declined"
                    value={data.stats.declined}
                    icon={XCircle}
                />
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
                    {message}
                </div>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
                    <label className="relative">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={query}
                            onChange={(event) =>
                                setQuery(
                                    event.target.value,
                                )
                            }
                            placeholder="Search guest name, email or department"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-[#4F46E5] focus:bg-white"
                        />
                    </label>

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(
                                event.target
                                    .value as Filter,
                            )
                        }
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-[#4F46E5]"
                    >
                        <option value="all">
                            All RSVP statuses
                        </option>
                        <option value="not_invited">
                            Not invited
                        </option>
                        <option value="pending">
                            Pending
                        </option>
                        <option value="opened">
                            Opened
                        </option>
                        <option value="accepted">
                            Accepted
                        </option>
                        <option value="declined">
                            Declined
                        </option>
                        <option value="cancelled">
                            Cancelled
                        </option>
                        <option value="expired">
                            Expired
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={() => void reload()}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        Refresh
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        {selected.length} selected
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            void runAction("send")
                        }
                        disabled={Boolean(working)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"
                    >
                        {working === "send" ? (
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                        ) : (
                            <Send size={16} />
                        )}
                        Send Invitations
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void runAction("remind")
                        }
                        disabled={Boolean(working)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3 text-sm font-black text-[#4F46E5] disabled:opacity-50"
                    >
                        {working === "remind" ? (
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                        ) : (
                            <MailOpen size={16} />
                        )}
                        Send Reminders
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void runAction("cancel")
                        }
                        disabled={Boolean(working)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 disabled:opacity-50"
                    >
                        {working === "cancel" ? (
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                        ) : (
                            <UserMinus size={16} />
                        )}
                        Cancel Pending
                    </button>
                </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-[1180px] w-full">
                        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4">
                                    <input
                                        type="checkbox"
                                        checked={
                                            allVisibleSelected
                                        }
                                        onChange={toggleAll}
                                        className="h-4 w-4 accent-[#4F46E5]"
                                    />
                                </th>
                                <th className="px-5 py-4">
                                    Guest
                                </th>
                                <th className="px-5 py-4">
                                    Party Size
                                </th>
                                <th className="px-5 py-4">
                                    RSVP
                                </th>
                                <th className="px-5 py-4">
                                    Sent
                                </th>
                                <th className="px-5 py-4">
                                    Opened
                                </th>
                                <th className="px-5 py-4">
                                    Responded
                                </th>
                                <th className="px-5 py-4">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filteredGuests.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-5 py-14 text-center"
                                    >
                                        <MailCheck
                                            size={30}
                                            className="mx-auto text-slate-300"
                                        />
                                        <p className="mt-4 font-black text-slate-700">
                                            No matching
                                            guests
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.map(
                                    (guest) => {
                                        const status =
                                            guest
                                                .invitation
                                                ?.status ||
                                            guest.rsvp_status ||
                                            "not_invited";

                                        return (
                                            <tr
                                                key={
                                                    guest.id
                                                }
                                                className="text-sm"
                                            >
                                                <td className="px-5 py-5 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.includes(
                                                            guest.id,
                                                        )}
                                                        onChange={() =>
                                                            toggleGuest(
                                                                guest.id,
                                                            )
                                                        }
                                                        className="h-4 w-4 accent-[#4F46E5]"
                                                    />
                                                </td>
                                                <td className="px-5 py-5 align-top">
                                                    <p className="font-black text-slate-950">
                                                        {
                                                            guest.full_name
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                                        {
                                                            guest.email
                                                        }
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                                                        {guest.phone && (
                                                            <span>
                                                                {
                                                                    guest.phone
                                                                }
                                                            </span>
                                                        )}
                                                        {guest.department && (
                                                            <span>
                                                                {
                                                                    guest.department
                                                                }
                                                            </span>
                                                        )}
                                                        {guest.dietary_request && (
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                                                                {
                                                                    guest.dietary_request
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-5 align-top">
                                                    <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                                                        {Math.max(
                                                            1,
                                                            Number(
                                                                guest.selected_ticket_quantity ||
                                                                    1,
                                                            ),
                                                        )}
                                                    </span>
                                                    <p className="mt-2 max-w-32 text-xs leading-5 text-slate-400">
                                                        Includes the main guest.
                                                    </p>
                                                </td>
                                                <td className="px-5 py-5 align-top">
                                                    <StatusBadge
                                                        status={
                                                            status
                                                        }
                                                    />
                                                    {guest
                                                        .invitation
                                                        ?.decline_reason && (
                                                        <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                                                            {
                                                                guest
                                                                    .invitation
                                                                    .decline_reason
                                                            }
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 align-top font-semibold text-slate-600">
                                                    {formatDate(
                                                        guest
                                                            .invitation
                                                            ?.sent_at ||
                                                            guest.invitation_sent_at,
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 align-top font-semibold text-slate-600">
                                                    {formatDate(
                                                        guest
                                                            .invitation
                                                            ?.opened_at ||
                                                            guest.invitation_opened_at,
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 align-top font-semibold text-slate-600">
                                                    {formatDate(
                                                        guest
                                                            .invitation
                                                            ?.responded_at ||
                                                            guest.rsvp_responded_at,
                                                    )}
                                                </td>
                                                <td className="px-5 py-5 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEdit(
                                                                    guest,
                                                                )
                                                            }
                                                            disabled={
                                                                Boolean(
                                                                    working,
                                                                ) ||
                                                                Boolean(
                                                                    deletingGuestId,
                                                                )
                                                            }
                                                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-[#4F46E5] disabled:opacity-40"
                                                        >
                                                            <Pencil
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void deleteGuest(
                                                                    guest,
                                                                )
                                                            }
                                                            disabled={
                                                                Boolean(
                                                                    working,
                                                                ) ||
                                                                Boolean(
                                                                    deletingGuestId,
                                                                )
                                                            }
                                                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40"
                                                        >
                                                            {deletingGuestId ===
                                                            guest.id ? (
                                                                <Loader2
                                                                    size={
                                                                        14
                                                                    }
                                                                    className="animate-spin"
                                                                />
                                                            ) : (
                                                                <Trash2
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                            )}
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {editingGuest && (
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Edit invitation guest"
                >
                    <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-[2rem] sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-950">
                                    Edit Guest
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Update the guest information used by the invitation and event guest list.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setEditingGuest(
                                        null,
                                    )
                                }
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
                                aria-label="Close edit guest"
                            >
                                <X
                                    size={
                                        19
                                    }
                                />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <EditField
                                label="Full Name"
                                required
                                value={
                                    editingGuest.fullName
                                }
                                onChange={(
                                    value,
                                ) =>
                                    setEditingGuest({
                                        ...editingGuest,
                                        fullName:
                                            value,
                                    })
                                }
                            />

                            <EditField
                                label="Email"
                                required
                                type="email"
                                value={
                                    editingGuest.email
                                }
                                onChange={(
                                    value,
                                ) =>
                                    setEditingGuest({
                                        ...editingGuest,
                                        email:
                                            value,
                                    })
                                }
                            />

                            <EditField
                                label="Phone"
                                value={
                                    editingGuest.phone
                                }
                                onChange={(
                                    value,
                                ) =>
                                    setEditingGuest({
                                        ...editingGuest,
                                        phone:
                                            value,
                                    })
                                }
                            />

                            <EditField
                                label="Department"
                                value={
                                    editingGuest.department
                                }
                                onChange={(
                                    value,
                                ) =>
                                    setEditingGuest({
                                        ...editingGuest,
                                        department:
                                            value,
                                    })
                                }
                            />

                            <EditField
                                label="Dietary Requirements"
                                value={
                                    editingGuest.dietaryRequest
                                }
                                onChange={(
                                    value,
                                ) =>
                                    setEditingGuest({
                                        ...editingGuest,
                                        dietaryRequest:
                                            value,
                                    })
                                }
                            />

                            <EditField
                                label="Party Size"
                                helper="Total seats under this invitation, including the main guest. Use 1 for an individual invitation."
                                type="number"
                                min="1"
                                max="100"
                                value={
                                    editingGuest.partySize
                                }
                                onChange={(
                                    value,
                                ) =>
                                    setEditingGuest({
                                        ...editingGuest,
                                        partySize:
                                            value,
                                    })
                                }
                            />
                        </div>

                        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() =>
                                    setEditingGuest(
                                        null,
                                    )
                                }
                                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void saveEditedGuest()
                                }
                                disabled={
                                    working ===
                                    `edit:${editingGuest.id}`
                                }
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white disabled:opacity-60"
                            >
                                {working ===
                                `edit:${editingGuest.id}` ? (
                                    <Loader2
                                        size={
                                            18
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save
                                        size={
                                            18
                                        }
                                    />
                                )}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EditField({
    label,
    value,
    onChange,
    type = "text",
    required = false,
    min,
    max,
    helper,
}: {
    label: string;
    value: string;
    onChange:
        (
            value: string,
        ) => void;
    type?: string;
    required?: boolean;
    min?: string;
    max?: string;
    helper?: string;
}) {
    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {
                    label
                }
            </span>

            <input
                type={
                    type
                }
                value={
                    value
                }
                required={
                    required
                }
                min={
                    min
                }
                max={
                    max
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
            />

            {helper && (
                <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                    {
                        helper
                    }
                </span>
            )}
        </label>
    );
}

function Stat({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Users;
}) {
    return (
        <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon size={21} />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500">
                {label}
            </p>
            <p className="mt-1 text-3xl font-black">
                {value}
            </p>
        </div>
    );
}

function StatusBadge({
    status,
}: {
    status: InvitationStatus;
}) {
    const styles: Record<
        InvitationStatus,
        string
    > = {
        not_invited:
            "bg-slate-100 text-slate-600",
        pending:
            "bg-amber-50 text-amber-700",
        opened:
            "bg-indigo-50 text-indigo-700",
        accepted:
            "bg-emerald-50 text-emerald-700",
        declined:
            "bg-red-50 text-red-700",
        cancelled:
            "bg-slate-100 text-slate-500",
        expired:
            "bg-orange-50 text-orange-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black capitalize ${styles[status]}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

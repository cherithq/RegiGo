"use client";

import { useMemo, useState } from "react";
import {
    CheckCircle2,
    CirclePlus,
    Loader2,
    Mail,
    Pencil,
    Search,
    X,
} from "lucide-react";
import SendGuestEmailButton from "@/components/guests/SendGuestEmailButton";

type QrTicket = {
    id?: string;
    registration_id?: string;
    event_id?: string;
    is_active?: boolean;
    checked_in_at?: string | null;
    [key: string]: any;
};

type Guest = {
    id: string;
    event_id?: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    country_code?: string | null;
    department?: string | null;
    dietary_request?: string | null;
    require_transport?: string | null;
    custom_answers?: Record<string, any> | null;
    registration_status?: string | null;
    email_verified?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    __qr_ticket?: QrTicket | null;
    [key: string]: any;
};

type RegistrationField = {
    id: string;
    label?: string;
    field_label?: string;
    name?: string;
    field_name?: string;
    key?: string;
    field_key?: string;
    type?: string;
    input_type?: string;
    sort_order?: number;
    options?: any;
    required?: boolean;
    is_required?: boolean;
    [key: string]: any;
};

type CheckInFilter = "all" | "checked_in" | "not_checked_in";

type Props = {
    eventId: string;
    initialGuests: Guest[];
    fields: RegistrationField[];
};

function normalizeKey(value: unknown) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function fieldLabel(field: RegistrationField) {
    return (
        field.label ||
        field.field_label ||
        field.name ||
        field.field_name ||
        field.key ||
        field.field_key ||
        "Field"
    );
}

function fieldKey(field: RegistrationField) {
    return (
        field.key ||
        field.field_key ||
        field.name ||
        field.field_name ||
        field.label ||
        field.field_label ||
        field.id
    );
}

function fieldType(field: RegistrationField) {
    return String(field.type || field.input_type || "text").toLowerCase();
}

function isRequired(field: RegistrationField) {
    return Boolean(field.required || field.is_required);
}

function parseOptions(options: any): string[] {
    if (!options) return [];

    if (typeof options === "string") {
        try {
            const parsed = JSON.parse(options);
            return parseOptions(parsed);
        } catch {
            return options
                .split("\n")
                .flatMap((item) => item.split(","))
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    if (Array.isArray(options)) {
        return options
            .map((item) => {
                if (typeof item === "string") return item;
                return item?.label || item?.value || item?.name || "";
            })
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    if (typeof options === "object") {
        if (Array.isArray(options.options)) return parseOptions(options.options);
        if (Array.isArray(options.choices)) return parseOptions(options.choices);
        if (Array.isArray(options.values)) return parseOptions(options.values);
    }

    return [];
}

function getDirectValue(guest: Guest, labelOrKey: string) {
    const key = normalizeKey(labelOrKey);

    if (["full_name", "fullname", "name", "guest_name"].includes(key)) {
        return guest.full_name ?? "";
    }

    if (["email", "email_address", "emailaddress"].includes(key)) {
        return guest.email ?? "";
    }

    if (["phone", "mobile", "mobile_number", "mobilenumber"].includes(key)) {
        return guest.phone ?? "";
    }

    if (["department", "outlet", "department_outlet", "departmentoutlet"].includes(key)) {
        return guest.department ?? "";
    }

    if (["dietary_request", "dietary_requirements", "dietaryrequirements"].includes(key)) {
        return guest.dietary_request ?? "";
    }

    if (["require_transport", "require_transport_from_outlet", "requiretransport", "transport"].includes(key)) {
        return guest.require_transport ?? "";
    }

    return "";
}

function getGuestFieldValue(guest: Guest, field: RegistrationField) {
    const answers = guest.custom_answers || {};
    const possibleKeys = [
        field.id,
        field.key,
        field.field_key,
        field.name,
        field.field_name,
        field.label,
        field.field_label,
    ].filter(Boolean) as string[];

    for (const key of possibleKeys) {
        const value = answers[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value);
        }
    }

    const normalizedPossibleKeys = possibleKeys.map(normalizeKey);

    for (const [answerKey, value] of Object.entries(answers)) {
        if (normalizedPossibleKeys.includes(normalizeKey(answerKey))) {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return String(value);
            }
        }
    }

    for (const key of possibleKeys) {
        const direct = getDirectValue(guest, key);
        if (direct !== "") return String(direct);
    }

    return "";
}

function isEmailField(field: RegistrationField) {
    return [fieldLabel(field), fieldKey(field)].some((value) =>
        ["email", "email_address", "emailaddress"].includes(normalizeKey(value))
    );
}

function isFullNameField(field: RegistrationField) {
    return [fieldLabel(field), fieldKey(field)].some((value) =>
        ["full_name", "fullname", "name", "guest_name"].includes(normalizeKey(value))
    );
}

function isCheckedIn(guest: Guest) {
    return guest.__qr_ticket?.is_active === false ||
        Boolean(guest.__qr_ticket?.checked_in_at) ||
        String(guest.registration_status || "").toLowerCase() === "checked_in";
}

function checkInPillClass(checkedIn: boolean) {
    return checkedIn
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-100 text-slate-700";
}

function displayValue(value: unknown) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return "-";
    }
    return String(value);
}

export default function GuestsManager({ eventId, initialGuests, fields }: Props) {
    const [guests, setGuests] = useState<Guest[]>(initialGuests);
    const [query, setQuery] = useState("");
    const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const orderedFields = useMemo(() => {
        return [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }, [fields]);

    const fullNameField = orderedFields.find(isFullNameField);
    const emailField = orderedFields.find(isEmailField);
    const otherFields = orderedFields.filter(
        (field) => !isFullNameField(field) && !isEmailField(field)
    );

    const tableFields = otherFields;

    const filteredGuests = useMemo(() => {
        const cleanQuery = query.trim().toLowerCase();

        return guests.filter((guest) => {
            const allText = [
                guest.full_name,
                guest.email,
                guest.phone,
                guest.department,
                guest.dietary_request,
                guest.require_transport,
                ...Object.values(guest.custom_answers || {}),
            ]
                .map((value) => String(value || "").toLowerCase())
                .join(" ");

            const matchesSearch = cleanQuery.length === 0 || allText.includes(cleanQuery);
            const checkedIn = isCheckedIn(guest);
            const matchesCheckIn =
                checkInFilter === "all" ||
                (checkInFilter === "checked_in" ? checkedIn : !checkedIn);

            return matchesSearch && matchesCheckIn;
        });
    }, [guests, query, checkInFilter]);

    const stats = useMemo(() => {
        const checkedInCount = guests.filter(isCheckedIn).length;
        return {
            total: guests.length,
            checkedIn: checkedInCount,
            notCheckedIn: guests.length - checkedInCount,
        };
    }, [guests]);

    function getFieldFormKey(field: RegistrationField) {
        return fieldKey(field);
    }

    function buildValuesFromGuest(guest: Guest | null) {
        const values: Record<string, string> = {};

        for (const field of orderedFields) {
            values[getFieldFormKey(field)] = guest ? getGuestFieldValue(guest, field) : "";
        }

        return values;
    }

    function openAddModal() {
        setEditingGuest(null);
        setFormValues(buildValuesFromGuest(null));
        setError("");
        setModalOpen(true);
    }

    function openEditModal(guest: Guest) {
        setEditingGuest(guest);
        setFormValues(buildValuesFromGuest(guest));
        setError("");
        setModalOpen(true);
    }

    function closeModal() {
        if (saving) return;
        setModalOpen(false);
        setEditingGuest(null);
        setFormValues({});
        setError("");
    }

    function setFieldValue(field: RegistrationField, value: string) {
        setFormValues((previous) => ({
            ...previous,
            [getFieldFormKey(field)]: value,
        }));
    }

    function buildAnswersPayload() {
        const answers: Record<string, string> = {};

        for (const field of orderedFields) {
            const value = formValues[getFieldFormKey(field)] ?? "";

            // Store multiple keys so your page, table and modal can all read it
            // even if they use label, id, name, field_key, etc.
            answers[field.id] = value;
            answers[fieldKey(field)] = value;
            answers[fieldLabel(field)] = value;
        }

        return answers;
    }

    async function reloadGuests() {
        const response = await fetch(`/api/events/${eventId}/guests`, {
            method: "GET",
            cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Guest saved but failed to reload guest list.");
        }

        setGuests(result.guests || []);
    }

    async function saveGuest() {
        setError("");

        for (const field of orderedFields) {
            if (isRequired(field)) {
                const value = formValues[getFieldFormKey(field)];
                if (!value || !String(value).trim()) {
                    setError(`${fieldLabel(field)} is required.`);
                    return;
                }
            }
        }

        setSaving(true);

        try {
            const answers = buildAnswersPayload();

            const response = await fetch(`/api/events/${eventId}/guests`, {
                method: editingGuest ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                    mode: editingGuest ? "update" : "create",
                    id: editingGuest?.id,
                    registrationId: editingGuest?.id,
                    registration_id: editingGuest?.id,
                    answers,
                    custom_answers: answers,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to save guest.");
            }

            if (Array.isArray(result.guests)) {
                setGuests(result.guests);
            } else {
                await reloadGuests();
            }

            closeModal();
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to save guest.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">Guests</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {stats.total} total · {stats.checkedIn} checked in · {stats.notCheckedIn} not checked in
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative min-w-[280px]">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search guests..."
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                            />
                        </div>

                        <select
                            value={checkInFilter}
                            onChange={(event) => setCheckInFilter(event.target.value as CheckInFilter)}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        >
                            <option value="all">All guests</option>
                            <option value="checked_in">Checked In</option>
                            <option value="not_checked_in">Not Checked In</option>
                        </select>

                        <button
                            type="button"
                            onClick={openAddModal}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#4338CA]"
                        >
                            <CirclePlus className="h-4 w-4" />
                            Add Guest
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                        <tr>
                            {fullNameField && <th className="px-6 py-5 min-w-[170px]">{fieldLabel(fullNameField)}</th>}
                            {emailField && <th className="px-6 py-5 min-w-[270px]">{fieldLabel(emailField)}</th>}
                            <th className="px-6 py-5 min-w-[150px]">Check-In</th>
                            {tableFields.map((field) => (
                                <th key={field.id} className="px-6 py-5 min-w-[170px]">
                                    {fieldLabel(field)}
                                </th>
                            ))}
                            <th className="px-6 py-5 min-w-[150px] text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                        {filteredGuests.length === 0 ? (
                            <tr>
                                <td colSpan={Math.max(4, orderedFields.length + 2)} className="px-6 py-14 text-center">
                                    <p className="text-lg font-black text-slate-900">No guests found</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        Add a guest or adjust your search/filter.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredGuests.map((guest) => {
                                const checkedIn = isCheckedIn(guest);
                                return (
                                    <tr key={guest.id} className={checkedIn ? "bg-slate-50/70" : "bg-white"}>
                                        {fullNameField && (
                                            <td className="px-6 py-5 align-top text-slate-900">
                                                {displayValue(getGuestFieldValue(guest, fullNameField))}
                                            </td>
                                        )}

                                        {emailField && (
                                            <td className="px-6 py-5 align-top text-slate-900">
                                                <div className="max-w-[360px] break-all">
                                                    {displayValue(getGuestFieldValue(guest, emailField))}
                                                </div>
                                            </td>
                                        )}

                                        <td className="px-6 py-5 align-top">
                                            <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-black ${checkInPillClass(checkedIn)}`}>
                                                {checkedIn ? "Checked In" : "Not Checked In"}
                                            </span>
                                        </td>

                                        {tableFields.map((field) => (
                                            <td key={field.id} className="px-6 py-5 align-top">
                                                <div className="max-w-[280px] break-words">
                                                    {displayValue(getGuestFieldValue(guest, field))}
                                                </div>
                                            </td>
                                        ))}

                                        <td className="px-6 py-5 align-top">
                                            <div className="flex flex-col items-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(guest)}
                                                    className="inline-flex w-full max-w-[210px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-[#4F46E5] hover:text-[#4F46E5]"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </button>

                                                <div className="w-full max-w-[210px]">
                                                    <SendGuestEmailButton eventId={eventId} registrationId={guest.id} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-5">
                    <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-200 px-8 py-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-950">
                                    {editingGuest ? "Edit Guest" : "Add Guest"}
                                </h3>
                                <p className="mt-1 text-sm font-bold text-slate-500">
                                    {editingGuest
                                        ? "Update this guest's registration form answers."
                                        : "Fill in the registration form for this guest."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                            >
                                <X className="h-7 w-7" />
                            </button>
                        </div>

                        <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-8 py-7">
                            <p className="mb-6 text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                                Registration Form
                            </p>

                            {error && (
                                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-6 lg:grid-cols-2">
                                {orderedFields.map((field) => (
                                    <FieldInput
                                        key={field.id}
                                        field={field}
                                        value={formValues[getFieldFormKey(field)] ?? ""}
                                        onChange={(value) => setFieldValue(field, value)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-8 py-6">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveGuest}
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-5 w-5" />
                                )}
                                {editingGuest ? "Save Changes" : "Create Guest"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function FieldInput({
    field,
    value,
    onChange,
}: {
    field: RegistrationField;
    value: string;
    onChange: (value: string) => void;
}) {
    const label = fieldLabel(field);
    const type = fieldType(field);
    const options = parseOptions(field.options);
    const required = isRequired(field);

    return (
        <label className={type === "textarea" ? "block lg:col-span-2" : "block"}>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </span>

            {type === "select" || type === "dropdown" || options.length > 0 ? (
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                >
                    <option value="">Select an option</option>
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            ) : type === "textarea" ? (
                <textarea
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                />
            ) : (
                <input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    type={type === "email" ? "email" : type === "number" ? "number" : "text"}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                />
            )}
        </label>
    );
}

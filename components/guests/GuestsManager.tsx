"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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

type ImageChoiceSubField = {
    id?: string;
    label?: string;
    value?: string;
};

type ImageChoice = {
    id?: string;
    label?: string;
    description?: string;
    image_url?: string;
    sub_fields?: ImageChoiceSubField[];
};

type FieldOptions = {
    placeholder?: string;
    help_text?: string;
    choices?: string[];
    image_choices?: ImageChoice[];
    choice_images?: Record<string, string>;
    choice_descriptions?: Record<string, string>;
    choice_sub_fields?: Record<string, ImageChoiceSubField[]>;
    country_codes?: string[];
    default_country_code?: string;
    validation?: {
        min_length?: string | number;
        max_length?: string | number;
    };
    [key: string]: unknown;
};

type AnswerValue =
    | string
    | string[]
    | number
    | boolean
    | null
    | Record<string, unknown>;

type RegistrationField = {
    id: string;
    label?: string;
    field_label?: string;
    name?: string;
    field_name?: string;
    key?: string;
    field_key?: string;
    type?: string;
    field_type?: string;
    input_type?: string;
    sort_order?: number;
    options?: unknown;
    field_options?: unknown;
    required?: boolean;
    is_required?: boolean;
    [key: string]: unknown;
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
        field.field_label ||
        field.label ||
        field.name ||
        field.field_name ||
        field.field_key ||
        field.key ||
        "Field"
    );
}

function fieldKey(field: RegistrationField) {
    return (
        field.field_key ||
        field.key ||
        field.name ||
        field.field_name ||
        field.field_label ||
        field.label ||
        field.id
    );
}

function fieldType(field: RegistrationField) {
    return String(
        field.field_type ||
            field.type ||
            field.input_type ||
            "text"
    ).toLowerCase();
}

function isRequired(field: RegistrationField) {
    return Boolean(field.is_required ?? field.required);
}

function parseOptionObject(value: unknown): FieldOptions {
    if (!value) return {};

    if (Array.isArray(value)) {
        return {
            choices: normaliseChoices(value),
        };
    }

    if (typeof value === "object") {
        return value as FieldOptions;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) return {};

        try {
            const parsed = JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
                return {
                    choices: normaliseChoices(parsed),
                };
            }

            if (
                parsed &&
                typeof parsed === "object"
            ) {
                return parsed as FieldOptions;
            }
        } catch {
            return {
                choices: normaliseChoices(trimmed),
            };
        }
    }

    return {};
}

function normaliseChoices(value: unknown): string[] {
    if (Array.isArray(value)) {
        return Array.from(
            new Set(
                value
                    .map((item) => {
                        if (typeof item === "string") {
                            return item.trim();
                        }

                        if (
                            item &&
                            typeof item === "object"
                        ) {
                            const record =
                                item as Record<string, unknown>;

                            return String(
                                record.label ??
                                    record.value ??
                                    record.name ??
                                    ""
                            ).trim();
                        }

                        return String(item ?? "").trim();
                    })
                    .filter(Boolean)
            )
        );
    }

    if (typeof value === "string") {
        return Array.from(
            new Set(
                value
                    .split(/\r?\n|,/)
                    .map((item) => item.trim())
                    .filter(Boolean)
            )
        );
    }

    return [];
}

function getMergedFieldOptions(
    field: RegistrationField
): FieldOptions {
    const legacy = parseOptionObject(field.options);
    const current = parseOptionObject(field.field_options);

    const merged: FieldOptions = {
        ...legacy,
        ...current,
        validation: {
            ...(legacy.validation || {}),
            ...(current.validation || {}),
        },
        choice_images: {
            ...(legacy.choice_images || {}),
            ...(current.choice_images || {}),
        },
        choice_descriptions: {
            ...(legacy.choice_descriptions || {}),
            ...(current.choice_descriptions || {}),
        },
        choice_sub_fields: {
            ...(legacy.choice_sub_fields || {}),
            ...(current.choice_sub_fields || {}),
        },
    };

    const possibleChoices =
        current.choices ??
        legacy.choices ??
        current.dropdown_options ??
        legacy.dropdown_options ??
        current.values ??
        legacy.values ??
        current.items ??
        legacy.items;

    merged.choices = normaliseChoices(possibleChoices);

    return merged;
}

function getImageChoices(options: FieldOptions): ImageChoice[] {
    if (
        Array.isArray(options.image_choices) &&
        options.image_choices.length > 0
    ) {
        return options.image_choices;
    }

    return (options.choices || []).map((choice) => ({
        id: choice,
        label: choice,
        description:
            options.choice_descriptions?.[choice] || "",
        image_url: options.choice_images?.[choice] || "",
        sub_fields:
            options.choice_sub_fields?.[choice] || [],
    }));
}

function getDirectValue(
    guest: Guest,
    labelOrKey: string
): AnswerValue {
    const key = normalizeKey(labelOrKey);

    if (
        ["full_name", "fullname", "name", "guest_name"].includes(
            key
        )
    ) {
        return guest.full_name ?? "";
    }

    if (
        ["email", "email_address", "emailaddress"].includes(key)
    ) {
        return guest.email ?? "";
    }

    if (
        [
            "phone",
            "mobile",
            "mobile_number",
            "mobilenumber",
        ].includes(key)
    ) {
        return guest.phone ?? "";
    }

    if (
        [
            "department",
            "outlet",
            "department_outlet",
            "departmentoutlet",
        ].includes(key)
    ) {
        return guest.department ?? "";
    }

    if (
        [
            "dietary_request",
            "dietary_requirements",
            "dietaryrequirements",
        ].includes(key)
    ) {
        return guest.dietary_request ?? "";
    }

    if (
        [
            "require_transport",
            "require_transport_from_outlet",
            "requiretransport",
            "transport",
        ].includes(key)
    ) {
        return guest.require_transport ?? "";
    }

    return "";
}

function getGuestFieldValue(
    guest: Guest,
    field: RegistrationField
): AnswerValue {
    const answers = guest.custom_answers || {};
    const possibleKeys = [
        field.field_key,
        field.key,
        field.name,
        field.field_name,
        field.field_label,
        field.label,
        field.id,
    ].filter(Boolean) as string[];

    for (const key of possibleKeys) {
        const value = answers[key];

        if (!isEmptyAnswer(value as AnswerValue)) {
            return value as AnswerValue;
        }
    }

    const normalizedPossibleKeys =
        possibleKeys.map(normalizeKey);

    for (const [answerKey, value] of Object.entries(answers)) {
        if (
            normalizedPossibleKeys.includes(
                normalizeKey(answerKey)
            ) &&
            !isEmptyAnswer(value as AnswerValue)
        ) {
            return value as AnswerValue;
        }
    }

    for (const key of possibleKeys) {
        const direct = getDirectValue(guest, key);

        if (!isEmptyAnswer(direct)) {
            return direct;
        }
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
    return (
        guest.__qr_ticket?.is_active === false ||
        Boolean(guest.__qr_ticket?.checked_in_at) ||
        String(guest.registration_status || "").toLowerCase() ===
            "checked_in"
    );
}

function checkInPillClass(checkedIn: boolean) {
    return checkedIn
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-100 text-slate-700";
}

function isEmptyAnswer(value: AnswerValue | undefined) {
    if (value === undefined || value === null) return true;

    if (typeof value === "string") {
        return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    if (typeof value === "object") {
        return Object.keys(value).length === 0;
    }

    return false;
}

function displayValue(value: unknown) {
    if (value === null || value === undefined) return "-";

    if (Array.isArray(value)) {
        return value.length > 0
            ? value.map(String).join(", ")
            : "-";
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;

        if (record.name) {
            return String(record.name);
        }

        if (record.label) {
            return String(record.label);
        }

        if (record.value) {
            return String(record.value);
        }

        return JSON.stringify(record);
    }

    const text = String(value).trim();
    return text || "-";
}

function toggleArrayValue(
    current: string[],
    item: string,
    checked: boolean
) {
    if (checked) {
        return Array.from(new Set([...current, item]));
    }

    return current.filter((value) => value !== item);
}

function toOptionalNumber(value: unknown) {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) && numberValue > 0
        ? numberValue
        : undefined;
}

function escapeRegExp(value: string) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

export default function GuestsManager({ eventId, initialGuests, fields }: Props) {
    const [guests, setGuests] = useState<Guest[]>(initialGuests);
    const [query, setQuery] = useState("");
    const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
    const [formValues, setFormValues] = useState<Record<string, AnswerValue>>({});
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
                ...Object.values(guest.custom_answers || {}).map(displayValue),
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
        const values: Record<string, AnswerValue> = {};

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

    function setFieldValue(field: RegistrationField, value: AnswerValue) {
        setFormValues((previous) => ({
            ...previous,
            [getFieldFormKey(field)]: value,
        }));
    }

    function buildAnswersPayload() {
        const answers: Record<string, AnswerValue> = {};

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
                const value =
                    formValues[getFieldFormKey(field)];

                if (isEmptyAnswer(value)) {
                    setError(
                        `${fieldLabel(field)} is required.`
                    );
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
    value: AnswerValue | undefined;
    onChange: (value: AnswerValue) => void;
}) {
    const label = fieldLabel(field);
    const type = fieldType(field);
    const options = getMergedFieldOptions(field);
    const choices = options.choices || [];
    const required = isRequired(field);
    const helpText = options.help_text || "";
    const placeholder =
        options.placeholder || `Enter ${label}`;
    const minLength = toOptionalNumber(
        options.validation?.min_length
    );
    const maxLength = toOptionalNumber(
        options.validation?.max_length
    );
    const fullWidth = [
        "textarea",
        "radio",
        "checkbox",
        "image_radio",
        "image_checkbox",
        "file",
    ].includes(type);

    if (type === "textarea") {
        return (
            <FieldShell
                label={label}
                required={required}
                helpText={helpText}
                fullWidth
            >
                <textarea
                    required={required}
                    value={String(value || "")}
                    onChange={(event) =>
                        onChange(event.target.value)
                    }
                    placeholder={placeholder}
                    minLength={minLength}
                    maxLength={maxLength}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                />
            </FieldShell>
        );
    }

    if (type === "select" || type === "dropdown") {
        return (
            <FieldShell
                label={label}
                required={required}
                helpText={helpText}
            >
                <select
                    required={required}
                    value={String(value || "")}
                    onChange={(event) =>
                        onChange(event.target.value)
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                >
                    <option value="">
                        {options.placeholder ||
                            "Select an option"}
                    </option>

                    {choices.map((choice) => (
                        <option key={choice} value={choice}>
                            {choice}
                        </option>
                    ))}
                </select>

                {choices.length === 0 && (
                    <MissingOptionsNotice />
                )}
            </FieldShell>
        );
    }

    if (type === "radio") {
        return (
            <FieldShell
                label={label}
                required={required}
                helpText={helpText}
                fullWidth
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    {choices.map((choice, index) => (
                        <label
                            key={choice}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 font-bold transition ${
                                String(value || "") === choice
                                    ? "border-[#4F46E5] bg-[#F7F5FF]"
                                    : "border-slate-200 bg-slate-50 hover:border-[#4F46E5]/50"
                            }`}
                        >
                            <input
                                required={
                                    required && index === 0
                                }
                                type="radio"
                                name={fieldKey(field)}
                                value={choice}
                                checked={
                                    String(value || "") ===
                                    choice
                                }
                                onChange={(event) =>
                                    onChange(
                                        event.target.value
                                    )
                                }
                                className="accent-[#4F46E5]"
                            />

                            <span>{choice}</span>
                        </label>
                    ))}

                    {choices.length === 0 && (
                        <div className="sm:col-span-2">
                            <MissingOptionsNotice />
                        </div>
                    )}
                </div>
            </FieldShell>
        );
    }

    if (type === "checkbox") {
        const selectedValues = Array.isArray(value)
            ? value.map(String)
            : [];

        return (
            <FieldShell
                label={label}
                required={required}
                helpText={helpText}
                fullWidth
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    {choices.map((choice) => {
                        const selected =
                            selectedValues.includes(choice);

                        return (
                            <label
                                key={choice}
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 font-bold transition ${
                                    selected
                                        ? "border-[#4F46E5] bg-[#F7F5FF]"
                                        : "border-slate-200 bg-slate-50 hover:border-[#4F46E5]/50"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) =>
                                        onChange(
                                            toggleArrayValue(
                                                selectedValues,
                                                choice,
                                                event.target
                                                    .checked
                                            )
                                        )
                                    }
                                    className="accent-[#4F46E5]"
                                />

                                <span>{choice}</span>
                            </label>
                        );
                    })}

                    {choices.length === 0 && (
                        <div className="sm:col-span-2">
                            <MissingOptionsNotice />
                        </div>
                    )}
                </div>
            </FieldShell>
        );
    }

    if (
        type === "image_radio" ||
        type === "image_checkbox"
    ) {
        const imageChoices = getImageChoices(options);
        const isMultiple =
            type === "image_checkbox";
        const selectedValues = isMultiple
            ? Array.isArray(value)
                ? value.map(String)
                : []
            : [String(value || "")];

        return (
            <FieldShell
                label={label}
                required={required}
                helpText={helpText}
                fullWidth
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    {imageChoices.map((choice, index) => {
                        const choiceLabel =
                            choice.label || "";
                        const selected =
                            selectedValues.includes(
                                choiceLabel
                            );

                        return (
                            <label
                                key={
                                    choice.id ||
                                    `${choiceLabel}-${index}`
                                }
                                className={`cursor-pointer overflow-hidden rounded-2xl border-2 transition ${
                                    selected
                                        ? "border-[#4F46E5] bg-[#F7F5FF] shadow-md"
                                        : "border-slate-200 bg-white hover:border-[#4F46E5]/40"
                                }`}
                            >
                                {choice.image_url ? (
                                    <img
                                        src={choice.image_url}
                                        alt={choiceLabel}
                                        className="h-40 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-40 items-center justify-center bg-slate-100 text-sm font-bold text-slate-400">
                                        No image
                                    </div>
                                )}

                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type={
                                                isMultiple
                                                    ? "checkbox"
                                                    : "radio"
                                            }
                                            name={
                                                isMultiple
                                                    ? undefined
                                                    : fieldKey(
                                                          field
                                                      )
                                            }
                                            required={
                                                !isMultiple &&
                                                required &&
                                                index === 0
                                            }
                                            checked={selected}
                                            onChange={(event) => {
                                                if (
                                                    isMultiple
                                                ) {
                                                    onChange(
                                                        toggleArrayValue(
                                                            selectedValues,
                                                            choiceLabel,
                                                            event
                                                                .target
                                                                .checked
                                                        )
                                                    );
                                                    return;
                                                }

                                                onChange(
                                                    choiceLabel
                                                );
                                            }}
                                            className="mt-1 accent-[#4F46E5]"
                                        />

                                        <div>
                                            <p className="font-black text-slate-950">
                                                {
                                                    choiceLabel
                                                }
                                            </p>

                                            {choice.description && (
                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                    {
                                                        choice.description
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {Array.isArray(
                                        choice.sub_fields
                                    ) &&
                                        choice.sub_fields
                                            .length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {choice.sub_fields.map(
                                                    (
                                                        subField,
                                                        subIndex
                                                    ) => (
                                                        <div
                                                            key={
                                                                subField.id ||
                                                                `${subField.label}-${subIndex}`
                                                            }
                                                            className="rounded-lg bg-white px-3 py-2 text-xs"
                                                        >
                                                            <span className="font-black text-slate-500">
                                                                {
                                                                    subField.label
                                                                }
                                                            </span>

                                                            {subField.value && (
                                                                <span className="ml-2 font-semibold text-slate-700">
                                                                    {
                                                                        subField.value
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>
                            </label>
                        );
                    })}

                    {imageChoices.length === 0 && (
                        <div className="sm:col-span-2">
                            <MissingOptionsNotice />
                        </div>
                    )}
                </div>
            </FieldShell>
        );
    }

    if (type === "phone") {
        return (
            <PhoneField
                field={field}
                value={String(value || "")}
                options={options}
                onChange={onChange}
            />
        );
    }

    if (type === "file") {
        const currentFile =
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : null;

        return (
            <FieldShell
                label={label}
                required={required}
                helpText={
                    helpText ||
                    "The selected filename will be saved with the guest record."
                }
                fullWidth
            >
                {Boolean(currentFile?.name) && (
                    <p className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                        Current file:{" "}
                        {String(currentFile?.name ?? "")}
                    </p>
                )}

                <input
                    required={required && !currentFile}
                    type="file"
                    onChange={(event) => {
                        const file =
                            event.target.files?.[0];

                        onChange(
                            file
                                ? {
                                      name: file.name,
                                      size: file.size,
                                      type: file.type,
                                  }
                                : null
                        );
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                />
            </FieldShell>
        );
    }

    const htmlInputType =
        type === "email"
            ? "email"
            : type === "number"
              ? "number"
              : type === "date"
                ? "date"
                : type === "time"
                  ? "time"
                  : "text";

    return (
        <FieldShell
            label={label}
            required={required}
            helpText={helpText}
            fullWidth={fullWidth}
        >
            <input
                required={required}
                value={String(value || "")}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                type={htmlInputType}
                placeholder={placeholder}
                minLength={
                    htmlInputType === "text"
                        ? minLength
                        : undefined
                }
                maxLength={
                    htmlInputType === "text"
                        ? maxLength
                        : undefined
                }
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
            />
        </FieldShell>
    );
}

function PhoneField({
    field,
    value,
    options,
    onChange,
}: {
    field: RegistrationField;
    value: string;
    options: FieldOptions;
    onChange: (value: AnswerValue) => void;
}) {
    const countryCodes =
        Array.isArray(options.country_codes) &&
        options.country_codes.length > 0
            ? options.country_codes.map(String)
            : ["+65"];

    const defaultCode =
        options.default_country_code &&
        countryCodes.includes(
            options.default_country_code
        )
            ? options.default_country_code
            : countryCodes[0];

    const detectedCode =
        countryCodes.find((code) =>
            value.trim().startsWith(code)
        ) || defaultCode;

    const numberValue = value
        .replace(
            new RegExp(
                `^${escapeRegExp(detectedCode)}\\s*`
            ),
            ""
        )
        .trim();

    function updatePhone(
        code: string,
        number: string
    ) {
        const cleanNumber = number.trim();

        onChange(
            cleanNumber ? `${code} ${cleanNumber}` : ""
        );
    }

    return (
        <FieldShell
            label={fieldLabel(field)}
            required={isRequired(field)}
            helpText={options.help_text || ""}
        >
            <div className="grid grid-cols-[120px_1fr] gap-3">
                <select
                    value={detectedCode}
                    onChange={(event) =>
                        updatePhone(
                            event.target.value,
                            numberValue
                        )
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                >
                    {countryCodes.map((code) => (
                        <option key={code} value={code}>
                            {code}
                        </option>
                    ))}
                </select>

                <input
                    required={isRequired(field)}
                    type="tel"
                    value={numberValue}
                    onChange={(event) =>
                        updatePhone(
                            detectedCode,
                            event.target.value
                        )
                    }
                    placeholder={
                        options.placeholder ||
                        "Enter phone number"
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                />
            </div>
        </FieldShell>
    );
}

function FieldShell({
    label,
    required,
    helpText,
    fullWidth,
    children,
}: {
    label: string;
    required?: boolean;
    helpText?: string;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    return (
        <div
            className={
                fullWidth ? "lg:col-span-2" : undefined
            }
        >
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
                {required && (
                    <span className="text-red-500"> *</span>
                )}
            </label>

            {children}

            {helpText && (
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                    {helpText}
                </p>
            )}
        </div>
    );
}

function MissingOptionsNotice() {
    return (
        <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            No options have been configured for this field.
        </p>
    );
}

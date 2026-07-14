"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

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

type Field = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    is_required?: boolean;
    sort_order?: number;
    field_options?: unknown;
    options?: unknown;
};

type AnswerValue =
    | string
    | string[]
    | number
    | boolean
    | null
    | Record<string, unknown>;

export default function DynamicRegistrationForm({
    event,
    fields,
    tickets = [],
    tables = [],
}: {
    event: any;
    fields: Field[];
    tickets?: any[];
    tables?: any[];
}) {
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const enableTicketTypes = event?.enable_ticket_types ?? true;
    const enableTables = event?.enable_tables ?? false;

    const orderedFields = useMemo(
        () =>
            [...(Array.isArray(fields) ? fields : [])].sort(
                (a, b) =>
                    Number(a.sort_order || 0) -
                    Number(b.sort_order || 0)
            ),
        [fields]
    );

    function updateAnswer(key: string, value: AnswerValue) {
        setAnswers((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    async function handleSubmit(eventObject: FormEvent<HTMLFormElement>) {
        eventObject.preventDefault();
        setLoading(true);
        setMessage("");

        const fullName = String(
            answers.full_name ||
                answers.name ||
                answers.guest_name ||
                ""
        ).trim();

        const email = String(answers.email || "").trim();

        if (!fullName || !email) {
            setMessage("Please enter full name and email.");
            setLoading(false);
            return;
        }

        if (enableTicketTypes && !answers.ticket_type_id) {
            setMessage("Please select a ticket type.");
            setLoading(false);
            return;
        }

        if (enableTables && !answers.table_id) {
            setMessage("Please select a table.");
            setLoading(false);
            return;
        }

        for (const field of orderedFields) {
            if (!field.is_required) continue;

            const value = answers[field.field_key];

            if (isEmptyAnswer(value)) {
                setMessage(`${field.field_label} is required.`);
                setLoading(false);
                return;
            }
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId: event.id,
                    answers,
                }),
            });

            const responseText = await response.text();
            let data: {
                error?: string;
                passUrl?: string;
            } = {};

            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `Registration returned ${response.status} instead of JSON.`
                );
            }

            if (!response.ok) {
                throw new Error(data.error || "Registration failed.");
            }

            if (!data.passUrl) {
                throw new Error(
                    "Registration succeeded, but no pass URL was returned."
                );
            }

            window.location.href = data.passUrl;
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Registration failed."
            );
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {enableTicketTypes && (
                <FormFieldShell
                    label="Ticket Type"
                    required
                >
                    <select
                        required
                        value={String(answers.ticket_type_id || "")}
                        onChange={(eventObject) =>
                            updateAnswer(
                                "ticket_type_id",
                                eventObject.target.value
                            )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#4F46E5]"
                    >
                        <option value="">Select ticket type</option>

                        {tickets.map((ticket) => (
                            <option key={ticket.id} value={ticket.id}>
                                {ticket.ticket_name ||
                                    ticket.name ||
                                    ticket.title ||
                                    "Ticket"}
                            </option>
                        ))}
                    </select>
                </FormFieldShell>
            )}

            {enableTables && (
                <FormFieldShell label="Table" required>
                    <select
                        required
                        value={String(answers.table_id || "")}
                        onChange={(eventObject) =>
                            onTableChange(
                                eventObject.target.value,
                                tables,
                                updateAnswer
                            )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#4F46E5]"
                    >
                        <option value="">Select table</option>

                        {tables.map((table) => (
                            <option key={table.id} value={table.id}>
                                {table.table_name ||
                                    table.name ||
                                    table.table_number ||
                                    `Table ${table.id}`}
                            </option>
                        ))}
                    </select>

                    {tables.length === 0 && (
                        <p className="mt-2 text-sm font-semibold text-amber-600">
                            No tables are currently available.
                        </p>
                    )}
                </FormFieldShell>
            )}

            {orderedFields.map((field) => (
                <FieldInput
                    key={field.id}
                    field={field}
                    value={answers[field.field_key]}
                    onChange={(value) =>
                        updateAnswer(field.field_key, value)
                    }
                />
            ))}

            {message && (
                <div
                    role="alert"
                    className="rounded-xl bg-red-50 p-4 font-semibold text-red-600"
                >
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Submitting..." : "Submit Registration"}
            </button>
        </form>
    );
}

function onTableChange(
    tableId: string,
    tables: any[],
    updateAnswer: (key: string, value: AnswerValue) => void
) {
    const selectedTable = tables.find(
        (table) => String(table.id) === String(tableId)
    );

    updateAnswer("table_id", tableId);

    if (selectedTable) {
        updateAnswer(
            "table_name",
            selectedTable.table_name ||
                selectedTable.name ||
                selectedTable.table_number ||
                `Table ${selectedTable.id}`
        );
    }
}

function FieldInput({
    field,
    value,
    onChange,
}: {
    field: Field;
    value: AnswerValue | undefined;
    onChange: (value: AnswerValue) => void;
}) {
    const type = String(field.field_type || "text").toLowerCase();
    const options = getMergedFieldOptions(field);
    const choices = options.choices || [];
    const placeholder =
        options.placeholder || `Enter ${field.field_label}`;
    const helpText = options.help_text || "";
    const minLength = toOptionalNumber(
        options.validation?.min_length
    );
    const maxLength = toOptionalNumber(
        options.validation?.max_length
    );

    if (type === "textarea") {
        return (
            <FormFieldShell
                label={field.field_label}
                required={field.is_required}
                helpText={helpText}
            >
                <textarea
                    required={field.is_required}
                    value={String(value || "")}
                    onChange={(eventObject) =>
                        onChange(eventObject.target.value)
                    }
                    placeholder={placeholder}
                    minLength={minLength}
                    maxLength={maxLength}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#4F46E5]"
                />
            </FormFieldShell>
        );
    }

    if (type === "select") {
        return (
            <FormFieldShell
                label={field.field_label}
                required={field.is_required}
                helpText={helpText}
            >
                <select
                    required={field.is_required}
                    value={String(value || "")}
                    onChange={(eventObject) =>
                        onChange(eventObject.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-[#4F46E5]"
                >
                    <option value="">
                        {options.placeholder || "Select an option"}
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
            </FormFieldShell>
        );
    }

    if (type === "radio") {
        return (
            <FormFieldShell
                label={field.field_label}
                required={field.is_required}
                helpText={helpText}
            >
                <div className="space-y-2">
                    {choices.map((choice, index) => (
                        <label
                            key={choice}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-[#F7F5FF] p-4 font-semibold transition hover:border-[#4F46E5]"
                        >
                            <input
                                required={
                                    Boolean(field.is_required) &&
                                    index === 0
                                }
                                type="radio"
                                name={field.field_key}
                                value={choice}
                                checked={String(value || "") === choice}
                                onChange={(eventObject) =>
                                    onChange(eventObject.target.value)
                                }
                                className="accent-[#4F46E5]"
                            />

                            <span>{choice}</span>
                        </label>
                    ))}

                    {choices.length === 0 && (
                        <MissingOptionsNotice />
                    )}
                </div>
            </FormFieldShell>
        );
    }

    if (type === "checkbox") {
        const selectedValues = Array.isArray(value)
            ? value.map(String)
            : [];

        return (
            <FormFieldShell
                label={field.field_label}
                required={field.is_required}
                helpText={helpText}
            >
                <div className="space-y-2">
                    {choices.map((choice) => {
                        const selected =
                            selectedValues.includes(choice);

                        return (
                            <label
                                key={choice}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 font-semibold transition ${
                                    selected
                                        ? "border-[#4F46E5] bg-[#F7F5FF]"
                                        : "border-slate-200 bg-white hover:border-[#4F46E5]/50"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    value={choice}
                                    checked={selected}
                                    onChange={(eventObject) =>
                                        onChange(
                                            toggleArrayValue(
                                                selectedValues,
                                                choice,
                                                eventObject.target.checked
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
                        <MissingOptionsNotice />
                    )}
                </div>
            </FormFieldShell>
        );
    }

    if (
        type === "image_radio" ||
        type === "image_checkbox"
    ) {
        const imageChoices = getImageChoices(options);
        const isMultiple = type === "image_checkbox";
        const selectedValues = isMultiple
            ? Array.isArray(value)
                ? value.map(String)
                : []
            : [String(value || "")];

        return (
            <FormFieldShell
                label={field.field_label}
                required={field.is_required}
                helpText={helpText}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    {imageChoices.map((choice, index) => {
                        const choiceLabel = choice.label || "";
                        const selected =
                            selectedValues.includes(choiceLabel);

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
                                                    : field.field_key
                                            }
                                            required={
                                                !isMultiple &&
                                                Boolean(
                                                    field.is_required
                                                ) &&
                                                index === 0
                                            }
                                            checked={selected}
                                            onChange={(
                                                eventObject
                                            ) => {
                                                if (isMultiple) {
                                                    onChange(
                                                        toggleArrayValue(
                                                            selectedValues,
                                                            choiceLabel,
                                                            eventObject
                                                                .target
                                                                .checked
                                                        )
                                                    );
                                                    return;
                                                }

                                                onChange(choiceLabel);
                                            }}
                                            className="mt-1 accent-[#4F46E5]"
                                        />

                                        <div>
                                            <p className="font-black text-slate-950">
                                                {choiceLabel}
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
                                        choice.sub_fields.length >
                                            0 && (
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
            </FormFieldShell>
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
        return (
            <FormFieldShell
                label={field.field_label}
                required={field.is_required}
                helpText={
                    helpText ||
                    "The selected filename will be saved with the registration."
                }
            >
                <input
                    required={field.is_required}
                    type="file"
                    onChange={(eventObject) => {
                        const file =
                            eventObject.target.files?.[0];

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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                />
            </FormFieldShell>
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
        <FormFieldShell
            label={field.field_label}
            required={field.is_required}
            helpText={helpText}
        >
            <input
                required={field.is_required}
                type={htmlInputType}
                value={String(value || "")}
                onChange={(eventObject) =>
                    onChange(eventObject.target.value)
                }
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#4F46E5]"
            />
        </FormFieldShell>
    );
}

function PhoneField({
    field,
    value,
    options,
    onChange,
}: {
    field: Field;
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
        countryCodes.includes(options.default_country_code)
            ? options.default_country_code
            : countryCodes[0];

    const detectedCode =
        countryCodes.find((code) =>
            value.trim().startsWith(code)
        ) || defaultCode;

    const numberValue = value
        .replace(new RegExp(`^${escapeRegExp(detectedCode)}\\s*`), "")
        .trim();

    function updatePhone(code: string, number: string) {
        const cleanNumber = number.trim();
        onChange(
            cleanNumber ? `${code} ${cleanNumber}` : ""
        );
    }

    return (
        <FormFieldShell
            label={field.field_label}
            required={field.is_required}
            helpText={options.help_text || ""}
        >
            <div className="grid grid-cols-[120px_1fr] gap-3">
                <select
                    value={detectedCode}
                    onChange={(eventObject) =>
                        updatePhone(
                            eventObject.target.value,
                            numberValue
                        )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold outline-none transition focus:border-[#4F46E5]"
                >
                    {countryCodes.map((code) => (
                        <option key={code} value={code}>
                            {code}
                        </option>
                    ))}
                </select>

                <input
                    required={field.is_required}
                    type="tel"
                    value={numberValue}
                    onChange={(eventObject) =>
                        updatePhone(
                            detectedCode,
                            eventObject.target.value
                        )
                    }
                    placeholder={
                        options.placeholder ||
                        "Enter phone number"
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#4F46E5]"
                />
            </div>
        </FormFieldShell>
    );
}

function FormFieldShell({
    label,
    required,
    helpText,
    children,
}: {
    label: string;
    required?: boolean;
    helpText?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold text-slate-950">
                {label}
                {required && (
                    <span className="text-red-500"> *</span>
                )}
            </label>

            {children}

            {helpText && (
                <p className="mt-2 text-sm leading-6 text-slate-500">
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

function getMergedFieldOptions(field: Field): FieldOptions {
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

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

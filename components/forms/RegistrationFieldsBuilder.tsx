"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
    Check,
    ChevronDown,
    GripVertical,
    ImagePlus,
    Pencil,
    Phone,
    Plus,
    Save,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type FieldType =
    | "text"
    | "email"
    | "phone"
    | "number"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "image_radio"
    | "image_checkbox"
    | "date"
    | "time"
    | "country"
    | "company"
    | "job_title"
    | "dietary"
    | "file";

type ImageChoiceSubField = {
    id: string;
    label: string;
    value: string;
};

type ImageChoice = {
    id: string;
    label: string;
    description: string;
    image_url: string;
    sub_fields: ImageChoiceSubField[];
};

type FieldOptions = {
    placeholder?: string;
    help_text?: string;
    choices?: string[];
    choice_images?: Record<string, string>;
    choice_descriptions?: Record<string, string>;
    choice_sub_fields?: Record<string, ImageChoiceSubField[]>;
    image_choices?: ImageChoice[];
    country_codes?: string[];
    default_country_code?: string;
    validation?: {
        min_length?: string;
        max_length?: string;
    };
};

type RegistrationField = {
    id: string;
    form_id: string;
    field_label: string;
    field_key: string;
    field_type: FieldType | string;
    is_required: boolean;
    sort_order: number;
    field_options?: FieldOptions | null;
    options?: FieldOptions | null;
    created_at?: string;
};

const fieldTypes: {
    value: FieldType;
    label: string;
    description: string;
}[] = [
        { value: "text", label: "Text", description: "Single-line text input." },
        { value: "email", label: "Email", description: "Email address field." },
        { value: "phone", label: "Phone Number", description: "Phone field with selectable country codes." },
        { value: "number", label: "Number", description: "Numeric input." },
        { value: "textarea", label: "Long Answer", description: "Multi-line text response." },
        { value: "select", label: "Dropdown", description: "Guest chooses one option from a dropdown." },
        { value: "radio", label: "Radio Buttons", description: "Guest chooses one visible option." },
        { value: "checkbox", label: "Checkboxes", description: "Guest can choose multiple options." },
        { value: "image_radio", label: "Image Single Choice", description: "Guest selects one image card, useful for food selection." },
        { value: "image_checkbox", label: "Image Multiple Choice", description: "Guest selects multiple image cards." },
        { value: "date", label: "Date", description: "Date picker field." },
        { value: "time", label: "Time", description: "Time picker field." },
        { value: "country", label: "Country", description: "Country or nationality field." },
        { value: "company", label: "Company", description: "Company or organisation field." },
        { value: "job_title", label: "Job Title", description: "Role or designation field." },
        { value: "dietary", label: "Dietary Requirement", description: "Meal preference or allergy field." },
        { value: "file", label: "File Upload", description: "For supporting documents or images." },
    ];

const commonCountryCodes = [
    { code: "+65", label: "Singapore" },
    { code: "+60", label: "Malaysia" },
    { code: "+62", label: "Indonesia" },
    { code: "+66", label: "Thailand" },
    { code: "+63", label: "Philippines" },
    { code: "+84", label: "Vietnam" },
    { code: "+86", label: "China" },
    { code: "+852", label: "Hong Kong" },
    { code: "+886", label: "Taiwan" },
    { code: "+81", label: "Japan" },
    { code: "+82", label: "South Korea" },
    { code: "+91", label: "India" },
    { code: "+61", label: "Australia" },
    { code: "+44", label: "United Kingdom" },
    { code: "+1", label: "United States / Canada" },
];

const choiceFieldTypes = ["select", "radio", "checkbox"];
const imageChoiceFieldTypes = ["image_radio", "image_checkbox"];

function makeId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function RegistrationFieldsBuilder({
    formId,
    initialFields = [],
}: {
    formId: string;
    initialFields?: RegistrationField[];
}) {
    const safeInitialFields = Array.isArray(initialFields)
        ? initialFields
        : [];

    const [fields, setFields] = useState<RegistrationField[]>(
        [...safeInitialFields].sort(
            (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
        )
    );

    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [uploadingChoiceId, setUploadingChoiceId] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const [label, setLabel] = useState("");
    const [fieldKey, setFieldKey] = useState("");
    const [fieldType, setFieldType] = useState<FieldType>("text");
    const [required, setRequired] = useState(false);
    const [placeholder, setPlaceholder] = useState("");
    const [helpText, setHelpText] = useState("");
    const [choicesText, setChoicesText] = useState("");
    const [imageChoices, setImageChoices] = useState<ImageChoice[]>([]);
    const [countryCodes, setCountryCodes] = useState<string[]>(["+65"]);
    const [defaultCountryCode, setDefaultCountryCode] = useState("+65");
    const [customCountryCode, setCustomCountryCode] = useState("");
    const [minLength, setMinLength] = useState("");
    const [maxLength, setMaxLength] = useState("");

    const selectedType = useMemo(
        () => fieldTypes.find((type) => type.value === fieldType),
        [fieldType]
    );

    function resetForm() {
        setEditingFieldId(null);
        setLabel("");
        setFieldKey("");
        setFieldType("text");
        setRequired(false);
        setPlaceholder("");
        setHelpText("");
        setChoicesText("");
        setImageChoices([]);
        setCountryCodes(["+65"]);
        setDefaultCountryCode("+65");
        setCustomCountryCode("");
        setMinLength("");
        setMaxLength("");
        setMessage("");
    }

    function generateFieldKey(value: string) {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function handleLabelChange(value: string) {
        setLabel(value);

        if (!editingFieldId && !fieldKey) {
            setFieldKey(generateFieldKey(value));
        }
    }

    function getOptionsFromField(field: RegistrationField): FieldOptions {
        return field.field_options || field.options || {};
    }

    function getCleanImageChoices() {
        return imageChoices
            .map((choice) => ({
                ...choice,
                label: choice.label.trim(),
                description: choice.description.trim(),
                image_url: choice.image_url.trim(),
                sub_fields: (choice.sub_fields || [])
                    .map((subField) => ({
                        ...subField,
                        label: subField.label.trim(),
                        value: subField.value.trim(),
                    }))
                    .filter((subField) => subField.label || subField.value),
            }))
            .filter((choice) => choice.label);
    }

    function buildOptions(): FieldOptions {
        const choices = choicesText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

        const cleanImageChoices = getCleanImageChoices();

        const choiceImages: Record<string, string> = {};
        const choiceDescriptions: Record<string, string> = {};
        const choiceSubFields: Record<string, ImageChoiceSubField[]> = {};

        cleanImageChoices.forEach((choice) => {
            choiceImages[choice.label] = choice.image_url;
            choiceDescriptions[choice.label] = choice.description;
            choiceSubFields[choice.label] = choice.sub_fields || [];
        });

        const options: FieldOptions = {
            placeholder: placeholder.trim(),
            help_text: helpText.trim(),
            validation: {
                min_length: minLength.trim(),
                max_length: maxLength.trim(),
            },
        };

        if (choiceFieldTypes.includes(fieldType)) {
            options.choices = choices;
        }

        if (imageChoiceFieldTypes.includes(fieldType)) {
            options.choices = cleanImageChoices.map((choice) => choice.label);
            options.image_choices = cleanImageChoices;
            options.choice_images = choiceImages;
            options.choice_descriptions = choiceDescriptions;
            options.choice_sub_fields = choiceSubFields;
        }

        if (fieldType === "phone") {
            options.country_codes = countryCodes;
            options.default_country_code = defaultCountryCode;
        }

        return options;
    }

    async function addField() {
        setMessage("");

        const cleanLabel = label.trim();
        const cleanKey = generateFieldKey(fieldKey || label);

        if (!cleanLabel || !cleanKey) {
            setMessage("Please enter a field label and field key.");
            return;
        }

        if (choiceFieldTypes.includes(fieldType) && !choicesText.trim()) {
            setMessage("Please add at least one option for this choice field.");
            return;
        }

        if (imageChoiceFieldTypes.includes(fieldType)) {
            const cleanImageChoices = getCleanImageChoices();

            if (cleanImageChoices.length === 0) {
                setMessage("Please add at least one image choice option.");
                return;
            }
        }

        if (fieldType === "phone" && countryCodes.length === 0) {
            setMessage("Please select at least one country code.");
            return;
        }

        const nextSortOrder =
            fields.length > 0
                ? Math.max(...fields.map((field) => Number(field.sort_order || 0))) + 1
                : 1;

        setSavingId("new");

        const { data, error } = await supabase
            .from("registration_fields")
            .insert({
                form_id: formId,
                field_label: cleanLabel,
                field_key: cleanKey,
                field_type: fieldType,
                is_required: required,
                sort_order: nextSortOrder,
                field_options: buildOptions(),
            })
            .select("*")
            .single();

        if (error) {
            setMessage(error.message);
            setSavingId(null);
            return;
        }

        setFields((current) => [...current, data as RegistrationField]);
        resetForm();
        setMessage("Field added successfully.");
        setSavingId(null);
    }

    function editField(field: RegistrationField) {
        const options = getOptionsFromField(field);
        const type = (field.field_type as FieldType) || "text";

        let nextImageChoices: ImageChoice[] = [];

        if (options.image_choices && Array.isArray(options.image_choices)) {
            nextImageChoices = options.image_choices.map((choice) => ({
                id: choice.id || makeId("choice"),
                label: choice.label || "",
                description: choice.description || "",
                image_url: choice.image_url || "",
                sub_fields: (choice.sub_fields || []).map((subField) => ({
                    id: subField.id || makeId("subfield"),
                    label: subField.label || "",
                    value: subField.value || "",
                })),
            }));
        } else if (options.choices && options.choices.length > 0) {
            nextImageChoices = options.choices.map((choice) => ({
                id: makeId("choice"),
                label: choice,
                description: options.choice_descriptions?.[choice] || "",
                image_url: options.choice_images?.[choice] || "",
                sub_fields: (options.choice_sub_fields?.[choice] || []).map((subField) => ({
                    id: subField.id || makeId("subfield"),
                    label: subField.label || "",
                    value: subField.value || "",
                })),
            }));
        }

        setEditingFieldId(field.id);
        setLabel(field.field_label || "");
        setFieldKey(field.field_key || "");
        setFieldType(type);
        setRequired(Boolean(field.is_required));
        setPlaceholder(options.placeholder || "");
        setHelpText(options.help_text || "");
        setChoicesText((options.choices || []).join("\n"));
        setImageChoices(nextImageChoices);
        setCountryCodes(options.country_codes || ["+65"]);
        setDefaultCountryCode(options.default_country_code || "+65");
        setCustomCountryCode("");
        setMinLength(options.validation?.min_length || "");
        setMaxLength(options.validation?.max_length || "");
        setMessage("");
    }

    async function updateField() {
        if (!editingFieldId) return;

        const cleanLabel = label.trim();
        const cleanKey = generateFieldKey(fieldKey || label);

        if (!cleanLabel || !cleanKey) {
            setMessage("Please enter a field label and field key.");
            return;
        }

        if (choiceFieldTypes.includes(fieldType) && !choicesText.trim()) {
            setMessage("Please add at least one option for this choice field.");
            return;
        }

        if (imageChoiceFieldTypes.includes(fieldType)) {
            const cleanImageChoices = getCleanImageChoices();

            if (cleanImageChoices.length === 0) {
                setMessage("Please add at least one image choice option.");
                return;
            }
        }

        if (fieldType === "phone" && countryCodes.length === 0) {
            setMessage("Please select at least one country code.");
            return;
        }

        setSavingId(editingFieldId);
        setMessage("");

        const { data, error } = await supabase
            .from("registration_fields")
            .update({
                field_label: cleanLabel,
                field_key: cleanKey,
                field_type: fieldType,
                is_required: required,
                field_options: buildOptions(),
            })
            .eq("id", editingFieldId)
            .select("*")
            .single();

        if (error) {
            setMessage(error.message);
            setSavingId(null);
            return;
        }

        setFields((current) =>
            current.map((field) =>
                field.id === editingFieldId ? (data as RegistrationField) : field
            )
        );

        resetForm();
        setMessage("Field updated successfully.");
        setSavingId(null);
    }

    async function deleteField(fieldId: string) {
        const confirmed = window.confirm("Delete this field?");
        if (!confirmed) return;

        setDeletingId(fieldId);
        setMessage("");

        const { error } = await supabase
            .from("registration_fields")
            .delete()
            .eq("id", fieldId);

        if (error) {
            setMessage(error.message);
            setDeletingId(null);
            return;
        }

        setFields((current) => current.filter((field) => field.id !== fieldId));
        setDeletingId(null);

        if (editingFieldId === fieldId) {
            resetForm();
        }
    }

    async function moveField(fieldId: string, direction: "up" | "down") {
        const currentIndex = fields.findIndex((field) => field.id === fieldId);
        if (currentIndex === -1) return;

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;

        const updated = [...fields];
        const currentField = updated[currentIndex];
        const targetField = updated[targetIndex];

        updated[currentIndex] = {
            ...targetField,
            sort_order: currentField.sort_order,
        };

        updated[targetIndex] = {
            ...currentField,
            sort_order: targetField.sort_order,
        };

        setFields(updated);

        await supabase
            .from("registration_fields")
            .update({ sort_order: updated[currentIndex].sort_order })
            .eq("id", updated[currentIndex].id);

        await supabase
            .from("registration_fields")
            .update({ sort_order: updated[targetIndex].sort_order })
            .eq("id", updated[targetIndex].id);
    }

    function toggleCountryCode(code: string) {
        setCountryCodes((current) => {
            if (current.includes(code)) {
                const next = current.filter((item) => item !== code);

                if (defaultCountryCode === code) {
                    setDefaultCountryCode(next[0] || "");
                }

                return next;
            }

            if (!defaultCountryCode) {
                setDefaultCountryCode(code);
            }

            return [...current, code];
        });
    }

    function addCustomCountryCode() {
        const cleanCode = customCountryCode.trim();
        if (!cleanCode) return;

        const formatted = cleanCode.startsWith("+") ? cleanCode : `+${cleanCode}`;

        if (!countryCodes.includes(formatted)) {
            setCountryCodes((current) => [...current, formatted]);
        }

        if (!defaultCountryCode) {
            setDefaultCountryCode(formatted);
        }

        setCustomCountryCode("");
    }

    function addImageChoice() {
        setImageChoices((current) => [
            ...current,
            {
                id: makeId("choice"),
                label: "",
                description: "",
                image_url: "",
                sub_fields: [],
            },
        ]);
    }

    function updateImageChoice(
        choiceId: string,
        key: keyof Omit<ImageChoice, "sub_fields">,
        value: string
    ) {
        setImageChoices((current) =>
            current.map((choice) =>
                choice.id === choiceId
                    ? {
                        ...choice,
                        [key]: value,
                    }
                    : choice
            )
        );
    }

    function deleteImageChoice(choiceId: string) {
        setImageChoices((current) =>
            current.filter((choice) => choice.id !== choiceId)
        );
    }

    function addSubField(choiceId: string) {
        setImageChoices((current) =>
            current.map((choice) =>
                choice.id === choiceId
                    ? {
                        ...choice,
                        sub_fields: [
                            ...(choice.sub_fields || []),
                            {
                                id: makeId("subfield"),
                                label: "",
                                value: "",
                            },
                        ],
                    }
                    : choice
            )
        );
    }

    function updateSubField(
        choiceId: string,
        subFieldId: string,
        key: keyof ImageChoiceSubField,
        value: string
    ) {
        setImageChoices((current) =>
            current.map((choice) =>
                choice.id === choiceId
                    ? {
                        ...choice,
                        sub_fields: (choice.sub_fields || []).map((subField) =>
                            subField.id === subFieldId
                                ? {
                                    ...subField,
                                    [key]: value,
                                }
                                : subField
                        ),
                    }
                    : choice
            )
        );
    }

    function deleteSubField(choiceId: string, subFieldId: string) {
        setImageChoices((current) =>
            current.map((choice) =>
                choice.id === choiceId
                    ? {
                        ...choice,
                        sub_fields: (choice.sub_fields || []).filter(
                            (subField) => subField.id !== subFieldId
                        ),
                    }
                    : choice
            )
        );
    }

    async function uploadChoiceImage(choiceId: string, file: File) {
        setUploadingChoiceId(choiceId);
        setMessage("");

        try {
            const safeName = file.name
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, "-");

            const filePath = `${formId}/${Date.now()}-${safeName}`;

            const { error } = await supabase.storage
                .from("registration-choice-images")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (error) {
                setMessage(error.message);
                return;
            }

            const { data } = supabase.storage
                .from("registration-choice-images")
                .getPublicUrl(filePath);

            updateImageChoice(choiceId, "image_url", data.publicUrl);
            setMessage("Image uploaded. Remember to save the field.");
        } finally {
            setUploadingChoiceId(null);
        }
    }

    return (
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">
                            {editingFieldId ? "Edit Field" : "Add New Field"}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Add custom fields and configure how they appear on the public registration form.
                        </p>
                    </div>

                    {editingFieldId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-2xl bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {message && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                        {message}
                    </div>
                )}

                <div className="mt-6 space-y-5">
                    <FormGroup label="Field Label">
                        <input
                            value={label}
                            onChange={(event) => handleLabelChange(event.target.value)}
                            placeholder="e.g. Food Selection"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </FormGroup>

                    <FormGroup label="Field Key">
                        <input
                            value={fieldKey}
                            onChange={(event) => setFieldKey(event.target.value)}
                            placeholder="e.g. food_selection"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                            Used internally when saving guest answers.
                        </p>
                    </FormGroup>

                    <FormGroup label="Field Type">
                        <div className="relative">
                            <select
                                value={fieldType}
                                onChange={(event) => {
                                    const nextType = event.target.value as FieldType;

                                    setFieldType(nextType);

                                    if (nextType === "phone" && countryCodes.length === 0) {
                                        setCountryCodes(["+65"]);
                                        setDefaultCountryCode("+65");
                                    }

                                    if (
                                        imageChoiceFieldTypes.includes(nextType) &&
                                        imageChoices.length === 0
                                    ) {
                                        setImageChoices([
                                            {
                                                id: makeId("choice"),
                                                label: "",
                                                description: "",
                                                image_url: "",
                                                sub_fields: [],
                                            },
                                        ]);
                                    }
                                }}
                                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                            >
                                {fieldTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>

                            <ChevronDown
                                size={18}
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                        </div>

                        {selectedType && (
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                                {selectedType.description}
                            </p>
                        )}
                    </FormGroup>

                    <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                        <div>
                            <p className="font-black text-slate-950">Required Field</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                                Guests must complete this field before submitting.
                            </p>
                        </div>

                        <input
                            type="checkbox"
                            checked={required}
                            onChange={(event) => setRequired(event.target.checked)}
                            className="h-5 w-5 accent-[#4F46E5]"
                        />
                    </label>

                    <FormGroup label="Placeholder">
                        <input
                            value={placeholder}
                            onChange={(event) => setPlaceholder(event.target.value)}
                            placeholder="e.g. Select your meal"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </FormGroup>

                    <FormGroup label="Help Text">
                        <textarea
                            value={helpText}
                            onChange={(event) => setHelpText(event.target.value)}
                            placeholder="e.g. Please choose one meal option."
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </FormGroup>

                    {choiceFieldTypes.includes(fieldType) && (
                        <FormGroup label="Options">
                            <textarea
                                value={choicesText}
                                onChange={(event) => setChoicesText(event.target.value)}
                                placeholder={`Chicken Rice\nVegetarian Bento\nFish Set`}
                                rows={5}
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                            />
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                                Add one option per line.
                            </p>
                        </FormGroup>
                    )}

                    {imageChoiceFieldTypes.includes(fieldType) && (
                        <ImageChoicesEditor
                            imageChoices={imageChoices}
                            uploadingChoiceId={uploadingChoiceId}
                            addImageChoice={addImageChoice}
                            updateImageChoice={updateImageChoice}
                            deleteImageChoice={deleteImageChoice}
                            addSubField={addSubField}
                            updateSubField={updateSubField}
                            deleteSubField={deleteSubField}
                            uploadChoiceImage={uploadChoiceImage}
                        />
                    )}

                    {fieldType === "phone" && (
                        <div className="rounded-[2rem] border border-indigo-100 bg-[#F7F5FF] p-5">
                            <div className="flex items-center gap-2">
                                <Phone size={18} className="text-[#4F46E5]" />
                                <h3 className="font-black text-slate-950">
                                    Phone Country Codes
                                </h3>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Select all country codes guests can choose from.
                            </p>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {commonCountryCodes.map((country) => {
                                    const selected = countryCodes.includes(country.code);

                                    return (
                                        <button
                                            key={country.code}
                                            type="button"
                                            onClick={() => toggleCountryCode(country.code)}
                                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selected
                                                ? "border-[#4F46E5] bg-white text-[#4F46E5]"
                                                : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"
                                                }`}
                                        >
                                            <span>
                                                {country.label}
                                                <span className="ml-2 text-slate-400">
                                                    {country.code}
                                                </span>
                                            </span>

                                            {selected && <Check size={16} />}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-5 flex gap-2">
                                <input
                                    value={customCountryCode}
                                    onChange={(event) =>
                                        setCustomCountryCode(event.target.value)
                                    }
                                    placeholder="Add custom code e.g. +971"
                                    className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5]"
                                />

                                <button
                                    type="button"
                                    onClick={addCustomCountryCode}
                                    className="rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-[#4F46E5]"
                                >
                                    Add
                                </button>
                            </div>

                            {countryCodes.length > 0 && (
                                <FormGroup label="Default Country Code">
                                    <select
                                        value={defaultCountryCode}
                                        onChange={(event) =>
                                            setDefaultCountryCode(event.target.value)
                                        }
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                                    >
                                        {countryCodes.map((code) => (
                                            <option key={code} value={code}>
                                                {code}
                                            </option>
                                        ))}
                                    </select>
                                </FormGroup>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormGroup label="Minimum Length">
                            <input
                                value={minLength}
                                onChange={(event) => setMinLength(event.target.value)}
                                placeholder="Optional"
                                type="number"
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                            />
                        </FormGroup>

                        <FormGroup label="Maximum Length">
                            <input
                                value={maxLength}
                                onChange={(event) => setMaxLength(event.target.value)}
                                placeholder="Optional"
                                type="number"
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                            />
                        </FormGroup>
                    </div>

                    <button
                        type="button"
                        onClick={editingFieldId ? updateField : addField}
                        disabled={savingId !== null}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {editingFieldId ? <Save size={18} /> : <Plus size={18} />}
                        {savingId
                            ? "Saving..."
                            : editingFieldId
                                ? "Save Field"
                                : "Add Field"}
                    </button>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-950">Form Fields</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        These fields will appear on the public registration form in this order.
                    </p>
                </div>

                <div className="mt-6 space-y-4">
                    {fields.map((field, index) => (
                        <SavedFieldCard
                            key={field.id}
                            field={field}
                            index={index}
                            totalFields={fields.length}
                            getOptionsFromField={getOptionsFromField}
                            editField={editField}
                            deleteField={deleteField}
                            deletingId={deletingId}
                            moveField={moveField}
                        />
                    ))}

                    {fields.length === 0 && (
                        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <p className="text-lg font-black text-slate-700">
                                No fields added yet.
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Add your first field to start building the registration form.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function ImageChoicesEditor({
    imageChoices,
    uploadingChoiceId,
    addImageChoice,
    updateImageChoice,
    deleteImageChoice,
    addSubField,
    updateSubField,
    deleteSubField,
    uploadChoiceImage,
}: {
    imageChoices: ImageChoice[];
    uploadingChoiceId: string | null;
    addImageChoice: () => void;
    updateImageChoice: (
        choiceId: string,
        key: keyof Omit<ImageChoice, "sub_fields">,
        value: string
    ) => void;
    deleteImageChoice: (choiceId: string) => void;
    addSubField: (choiceId: string) => void;
    updateSubField: (
        choiceId: string,
        subFieldId: string,
        key: keyof ImageChoiceSubField,
        value: string
    ) => void;
    deleteSubField: (choiceId: string, subFieldId: string) => void;
    uploadChoiceImage: (choiceId: string, file: File) => void;
}) {
    return (
        <div className="rounded-[2rem] border border-indigo-100 bg-[#F7F5FF] p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <ImagePlus size={18} className="text-[#4F46E5]" />
                        <h3 className="font-black text-slate-950">
                            Image Choice Options
                        </h3>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Add options with images and sub-fields. Useful for food choices,
                        gift choices, packages, workshops or activity selection.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addImageChoice}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-[#4F46E5]"
                >
                    <Plus size={16} />
                    Add Option
                </button>
            </div>

            <div className="mt-5 space-y-4">
                {imageChoices.map((choice, index) => (
                    <div
                        key={choice.id}
                        className="rounded-[1.5rem] border border-slate-200 bg-white p-4"
                    >
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <p className="font-black text-slate-950">
                                Option {index + 1}
                            </p>

                            <button
                                type="button"
                                onClick={() => deleteImageChoice(choice.id)}
                                className="rounded-xl bg-red-50 p-2 text-red-500 transition hover:bg-red-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="grid gap-4">
                            <FormGroup label="Option Name">
                                <input
                                    value={choice.label}
                                    onChange={(event) =>
                                        updateImageChoice(
                                            choice.id,
                                            "label",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Chicken Rice"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                                />
                            </FormGroup>

                            <FormGroup label="Description">
                                <textarea
                                    value={choice.description}
                                    onChange={(event) =>
                                        updateImageChoice(
                                            choice.id,
                                            "description",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Roasted chicken with fragrant rice."
                                    rows={2}
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                                />
                            </FormGroup>

                            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                    {choice.image_url ? (
                                        <img
                                            src={choice.image_url}
                                            alt={choice.label}
                                            className="h-40 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-40 items-center justify-center text-slate-400">
                                            <ImagePlus size={34} />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-[#4F46E5] hover:bg-[#F7F5FF]">
                                        {uploadingChoiceId === choice.id ? (
                                            <Upload
                                                size={28}
                                                className="animate-pulse text-[#4F46E5]"
                                            />
                                        ) : (
                                            <ImagePlus
                                                size={28}
                                                className="text-[#4F46E5]"
                                            />
                                        )}

                                        <span className="mt-2 text-sm font-black text-slate-700">
                                            {uploadingChoiceId === choice.id
                                                ? "Uploading..."
                                                : "Upload Image"}
                                        </span>

                                        <span className="mt-1 text-xs font-semibold text-slate-400">
                                            PNG, JPG or WebP
                                        </span>

                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) {
                                                    uploadChoiceImage(choice.id, file);
                                                }
                                            }}
                                        />
                                    </label>

                                    {choice.image_url && (
                                        <input
                                            value={choice.image_url}
                                            onChange={(event) =>
                                                updateImageChoice(
                                                    choice.id,
                                                    "image_url",
                                                    event.target.value
                                                )
                                            }
                                            className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 outline-none"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-black text-slate-950">
                                            Sub Fields
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Add extra details shown under this option.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => addSubField(choice.id)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#4F46E5] shadow-sm transition hover:bg-[#F7F5FF]"
                                    >
                                        <Plus size={14} />
                                        Add Sub Field
                                    </button>
                                </div>

                                <div className="mt-4 space-y-3">
                                    {choice.sub_fields.map((subField) => (
                                        <div
                                            key={subField.id}
                                            className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[1fr_1.4fr_auto]"
                                        >
                                            <input
                                                value={subField.label}
                                                onChange={(event) =>
                                                    updateSubField(
                                                        choice.id,
                                                        subField.id,
                                                        "label",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Label e.g. Allergens"
                                                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                                            />

                                            <input
                                                value={subField.value}
                                                onChange={(event) =>
                                                    updateSubField(
                                                        choice.id,
                                                        subField.id,
                                                        "value",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Value e.g. Contains soy"
                                                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteSubField(choice.id, subField.id)
                                                }
                                                className="rounded-xl bg-red-50 p-3 text-red-500 transition hover:bg-red-100"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}

                                    {choice.sub_fields.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs font-bold text-slate-400">
                                            No sub fields added yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {imageChoices.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <p className="font-black text-slate-700">No image options yet.</p>
                        <button
                            type="button"
                            onClick={addImageChoice}
                            className="mt-4 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white"
                        >
                            Add First Option
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SavedFieldCard({
    field,
    index,
    totalFields,
    getOptionsFromField,
    editField,
    deleteField,
    deletingId,
    moveField,
}: {
    field: RegistrationField;
    index: number;
    totalFields: number;
    getOptionsFromField: (field: RegistrationField) => FieldOptions;
    editField: (field: RegistrationField) => void;
    deleteField: (fieldId: string) => void;
    deletingId: string | null;
    moveField: (fieldId: string, direction: "up" | "down") => void;
}) {
    const options = getOptionsFromField(field);
    const savedImageChoices =
        options.image_choices ||
        (options.choices || []).map((choice) => ({
            id: choice,
            label: choice,
            description: options.choice_descriptions?.[choice] || "",
            image_url: options.choice_images?.[choice] || "",
            sub_fields: options.choice_sub_fields?.[choice] || [],
        }));

    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                    <div className="mt-1 text-slate-400">
                        <GripVertical size={18} />
                    </div>

                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-slate-950">
                                {field.field_label}
                            </h3>

                            {field.is_required && (
                                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                                    Required
                                </span>
                            )}

                            <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-black text-[#4F46E5]">
                                {formatFieldType(field.field_type)}
                            </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Key: {field.field_key}
                        </p>

                        {options.help_text && (
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {options.help_text}
                            </p>
                        )}

                        {field.field_type === "phone" &&
                            options.country_codes &&
                            options.country_codes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {options.country_codes.map((code) => (
                                        <span
                                            key={code}
                                            className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600"
                                        >
                                            {code}
                                            {options.default_country_code === code
                                                ? " default"
                                                : ""}
                                        </span>
                                    ))}
                                </div>
                            )}

                        {choiceFieldTypes.includes(field.field_type) &&
                            options.choices &&
                            options.choices.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {options.choices.map((choice) => (
                                        <span
                                            key={choice}
                                            className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600"
                                        >
                                            {choice}
                                        </span>
                                    ))}
                                </div>
                            )}

                        {imageChoiceFieldTypes.includes(field.field_type) &&
                            savedImageChoices.length > 0 && (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {savedImageChoices.map((choice) => (
                                        <div
                                            key={choice.id || choice.label}
                                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                        >
                                            {choice.image_url ? (
                                                <img
                                                    src={choice.image_url}
                                                    alt={choice.label}
                                                    className="h-28 w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-28 items-center justify-center bg-slate-100 text-slate-400">
                                                    <ImagePlus size={28} />
                                                </div>
                                            )}

                                            <div className="p-3">
                                                <p className="text-sm font-black text-slate-800">
                                                    {choice.label}
                                                </p>

                                                {choice.description && (
                                                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                                        {choice.description}
                                                    </p>
                                                )}

                                                {choice.sub_fields &&
                                                    choice.sub_fields.length > 0 && (
                                                        <div className="mt-3 space-y-1">
                                                            {choice.sub_fields.map(
                                                                (subField, subIndex) => (
                                                                    <div
                                                                        key={
                                                                            subField.id ||
                                                                            `${subField.label}-${subIndex}`
                                                                        }
                                                                        className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                                                                    >
                                                                        <span className="font-black text-slate-500">
                                                                            {subField.label}
                                                                        </span>
                                                                        <span className="font-semibold text-slate-700">
                                                                            {subField.value}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => moveField(field.id, "up")}
                        disabled={index === 0}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                    >
                        Up
                    </button>

                    <button
                        type="button"
                        onClick={() => moveField(field.id, "down")}
                        disabled={index === totalFields - 1}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
                    >
                        Down
                    </button>

                    <button
                        type="button"
                        onClick={() => editField(field)}
                        className="rounded-xl bg-white p-2 text-[#4F46E5] transition hover:bg-indigo-50"
                    >
                        <Pencil size={17} />
                    </button>

                    <button
                        type="button"
                        onClick={() => deleteField(field.id)}
                        disabled={deletingId === field.id}
                        className="rounded-xl bg-white p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function FormGroup({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <p className="mb-2 text-sm font-black text-slate-700">{label}</p>
            {children}
        </label>
    );
}

function formatFieldType(type: string) {
    if (type === "image_radio") return "Image Single Choice";
    if (type === "image_checkbox") return "Image Multiple Choice";
    if (type === "job_title") return "Job Title";

    return type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
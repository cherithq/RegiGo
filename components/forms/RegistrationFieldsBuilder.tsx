"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Field = {
    id: string;
    form_id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    is_required: boolean;
    options: string[] | null;
    sort_order: number;
};

export default function RegistrationFieldsBuilder({
    formId,
    initialFields,
}: {
    formId: string;
    initialFields: Field[];
}) {
    const [fields, setFields] = useState<Field[]>(initialFields);
    const [message, setMessage] = useState("");

    const [newField, setNewField] = useState({
        field_label: "",
        field_key: "",
        field_type: "text",
        is_required: false,
        optionsText: "",
    });

    async function addField(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const options =
            newField.field_type === "radio" ||
                newField.field_type === "dropdown" ||
                newField.field_type === "checkbox"
                ? newField.optionsText
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                : null;

        const { data, error } = await supabase
            .from("registration_fields")
            .insert({
                form_id: formId,
                field_label: newField.field_label,
                field_key: newField.field_key
                    .toLowerCase()
                    .replaceAll(" ", "_")
                    .replace(/[^a-z0-9_]/g, ""),
                field_type: newField.field_type,
                is_required: newField.is_required,
                options,
                sort_order: fields.length + 1,
            })
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setFields([...fields, data]);
        setNewField({
            field_label: "",
            field_key: "",
            field_type: "text",
            is_required: false,
            optionsText: "",
        });
    }

    async function deleteField(id: string) {
        const { error } = await supabase
            .from("registration_fields")
            .delete()
            .eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setFields(fields.filter((field) => field.id !== id));
    }

    async function toggleRequired(field: Field) {
        const { error } = await supabase
            .from("registration_fields")
            .update({ is_required: !field.is_required })
            .eq("id", field.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setFields(
            fields.map((item) =>
                item.id === field.id
                    ? { ...item, is_required: !item.is_required }
                    : item
            )
        );
    }

    return (
        <div className="space-y-8">
            <div className="rounded-3xl bg-[#F7F5FF] p-6">
                <h2 className="text-2xl font-black">Current Fields</h2>

                <div className="mt-5 space-y-3">
                    {fields.map((field) => (
                        <div
                            key={field.id}
                            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                        >
                            <div>
                                <p className="font-black">
                                    {field.field_label}{" "}
                                    {field.is_required && (
                                        <span className="text-red-500">*</span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {field.field_key} · {field.field_type}
                                </p>
                                {field.options && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        Options: {field.options.join(", ")}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleRequired(field)}
                                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold"
                                >
                                    {field.is_required ? "Optional" : "Required"}
                                </button>

                                <button
                                    onClick={() => deleteField(field.id)}
                                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {fields.length === 0 && (
                        <p className="text-slate-500">No fields yet.</p>
                    )}
                </div>
            </div>

            <form onSubmit={addField} className="rounded-3xl bg-white p-6 shadow">
                <h2 className="text-2xl font-black">Add New Field</h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <Input
                        label="Field Label"
                        value={newField.field_label}
                        onChange={(value) =>
                            setNewField({ ...newField, field_label: value })
                        }
                        placeholder="e.g. Department"
                    />

                    <Input
                        label="Field Key"
                        value={newField.field_key}
                        onChange={(value) =>
                            setNewField({ ...newField, field_key: value })
                        }
                        placeholder="e.g. department"
                    />

                    <div>
                        <label className="mb-2 block font-semibold">Field Type</label>
                        <select
                            value={newField.field_type}
                            onChange={(e) =>
                                setNewField({ ...newField, field_type: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="radio">Radio</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="textarea">Textarea</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-3 font-semibold">
                        <input
                            type="checkbox"
                            checked={newField.is_required}
                            onChange={(e) =>
                                setNewField({
                                    ...newField,
                                    is_required: e.target.checked,
                                })
                            }
                            className="h-4 w-4 accent-[#4F46E5]"
                        />
                        Required Field
                    </label>
                </div>

                {(newField.field_type === "radio" ||
                    newField.field_type === "dropdown" ||
                    newField.field_type === "checkbox") && (
                        <div className="mt-5">
                            <label className="mb-2 block font-semibold">
                                Options
                            </label>
                            <textarea
                                value={newField.optionsText}
                                onChange={(e) =>
                                    setNewField({ ...newField, optionsText: e.target.value })
                                }
                                placeholder="Separate options with commas, e.g. Yes, No, Maybe"
                                rows={3}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            />
                        </div>
                    )}

                {message && (
                    <div className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-600">
                        {message}
                    </div>
                )}

                <button className="mt-6 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white">
                    Add Field
                </button>
            </form>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                required
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
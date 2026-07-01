"use client";

import { useState } from "react";

type Field = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    is_required?: boolean;
    options?: string[] | string | null;
};

export default function DynamicRegistrationForm({
    event,
    fields,
    tickets = [],
}: {
    event: any;
    fields: Field[];
    tickets?: any[];
}) {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    function updateAnswer(key: string, value: any) {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    }

    function getOptions(options: any): string[] {
        if (!options) return [];
        if (Array.isArray(options)) return options;

        if (typeof options === "string") {
            try {
                const parsed = JSON.parse(options);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                return options.split(",").map((item) => item.trim()).filter(Boolean);
            }
        }

        return [];
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const fullName =
            answers.full_name || answers.name || answers.guest_name || "";

        const email = answers.email || "";

        if (!fullName || !email) {
            setMessage("Please enter full name and email.");
            setLoading(false);
            return;
        }

        if (event.enable_ticket_types && !answers.ticket_type_id) {
            setMessage("Please select a ticket type.");
            setLoading(false);
            return;
        }

        const res = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventId: event.id,
                answers,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            setMessage(data.error || "Registration failed.");
            setLoading(false);
            return;
        }

        window.location.href = data.passUrl;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {event.enable_ticket_types && (
                <div>
                    <label className="mb-2 block font-semibold">
                        Ticket Type <span className="text-red-500">*</span>
                    </label>

                    <select
                        required
                        value={answers.ticket_type_id || ""}
                        onChange={(e) => updateAnswer("ticket_type_id", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                        <option value="">Select ticket type</option>
                        {tickets.map((ticket) => (
                            <option key={ticket.id} value={ticket.id}>
                                {ticket.ticket_name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {(fields || []).map((field) => (
                <FieldInput
                    key={field.id}
                    field={field}
                    value={answers[field.field_key] || ""}
                    options={getOptions(field.options)}
                    onChange={(value) => updateAnswer(field.field_key, value)}
                />
            ))}

            {message && (
                <div className="rounded-xl bg-red-50 p-4 font-semibold text-red-600">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Submitting..." : "Submit Registration"}
            </button>
        </form>
    );
}

function FieldInput({
    field,
    value,
    options,
    onChange,
}: {
    field: Field;
    value: any;
    options: string[];
    onChange: (value: any) => void;
}) {
    const type = field.field_type || "text";

    if (type === "textarea") {
        return (
            <div>
                <label className="mb-2 block font-semibold">
                    {field.field_label}
                    {field.is_required && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                    required={field.is_required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
            </div>
        );
    }

    if (type === "select") {
        return (
            <div>
                <label className="mb-2 block font-semibold">
                    {field.field_label}
                    {field.is_required && <span className="text-red-500"> *</span>}
                </label>

                <select
                    required={field.is_required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                    <option value="">Select an option</option>
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (type === "radio") {
        return (
            <div>
                <label className="mb-2 block font-semibold">
                    {field.field_label}
                    {field.is_required && <span className="text-red-500"> *</span>}
                </label>

                <div className="space-y-2">
                    {options.map((option) => (
                        <label
                            key={option}
                            className="flex items-center gap-3 rounded-xl bg-[#F7F5FF] p-4 font-semibold"
                        >
                            <input
                                required={field.is_required}
                                type="radio"
                                name={field.field_key}
                                value={option}
                                checked={value === option}
                                onChange={(e) => onChange(e.target.value)}
                                className="accent-[#4F46E5]"
                            />
                            {option}
                        </label>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="mb-2 block font-semibold">
                {field.field_label}
                {field.is_required && <span className="text-red-500"> *</span>}
            </label>

            <input
                required={field.is_required}
                type={type === "email" ? "email" : type === "number" ? "number" : "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
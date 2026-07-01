"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

type Field = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    is_required: boolean;
    options: string[] | null;
};

export default function DynamicRegistrationForm({
    eventId,
    slug,
    fields,
}: {
    eventId: string;
    slug: string;
    fields: Field[];
}) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});

    function updateValue(key: string, value: string) {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { data: registration, error } = await supabase
            .from("registrations")
            .insert({
                event_id: eventId,
                full_name: answers.full_name,
                email: answers.email,
                phone: answers.phone,
                country_code: answers.country_code || "+65",
                department: answers.department,
                dietary_request: answers.dietary_request,
                require_transport: answers.require_transport,
                custom_answers: answers,
                registration_status: "pending",
            })
            .select()
            .single();

        if (error || !registration) {
            setMessage(error?.message || "Failed to submit registration.");
            setLoading(false);
            return;
        }

        const qrToken = uuidv4();

        const { error: qrError } = await supabase.from("qr_tickets").insert({
            registration_id: registration.id,
            event_id: eventId,
            qr_token: qrToken,
            is_active: true,
        });

        if (qrError) {
            setMessage(qrError.message);
            setLoading(false);
            return;
        }

        await fetch("/api/send-registration-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                registrationId: registration.id,
                slug,
            }),
        });

        setLoading(false);
        window.location.href = `/event/${slug}/success?registration=${registration.id}`;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-7">
            {fields.map((field) => (
                <FormField
                    key={field.id}
                    field={field}
                    value={answers[field.field_key] || ""}
                    onChange={(value) => updateValue(field.field_key, value)}
                />
            ))}

            {message && (
                <div className="rounded-2xl bg-red-50 p-4 font-semibold text-red-600">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 text-lg font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Submitting..." : "Submit Registration"}
            </button>
        </form>
    );
}

function FormField({
    field,
    value,
    onChange,
}: {
    field: Field;
    value: string;
    onChange: (value: string) => void;
}) {
    const label = (
        <label className="mb-2 block font-semibold text-slate-900">
            {field.field_label}{" "}
            {field.is_required && <span className="text-red-500">*</span>}
        </label>
    );

    if (field.field_type === "radio") {
        return (
            <div>
                {label}
                <div className="grid gap-3 md:grid-cols-2">
                    {(field.options || []).map((option) => (
                        <label
                            key={option}
                            className="flex items-center gap-3 text-slate-900"
                        >
                            <input
                                type="radio"
                                required={field.is_required}
                                name={field.field_key}
                                value={option}
                                checked={value === option}
                                onChange={(e) => onChange(e.target.value)}
                                className="h-4 w-4 accent-[#4F46E5]"
                            />
                            {option}
                        </label>
                    ))}
                </div>
            </div>
        );
    }

    if (field.field_type === "dropdown") {
        return (
            <div>
                {label}
                <select
                    required={field.is_required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-[#4F46E5] focus:outline-none"
                >
                    <option value="">Select option</option>
                    {(field.options || []).map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (field.field_type === "checkbox") {
        return (
            <div>
                {label}
                <div className="grid gap-3 md:grid-cols-2">
                    {(field.options || []).map((option) => (
                        <label
                            key={option}
                            className="flex items-center gap-3 text-slate-900"
                        >
                            <input
                                type="checkbox"
                                value={option}
                                checked={value.split(",").includes(option)}
                                onChange={(e) => {
                                    const current = value ? value.split(",") : [];

                                    const updated = e.target.checked
                                        ? [...current, option]
                                        : current.filter((item) => item !== option);

                                    onChange(updated.join(","));
                                }}
                                className="h-4 w-4 accent-[#4F46E5]"
                            />
                            {option}
                        </label>
                    ))}
                </div>
            </div>
        );
    }

    if (field.field_type === "phone") {
        return (
            <div>
                {label}
                <div className="grid grid-cols-[140px_1fr]">
                    <select
                        defaultValue="+65"
                        onChange={(e) => {
                            // stored separately only when user changes phone country code
                            localStorage.setItem("country_code", e.target.value);
                        }}
                        className="rounded-l-xl border border-r-0 border-slate-300 bg-white px-4 py-3 text-slate-950"
                    >
                        <option value="+65">🇸🇬 +65</option>
                        <option value="+60">🇲🇾 +60</option>
                        <option value="+86">🇨🇳 +86</option>
                        <option value="+95">🇲🇲 +95</option>
                        <option value="+91">🇮🇳 +91</option>
                    </select>

                    <input
                        required={field.is_required}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Phone Number"
                        className="rounded-r-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none"
                    />
                </div>
            </div>
        );
    }

    if (field.field_type === "textarea") {
        return (
            <div>
                {label}
                <textarea
                    required={field.is_required}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Type here"
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none"
                />
            </div>
        );
    }

    return (
        <div>
            {label}
            <input
                type={
                    field.field_type === "email"
                        ? "email"
                        : field.field_type === "number"
                            ? "number"
                            : field.field_type === "date"
                                ? "date"
                                : "text"
                }
                required={field.is_required}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Type here"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none"
            />
        </div>
    );
}
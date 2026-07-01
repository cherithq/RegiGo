"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Field = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    is_required?: boolean;
    options?: string[] | string | null;
    sort_order?: number;
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
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    function updateAnswer(key: string, value: any) {
        setAnswers((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function getOptions(options: any): string[] {
        if (!options) return [];

        if (Array.isArray(options)) return options;

        if (typeof options === "string") {
            try {
                const parsed = JSON.parse(options);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                return options
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
            }
        }

        return [];
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const fullName =
                answers.full_name ||
                answers.name ||
                answers.guest_name ||
                answers.FullName ||
                "";

            const email = answers.email || answers.Email || "";

            if (!fullName || !email) {
                setMessage("Please enter full name and email.");
                setLoading(false);
                return;
            }

            const { data: registration, error: regError } = await supabase
                .from("registrations")
                .insert({
                    event_id: eventId,
                    full_name: fullName,
                    email,
                    phone: answers.phone || answers.Phone || null,
                    country_code: answers.country_code || "+65",
                    department: answers.department || null,
                    dietary_request: answers.dietary_request || null,
                    require_transport: answers.require_transport || null,
                    ticket_type_id: answers.ticket_type_id || null,
                    custom_answers: answers,
                    registration_status: "pending",
                    email_verified: false,
                })
                .select("*")
                .single();

            if (regError || !registration) {
                setMessage(regError?.message || "Unable to create registration.");
                setLoading(false);
                return;
            }

            const qrToken =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `${registration.id}-${Date.now()}`;

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

            const { error: emailJobError } = await supabase.from("email_jobs").insert({
                event_id: eventId,
                registration_id: registration.id,
                recipient_email: email,
                email_type: "registration_confirmation",
                status: "pending",
            });

            if (emailJobError) {
                console.error("Email job error:", emailJobError.message);
            } else {
                await fetch("/api/email-worker?secret=regigo-worker-secret-123", {
                    method: "POST",
                });
            }

            setLoading(false);
            window.location.href = `/event/${slug}/pass?registration=${registration.id}`;
        } catch (error: any) {
            setMessage(error.message || "Registration failed.");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
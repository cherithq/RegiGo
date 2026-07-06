"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";

export default function EnquiryForm() {
    const [loading, setLoading] = useState(false);
    const [messageType, setMessageType] = useState<"success" | "error" | "">("");
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        full_name: "",
        company_name: "",
        email: "",
        phone: "",
        event_type: "",
        estimated_guests: "",
        event_date: "",
        message: "",
    });

    function update(key: string, value: string) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function submitEnquiry(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);
        setMessage("");
        setMessageType("");

        try {
            const response = await fetch("/api/enquiries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            const result = await response.json();

            if (!response.ok) {
                setMessage(result.error || "Failed to submit enquiry.");
                setMessageType("error");
                return;
            }

            setMessage(result.message || "Enquiry submitted successfully.");
            setMessageType("success");

            setForm({
                full_name: "",
                company_name: "",
                email: "",
                phone: "",
                event_type: "",
                estimated_guests: "",
                event_date: "",
                message: "",
            });
        } catch (error: any) {
            setMessage(error?.message || "Failed to submit enquiry.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={submitEnquiry}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl md:p-8"
        >
            <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                    <Send size={24} />
                </div>

                <div>
                    <h3 className="text-2xl font-black text-slate-950">
                        Submit an Enquiry
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Tell RegiGo about your event. We will review your requirements and
                        prepare the event setup for you.
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input
                    label="Full Name"
                    value={form.full_name}
                    onChange={(value) => update("full_name", value)}
                    required
                />

                <Input
                    label="Company / Organisation"
                    value={form.company_name}
                    onChange={(value) => update("company_name", value)}
                />

                <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => update("email", value)}
                    required
                />

                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => update("phone", value)}
                />

                <Input
                    label="Estimated Guests"
                    type="number"
                    value={form.estimated_guests}
                    onChange={(value) => update("estimated_guests", value)}
                />

                <Input
                    label="Event Date"
                    type="date"
                    value={form.event_date}
                    onChange={(value) => update("event_date", value)}
                />
            </div>

            <div className="mt-4">
                <label className="block">
                    <p className="mb-2 text-sm font-black text-slate-700">Event Type</p>

                    <select
                        value={form.event_type}
                        onChange={(event) => update("event_type", event.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                    >
                        <option value="">Select event type</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="Dinner & Dance">Dinner & Dance</option>
                        <option value="Conference">Conference</option>
                        <option value="Seminar / Workshop">Seminar / Workshop</option>
                        <option value="School Event">School Event</option>
                        <option value="Community Event">Community Event</option>
                        <option value="Others">Others</option>
                    </select>
                </label>
            </div>

            <div className="mt-4">
                <label className="block">
                    <p className="mb-2 text-sm font-black text-slate-700">
                        Event Details
                    </p>

                    <textarea
                        value={form.message}
                        onChange={(event) => update("message", event.target.value)}
                        placeholder="Share your venue, event goals, required features, and any special requirements."
                        rows={5}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                    />
                </label>
            </div>

            {message && (
                <div
                    className={`mt-5 rounded-2xl p-4 text-sm font-bold ${messageType === "success"
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border border-red-100 bg-red-50 text-red-700"
                        }`}
                >
                    <div className="flex items-start gap-2">
                        {messageType === "success" && (
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                        )}
                        <span>{message}</span>
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 text-sm font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting...
                    </>
                ) : (
                    <>
                        Submit Enquiry
                        <ArrowRight size={18} />
                    </>
                )}
            </button>

            <p className="mt-4 text-center text-xs font-semibold leading-5 text-slate-400">
                Submitting an enquiry does not create an account immediately. RegiGo
                will review your request and prepare the event setup.
            </p>
        </form>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <p className="mb-2 text-sm font-black text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </p>

            <input
                type={type}
                value={value}
                required={required}
                onChange={(event) => onChange(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:bg-white"
            />
        </label>
    );
}
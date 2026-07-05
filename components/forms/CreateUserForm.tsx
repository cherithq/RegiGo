"use client";

import { useState } from "react";

type EventOption = {
    id: string;
    event_name: string;
    event_date: string | null;
};

type Role = "admin" | "organizer" | "viewer" | "scanner";

export default function CreateUserForm({ events }: { events: EventOption[] }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "organizer" as Role,
        eventId: events[0]?.id || "",
    });

    function update(key: keyof typeof form, value: string) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    async function createUser(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setSuccess(false);

        const response = await fetch("/api/admin/create-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: form.email,
                password: form.password,
                fullName: form.fullName,
                role: form.role,
                eventId: form.role === "admin" ? null : form.eventId,
                eventRole: form.role === "admin" ? null : form.role,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            setMessage(result.error || "Failed to create user.");
            setLoading(false);
            return;
        }

        setSuccess(true);
        setMessage("User created successfully.");

        setForm({
            fullName: "",
            email: "",
            password: "",
            role: "organizer",
            eventId: events[0]?.id || "",
        });

        setLoading(false);
        window.location.reload();
    }

    return (
        <form onSubmit={createUser} className="space-y-5">
            <Input
                label="Full Name"
                value={form.fullName}
                onChange={(value) => update("fullName", value)}
            />

            <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => update("email", value)}
            />

            <Input
                label="Temporary Password"
                type="password"
                value={form.password}
                onChange={(value) => update("password", value)}
            />

            <div>
                <label className="mb-2 block font-semibold">Account Role</label>
                <select
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#4F46E5] focus:outline-none"
                >
                    <option value="admin">Admin - access everything</option>
                    <option value="organizer">Organizer - manage assigned event</option>
                    <option value="viewer">Viewer - view reports only</option>
                    <option value="scanner">Scanner - QR check-in only</option>
                </select>
            </div>

            {form.role !== "admin" && (
                <div>
                    <label className="mb-2 block font-semibold">Assign Event</label>
                    <select
                        required
                        value={form.eventId}
                        onChange={(e) => update("eventId", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#4F46E5] focus:outline-none"
                    >
                        {events.length === 0 && (
                            <option value="">No events available</option>
                        )}

                        {events.map((event) => (
                            <option key={event.id} value={event.id}>
                                {event.event_name}
                                {event.event_date ? ` - ${event.event_date}` : ""}
                            </option>
                        ))}
                    </select>

                    <p className="mt-2 text-sm text-slate-500">
                        This user will only be able to access this assigned event.
                    </p>
                </div>
            )}

            {message && (
                <div
                    className={`rounded-xl p-4 font-semibold ${
                        success
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                    }`}
                >
                    {message}
                </div>
            )}

            <button
                disabled={loading || (form.role !== "admin" && !form.eventId)}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Creating..." : "Create User"}
            </button>
        </form>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                required
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#4F46E5] focus:outline-none"
            />
        </div>
    );
}

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EventSettingsForm({
    event,
    settings,
}: {
    event: any;
    settings: any;
}) {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const [eventForm, setEventForm] = useState({
        event_name: event.event_name || "",
        event_date: event.event_date || "",
        event_time: event.event_time || "",
        venue: event.venue || "",
        status: event.status || "draft",
        registration_open: event.registration_open ?? true,
        max_guests: event.max_guests || 0,
    });

    const [form, setForm] = useState({
        registration_enabled: settings?.registration_enabled ?? true,
        auto_approve: settings?.auto_approve ?? true,
        enable_waitlist: settings?.enable_waitlist ?? false,
        max_guests: settings?.max_guests ?? 0,

        qr_checkin: settings?.qr_checkin ?? true,
        allow_multiple_scan: settings?.allow_multiple_scan ?? false,
        manual_checkin: settings?.manual_checkin ?? true,

        send_confirmation: settings?.send_confirmation ?? true,
        send_reminder: settings?.send_reminder ?? true,
        send_thank_you: settings?.send_thank_you ?? true,

        public_registration: settings?.public_registration ?? true,
    });

    function updateEvent(key: string, value: any) {
        setEventForm({ ...eventForm, [key]: value });
    }

    function update(key: string, value: any) {
        setForm({ ...form, [key]: value });
    }

    async function saveSettings(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error: eventError } = await supabase
            .from("events")
            .update({
                event_name: eventForm.event_name,
                event_date: eventForm.event_date,
                event_time: eventForm.event_time,
                venue: eventForm.venue,
                status: eventForm.status,
                registration_open: eventForm.registration_open,
                max_guests: Number(eventForm.max_guests || 0),
            })
            .eq("id", event.id);

        if (eventError) {
            setMessage(eventError.message);
            setLoading(false);
            return;
        }

        const { error: settingsError } = await supabase.from("event_settings").upsert(
            {
                event_id: event.id,
                ...form,
                max_guests: Number(form.max_guests || 0),
                updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id" }
        );

        setLoading(false);

        if (settingsError) {
            setMessage(settingsError.message);
            return;
        }

        setMessage("Event settings saved successfully.");
    }

    async function deleteEvent() {
        const confirmText = prompt(
            "Type DELETE to permanently delete this event."
        );

        if (confirmText !== "DELETE") return;

        const { error } = await supabase.from("events").delete().eq("id", event.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        window.location.href = "/dashboard/events";
    }

    return (
        <form onSubmit={saveSettings} className="space-y-8">
            <Section title="General Event Details">
                <Input
                    label="Event Name"
                    value={eventForm.event_name}
                    onChange={(v) => updateEvent("event_name", v)}
                />

                <div className="grid gap-5 md:grid-cols-2">
                    <Input
                        label="Event Date"
                        type="date"
                        value={eventForm.event_date}
                        onChange={(v) => updateEvent("event_date", v)}
                    />

                    <Input
                        label="Event Time"
                        value={eventForm.event_time}
                        onChange={(v) => updateEvent("event_time", v)}
                    />
                </div>

                <Input
                    label="Venue"
                    value={eventForm.venue}
                    onChange={(v) => updateEvent("venue", v)}
                />

                <div>
                    <label className="mb-2 block font-semibold">Status</label>
                    <select
                        value={eventForm.status}
                        onChange={(e) => updateEvent("status", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="closed">Closed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </Section>

            <Section title="Registration Settings">
                <Toggle
                    label="Registration Open"
                    value={eventForm.registration_open}
                    onChange={(v) => updateEvent("registration_open", v)}
                />

                <Toggle
                    label="Enable Registration"
                    value={form.registration_enabled}
                    onChange={(v) => update("registration_enabled", v)}
                />

                <Toggle
                    label="Auto Approve Guests"
                    value={form.auto_approve}
                    onChange={(v) => update("auto_approve", v)}
                />

                <Toggle
                    label="Enable Waitlist"
                    value={form.enable_waitlist}
                    onChange={(v) => update("enable_waitlist", v)}
                />

                <Input
                    label="Maximum Guests"
                    type="number"
                    value={String(form.max_guests)}
                    onChange={(v) => update("max_guests", v)}
                />
            </Section>

            <Section title="QR Check-In Settings">
                <Toggle
                    label="Enable QR Check-In"
                    value={form.qr_checkin}
                    onChange={(v) => update("qr_checkin", v)}
                />

                <Toggle
                    label="Allow Multiple Scan"
                    value={form.allow_multiple_scan}
                    onChange={(v) => update("allow_multiple_scan", v)}
                />

                <Toggle
                    label="Allow Manual Check-In"
                    value={form.manual_checkin}
                    onChange={(v) => update("manual_checkin", v)}
                />
            </Section>

            <Section title="Email Settings">
                <Toggle
                    label="Send Confirmation Email"
                    value={form.send_confirmation}
                    onChange={(v) => update("send_confirmation", v)}
                />

                <Toggle
                    label="Send Reminder Email"
                    value={form.send_reminder}
                    onChange={(v) => update("send_reminder", v)}
                />

                <Toggle
                    label="Send Thank You Email"
                    value={form.send_thank_you}
                    onChange={(v) => update("send_thank_you", v)}
                />
            </Section>

            <Section title="Public Website Settings">
                <Toggle
                    label="Public Registration Page"
                    value={form.public_registration}
                    onChange={(v) => update("public_registration", v)}
                />
            </Section>

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Saving..." : "Save Event Settings"}
            </button>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-2xl font-black text-red-700">Danger Zone</h2>
                <p className="mt-2 text-sm text-red-600">
                    Deleting this event will remove its registrations, QR tickets,
                    check-ins, tables, branding, reports, and settings.
                </p>

                <button
                    type="button"
                    onClick={deleteEvent}
                    className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-black text-white"
                >
                    Delete Event
                </button>
            </div>
        </form>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[2rem] bg-[#F7F5FF] p-6">
            <h2 className="text-2xl font-black">{title}</h2>
            <div className="mt-6 space-y-5">{children}</div>
        </section>
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
                type={type}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}

function Toggle({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between rounded-xl bg-white p-4 font-semibold">
            <span>{label}</span>
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 accent-[#4F46E5]"
            />
        </label>
    );
}
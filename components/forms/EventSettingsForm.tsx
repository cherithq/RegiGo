"use client";

import { useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock,
    Globe2,
    Mail,
    MapPin,
    Save,
    Settings,
    ShieldAlert,
    Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function EventSettingsForm({
    event,
    settings,
}: {
    event: any;
    settings: any;
}) {
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error" | "">("");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [eventForm, setEventForm] = useState({
        event_name: event.event_name || "",
        event_date: event.event_date || "",
        event_time: event.event_time || "",
        venue: event.venue || "",
        description: event.description || "",
        status: event.status || "draft",
        registration_open: event.registration_open ?? true,
        max_guests: event.max_guests || 0,
    });

    const [form, setForm] = useState({
        registration_enabled: settings?.registration_enabled ?? true,
        auto_approve: settings?.auto_approve ?? true,
        enable_waitlist: settings?.enable_waitlist ?? false,
        max_guests: settings?.max_guests ?? event.max_guests ?? 0,

        qr_checkin: settings?.qr_checkin ?? true,
        allow_multiple_scan: settings?.allow_multiple_scan ?? false,
        manual_checkin: settings?.manual_checkin ?? true,

        send_confirmation: settings?.send_confirmation ?? true,
        send_reminder: settings?.send_reminder ?? true,
        send_thank_you: settings?.send_thank_you ?? true,

        public_registration: settings?.public_registration ?? true,
    });

    const eventDetailsChanged = useMemo(() => {
        return (
            String(eventForm.event_name || "") !== String(event.event_name || "") ||
            String(eventForm.event_date || "") !== String(event.event_date || "") ||
            String(eventForm.event_time || "") !== String(event.event_time || "") ||
            String(eventForm.venue || "") !== String(event.venue || "") ||
            String(eventForm.description || "") !== String(event.description || "")
        );
    }, [eventForm, event]);

    function updateEvent(key: string, value: any) {
        setEventForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function update(key: string, value: any) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function triggerEmailWorker() {
        try {
            const response = await fetch("/api/email-worker/trigger", {
                method: "POST",
            });

            const text = await response.text();

            let result: any = {};

            try {
                result = text ? JSON.parse(text) : {};
            } catch {
                result = { raw: text };
            }

            if (!response.ok) {
                console.error("Email worker trigger failed:", result);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Email worker trigger failed:", error);
            return false;
        }
    }

    async function saveSettings(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);
        setMessage("");
        setMessageType("");

        const cleanEventName = eventForm.event_name.trim();
        const cleanVenue = eventForm.venue.trim();
        const cleanDescription = eventForm.description.trim();

        if (!cleanEventName) {
            setMessage("Event name is required.");
            setMessageType("error");
            setLoading(false);
            return;
        }

        const { error: eventError } = await supabase
            .from("events")
            .update({
                event_name: cleanEventName,
                event_date: eventForm.event_date || null,
                event_time: eventForm.event_time || null,
                venue: cleanVenue || null,
                description: cleanDescription || null,
                status: eventForm.status,
                registration_open: eventForm.registration_open,
                max_guests: Number(eventForm.max_guests || 0),
            })
            .eq("id", event.id);

        if (eventError) {
            setMessage(eventError.message);
            setMessageType("error");
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
            {
                onConflict: "event_id",
            }
        );

        if (settingsError) {
            setMessage(settingsError.message);
            setMessageType("error");
            setLoading(false);
            return;
        }

        let emailTriggered = false;

        if (eventDetailsChanged) {
            emailTriggered = await triggerEmailWorker();
        }

        if (eventDetailsChanged && emailTriggered) {
            setMessage("Event settings saved and event update emails sent.");
            setMessageType("success");
        } else if (eventDetailsChanged && !emailTriggered) {
            setMessage(
                "Event settings saved, but event update emails were not sent automatically. Check the email worker trigger."
            );
            setMessageType("error");
        } else {
            setMessage("Event settings saved successfully.");
            setMessageType("success");
        }

        setLoading(false);
    }

    async function deleteEvent() {
        const confirmText = prompt("Type DELETE to permanently delete this event.");

        if (confirmText !== "DELETE") return;

        setDeleting(true);
        setMessage("");
        setMessageType("");

        const { error } = await supabase.from("events").delete().eq("id", event.id);

        if (error) {
            setMessage(error.message);
            setMessageType("error");
            setDeleting(false);
            return;
        }

        window.location.href = "/dashboard/events";
    }

    return (
        <form onSubmit={saveSettings} className="space-y-8">
            <Section
                title="General Event Details"
                description="Update the main event information shown to guests."
                icon={CalendarDays}
            >
                <Input
                    label="Event Name"
                    value={eventForm.event_name}
                    onChange={(value) => updateEvent("event_name", value)}
                />

                <div className="grid gap-5 md:grid-cols-2">
                    <Input
                        label="Event Date"
                        type="date"
                        value={eventForm.event_date}
                        onChange={(value) => updateEvent("event_date", value)}
                        icon={CalendarDays}
                    />

                    <Input
                        label="Event Time"
                        value={eventForm.event_time}
                        onChange={(value) => updateEvent("event_time", value)}
                        icon={Clock}
                    />
                </div>

                <Input
                    label="Venue"
                    value={eventForm.venue}
                    onChange={(value) => updateEvent("venue", value)}
                    icon={MapPin}
                />

                <TextArea
                    label="Event Description"
                    value={eventForm.description}
                    onChange={(value) => updateEvent("description", value)}
                    placeholder="Add event description or important notes for guests."
                />

                <div className="grid gap-5 md:grid-cols-2">
                    <Select
                        label="Status"
                        value={eventForm.status}
                        onChange={(value) => updateEvent("status", value)}
                        options={[
                            { label: "Draft", value: "draft" },
                            { label: "Published", value: "published" },
                            { label: "Closed", value: "closed" },
                            { label: "Archived", value: "archived" },
                        ]}
                    />

                    <Input
                        label="Maximum Guests"
                        type="number"
                        value={String(eventForm.max_guests)}
                        onChange={(value) => updateEvent("max_guests", value)}
                    />
                </div>

                {eventDetailsChanged && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                        <div className="flex gap-3">
                            <Mail size={18} className="mt-0.5 shrink-0" />
                            <p>
                                Event details have changed. After saving, registered guests will
                                receive an event update email if the database trigger is active.
                            </p>
                        </div>
                    </div>
                )}
            </Section>

            <Section
                title="Registration Settings"
                description="Control whether guests can register and how registrations are handled."
                icon={Settings}
            >
                <Toggle
                    label="Registration Open"
                    description="Allow guests to access and submit the registration form."
                    value={eventForm.registration_open}
                    onChange={(value) => updateEvent("registration_open", value)}
                />

                <Toggle
                    label="Enable Registration"
                    description="Enable the registration system for this event."
                    value={form.registration_enabled}
                    onChange={(value) => update("registration_enabled", value)}
                />

                <Toggle
                    label="Auto Approve Guests"
                    description="Automatically confirm guests after they submit the form."
                    value={form.auto_approve}
                    onChange={(value) => update("auto_approve", value)}
                />

                <Toggle
                    label="Enable Waitlist"
                    description="Allow waitlisting when the event reaches capacity."
                    value={form.enable_waitlist}
                    onChange={(value) => update("enable_waitlist", value)}
                />

                <Input
                    label="Registration Limit"
                    type="number"
                    value={String(form.max_guests)}
                    onChange={(value) => update("max_guests", value)}
                />
            </Section>

            <Section
                title="QR Check-In Settings"
                description="Manage check-in rules for event-day operations."
                icon={CheckCircle2}
            >
                <Toggle
                    label="Enable QR Check-In"
                    description="Allow staff to scan QR passes for this event."
                    value={form.qr_checkin}
                    onChange={(value) => update("qr_checkin", value)}
                />

                <Toggle
                    label="Allow Multiple Scan"
                    description="Allow the same QR code to be scanned more than once."
                    value={form.allow_multiple_scan}
                    onChange={(value) => update("allow_multiple_scan", value)}
                />

                <Toggle
                    label="Allow Manual Check-In"
                    description="Allow staff to search and check in guests manually."
                    value={form.manual_checkin}
                    onChange={(value) => update("manual_checkin", value)}
                />
            </Section>

            <Section
                title="Email Settings"
                description="Control which automated event emails should be enabled."
                icon={Mail}
            >
                <Toggle
                    label="Send Confirmation Email"
                    description="Send guests a confirmation email after registration."
                    value={form.send_confirmation}
                    onChange={(value) => update("send_confirmation", value)}
                />

                <Toggle
                    label="Send Reminder Email"
                    description="Allow reminder emails to be sent before the event."
                    value={form.send_reminder}
                    onChange={(value) => update("send_reminder", value)}
                />

                <Toggle
                    label="Send Thank You Email"
                    description="Allow thank-you emails to be sent after the event."
                    value={form.send_thank_you}
                    onChange={(value) => update("send_thank_you", value)}
                />
            </Section>

            <Section
                title="Public Website Settings"
                description="Manage whether the public registration website is visible."
                icon={Globe2}
            >
                <Toggle
                    label="Public Registration Page"
                    description="Make the event registration page publicly accessible."
                    value={form.public_registration}
                    onChange={(value) => update("public_registration", value)}
                />
            </Section>

            {message && (
                <div
                    className={`rounded-2xl p-5 text-sm font-bold ${messageType === "success"
                            ? "border border-green-100 bg-green-50 text-green-700"
                            : "border border-red-100 bg-red-50 text-red-700"
                        }`}
                >
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || deleting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Save size={18} />
                {loading ? "Saving..." : "Save Event Settings"}
            </button>

            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white p-3 text-red-600">
                        <ShieldAlert size={24} />
                    </div>

                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-red-700">Danger Zone</h2>
                        <p className="mt-2 text-sm leading-6 text-red-600">
                            Deleting this event will remove its registrations, QR tickets,
                            check-ins, tables, branding, reports, and settings.
                        </p>

                        <button
                            type="button"
                            onClick={deleteEvent}
                            disabled={loading || deleting}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2 size={17} />
                            {deleting ? "Deleting..." : "Delete Event"}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}

function Section({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description: string;
    icon: any;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex gap-4">
                <div className="h-fit rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                    <Icon size={22} />
                </div>

                <div>
                    <h2 className="text-2xl font-black text-slate-950">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>

            <div className="mt-6 space-y-5">{children}</div>
        </section>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    icon: Icon,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    icon?: any;
}) {
    return (
        <label className="block">
            <p className="mb-2 text-sm font-black text-slate-700">{label}</p>

            <div className="relative">
                {Icon && (
                    <Icon
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}

                <input
                    type={type}
                    value={value || ""}
                    onChange={(event) => onChange(event.target.value)}
                    className={`h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white ${Icon ? "pl-11" : ""
                        }`}
                />
            </div>
        </label>
    );
}

function TextArea({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block">
            <p className="mb-2 text-sm font-black text-slate-700">{label}</p>

            <textarea
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white"
            />
        </label>
    );
}

function Select({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
}) {
    return (
        <label className="block">
            <p className="mb-2 text-sm font-black text-slate-700">{label}</p>

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Toggle({
    label,
    description,
    value,
    onChange,
}: {
    label: string;
    description: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 transition hover:bg-[#F7F5FF]">
            <div>
                <p className="font-black text-slate-950">{label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            </div>

            <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => onChange(event.target.checked)}
                className="h-5 w-5 shrink-0 accent-[#4F46E5]"
            />
        </label>
    );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EventSettingsForm({ event }: { event: any }) {
    const [status, setStatus] = useState(event.status || "draft");
    const [registrationOpen, setRegistrationOpen] = useState(
        event.registration_open ?? true
    );
    const [message, setMessage] = useState("");

    async function saveSettings() {
        setMessage("");

        const { error } = await supabase
            .from("events")
            .update({
                status,
                registration_open: registrationOpen,
            })
            .eq("id", event.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Settings updated successfully.");
    }

    const publicLink =
        typeof window !== "undefined"
            ? `${window.location.origin}/event/${event.event_slug}`
            : `/event/${event.event_slug}`;

    async function deleteEvent() {
        const confirmDelete = confirm(
            "Are you sure you want to delete this event? This cannot be undone."
        );

        if (!confirmDelete) return;

        const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", event.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        window.location.href = "/dashboard/events";
    }

    return (
        <div className="space-y-6">
            <div>
                <label className="mb-2 block font-semibold">Event Status</label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            <label className="flex items-center gap-3 font-semibold">
                <input
                    type="checkbox"
                    checked={registrationOpen}
                    onChange={(e) => setRegistrationOpen(e.target.checked)}
                    className="h-4 w-4 accent-[#4F46E5]"
                />
                Registration Open
            </label>

            <div className="rounded-2xl bg-[#F7F5FF] p-5">
                <p className="font-black">Public Event Link</p>
                <p className="mt-2 break-all text-sm text-slate-600">{publicLink}</p>
            </div>

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                onClick={saveSettings}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg"
            >
                Save Settings
            </button>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-black text-red-700">Danger Zone</h3>
                <p className="mt-2 text-sm text-red-600">
                    Delete this event permanently. This will remove registrations, QR tickets,
                    check-ins, branding, and reports linked to this event.
                </p>

                <button
                    type="button"
                    onClick={deleteEvent}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-black text-white"
                >
                    Delete Event
                </button>
            </div>
        </div>
    );
}
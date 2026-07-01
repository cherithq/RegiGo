"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/lib/supabase";

export default function BadgeDesigner({
    event,
    template,
    guests,
}: {
    event: any;
    template: any;
    guests: any[];
}) {
    const [selectedGuest, setSelectedGuest] = useState(guests[0] || null);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        badge_name: template?.badge_name || "Default Badge",
        badge_size: template?.badge_size || "A6",
        show_logo: template?.show_logo ?? true,
        show_event_name: template?.show_event_name ?? true,
        show_guest_name: template?.show_guest_name ?? true,
        show_department: template?.show_department ?? true,
        show_table: template?.show_table ?? true,
        show_qr: template?.show_qr ?? true,
        primary_color: template?.primary_color || "#4F46E5",
        secondary_color: template?.secondary_color || "#EC4899",
        background_color: template?.background_color || "#FFFFFF",
        text_color: template?.text_color || "#0F172A",
    });

    function update(key: string, value: any) {
        setForm({ ...form, [key]: value });
    }

    async function saveTemplate() {
        setMessage("");

        const { error } = await supabase.from("badge_templates").upsert(
            {
                event_id: event.id,
                ...form,
            },
            {
                onConflict: "event_id",
            }
        );

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Badge template saved.");
    }

    function printBadge() {
        window.print();
    }

    const tableAssignment = Array.isArray(selectedGuest?.table_assignments)
        ? selectedGuest?.table_assignments[0]
        : selectedGuest?.table_assignments;

    const tableName = tableAssignment?.event_tables?.table_name || "-";

    return (
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <section className="space-y-6 rounded-[2rem] bg-[#F7F5FF] p-6">
                <h2 className="text-2xl font-black">Customize Badge</h2>

                <Input
                    label="Badge Name"
                    value={form.badge_name}
                    onChange={(v) => update("badge_name", v)}
                />

                <div>
                    <label className="mb-2 block font-semibold">Preview Guest</label>
                    <select
                        value={selectedGuest?.id || ""}
                        onChange={(e) =>
                            setSelectedGuest(
                                guests.find((guest) => guest.id === e.target.value)
                            )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                        {guests.map((guest) => (
                            <option key={guest.id} value={guest.id}>
                                {guest.full_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block font-semibold">Badge Size</label>
                    <select
                        value={form.badge_size}
                        onChange={(e) => update("badge_size", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                        <option value="A6">A6</option>
                        <option value="A7">A7</option>
                        <option value="CARD">Credit Card</option>
                    </select>
                </div>

                <div className="grid gap-3">
                    <Toggle label="Show Logo" value={form.show_logo} onChange={(v) => update("show_logo", v)} />
                    <Toggle label="Show Event Name" value={form.show_event_name} onChange={(v) => update("show_event_name", v)} />
                    <Toggle label="Show Guest Name" value={form.show_guest_name} onChange={(v) => update("show_guest_name", v)} />
                    <Toggle label="Show Department" value={form.show_department} onChange={(v) => update("show_department", v)} />
                    <Toggle label="Show Table" value={form.show_table} onChange={(v) => update("show_table", v)} />
                    <Toggle label="Show QR Code" value={form.show_qr} onChange={(v) => update("show_qr", v)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Color label="Primary" value={form.primary_color} onChange={(v) => update("primary_color", v)} />
                    <Color label="Secondary" value={form.secondary_color} onChange={(v) => update("secondary_color", v)} />
                    <Color label="Background" value={form.background_color} onChange={(v) => update("background_color", v)} />
                    <Color label="Text" value={form.text_color} onChange={(v) => update("text_color", v)} />
                </div>

                {message && (
                    <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                        {message}
                    </div>
                )}

                <button
                    onClick={saveTemplate}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white"
                >
                    Save Badge Template
                </button>

                <button
                    onClick={printBadge}
                    className="w-full rounded-2xl bg-slate-950 px-6 py-4 font-black text-white"
                >
                    Print Preview Badge
                </button>
            </section>

            <section className="flex items-center justify-center rounded-[2rem] bg-slate-100 p-10">
                {selectedGuest ? (
                    <div className="print-area">
                        <BadgePreview
                            form={form}
                            event={event}
                            guest={selectedGuest}
                            tableName={tableName}
                        />
                    </div>
                ) : (
                    <div className="text-center text-slate-500">
                        No guests available for preview.
                    </div>
                )}
            </section>
        </div>
    );
}

function BadgePreview({
    form,
    event,
    guest,
    tableName,
}: {
    form: any;
    event: any;
    guest: any;
    tableName: string;
}) {
    const qrValue = guest.id;

    const sizeClass =
        form.badge_size === "A7"
            ? "w-[300px] min-h-[420px]"
            : form.badge_size === "CARD"
                ? "w-[340px] min-h-[220px]"
                : "w-[420px] min-h-[590px]";

    return (
        <div
            className={`${sizeClass} overflow-hidden rounded-[2rem] p-8 text-center shadow-2xl`}
            style={{
                backgroundColor: form.background_color,
                color: form.text_color,
            }}
        >
            <div
                className="rounded-3xl p-6 text-white"
                style={{
                    background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
                }}
            >
                {form.show_logo && (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black">
                        R
                    </div>
                )}

                {form.show_event_name && (
                    <h2 className="mt-5 text-2xl font-black">{event.event_name}</h2>
                )}

                <p className="mt-2 text-sm text-white/80">{event.event_date}</p>
            </div>

            <div className="py-8">
                {form.show_guest_name && (
                    <h1 className="text-4xl font-black">{guest.full_name}</h1>
                )}

                {form.show_department && (
                    <p className="mt-3 text-lg font-bold text-slate-500">
                        {guest.department || "-"}
                    </p>
                )}

                {form.show_table && (
                    <div className="mx-auto mt-6 inline-flex rounded-full bg-slate-100 px-5 py-2 text-sm font-black">
                        {tableName}
                    </div>
                )}

                {form.show_qr && (
                    <div className="mx-auto mt-8 flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-4 shadow-inner">
                        <QRCode value={qrValue} size={130} />
                    </div>
                )}
            </div>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                value={value}
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
            {label}
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 accent-[#4F46E5]"
            />
        </label>
    );
}

function Color({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold">{label}</label>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-12 w-full rounded-xl"
            />
        </div>
    );
}
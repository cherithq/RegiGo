"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AgendaManager({
    eventId,
    initialAgenda,
    speakers,
}: {
    eventId: string;
    initialAgenda: any[];
    speakers: any[];
}) {
    const [agenda, setAgenda] = useState(initialAgenda);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        speaker_id: "",
        session_type: "Session",
        display_order: "1",
    });

    function update(key: string, value: string) {
        setForm({ ...form, [key]: value });
    }

    async function addAgenda(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const { data, error } = await supabase
            .from("event_agenda")
            .insert({
                event_id: eventId,
                title: form.title,
                description: form.description,
                start_time: form.start_time || null,
                end_time: form.end_time || null,
                location: form.location,
                speaker_id: form.speaker_id || null,
                session_type: form.session_type,
                display_order: Number(form.display_order || 1),
            })
            .select("*, speakers(*)")
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setAgenda([...agenda, data]);
        setForm({
            title: "",
            description: "",
            start_time: "",
            end_time: "",
            location: "",
            speaker_id: "",
            session_type: "Session",
            display_order: String(agenda.length + 2),
        });
    }

    async function deleteAgenda(id: string) {
        const ok = confirm("Delete this agenda item?");
        if (!ok) return;

        const { error } = await supabase.from("event_agenda").delete().eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setAgenda(agenda.filter((item) => item.id !== id));
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <h2 className="text-2xl font-black">Programme Timeline</h2>

                <div className="mt-6 space-y-4">
                    {agenda.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-black text-[#4F46E5]">
                                        {item.start_time || "-"} {item.end_time ? `- ${item.end_time}` : ""}
                                    </p>

                                    <h3 className="mt-2 text-xl font-black">{item.title}</h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {item.session_type} {item.location ? `· ${item.location}` : ""}
                                    </p>

                                    {item.speakers && (
                                        <p className="mt-2 text-sm font-bold text-slate-700">
                                            Speaker: {item.speakers.full_name}
                                        </p>
                                    )}

                                    {item.description && (
                                        <p className="mt-3 text-sm leading-6 text-slate-600">
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => deleteAgenda(item.id)}
                                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {agenda.length === 0 && (
                        <div className="rounded-2xl bg-white p-8 text-center">
                            <div className="text-5xl">🗓️</div>
                            <h3 className="mt-4 text-2xl font-black">No agenda yet</h3>
                            <p className="mt-2 text-slate-500">
                                Add your event programme and schedule.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-black">Add Agenda Item</h2>

                <form onSubmit={addAgenda} className="mt-6 space-y-5">
                    <Input label="Title" value={form.title} onChange={(v) => update("title", v)} />

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Start Time" type="time" value={form.start_time} onChange={(v) => update("start_time", v)} required={false} />
                        <Input label="End Time" type="time" value={form.end_time} onChange={(v) => update("end_time", v)} required={false} />
                    </div>

                    <Input label="Location" value={form.location} onChange={(v) => update("location", v)} required={false} />

                    <div>
                        <label className="mb-2 block font-semibold">Session Type</label>
                        <select
                            value={form.session_type}
                            onChange={(e) => update("session_type", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                        >
                            <option value="Registration">Registration</option>
                            <option value="Opening">Opening</option>
                            <option value="Keynote">Keynote</option>
                            <option value="Panel">Panel</option>
                            <option value="Break">Break</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Dinner">Dinner</option>
                            <option value="Networking">Networking</option>
                            <option value="Lucky Draw">Lucky Draw</option>
                            <option value="Closing">Closing</option>
                            <option value="Session">Session</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block font-semibold">Speaker</label>
                        <select
                            value={form.speaker_id}
                            onChange={(e) => update("speaker_id", e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                        >
                            <option value="">No speaker</option>
                            {speakers.map((speaker) => (
                                <option key={speaker.id} value={speaker.id}>
                                    {speaker.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Display Order"
                        type="number"
                        value={form.display_order}
                        onChange={(v) => update("display_order", v)}
                    />

                    <div>
                        <label className="mb-2 block font-semibold">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => update("description", e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            placeholder="Session details..."
                        />
                    </div>

                    {message && (
                        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                            {message}
                        </div>
                    )}

                    <button className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white">
                        Add Agenda Item
                    </button>
                </form>
            </section>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    required = true,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                required={required}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
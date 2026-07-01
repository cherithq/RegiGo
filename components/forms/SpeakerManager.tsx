"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SpeakerManager({
    eventId,
    initialSpeakers,
}: {
    eventId: string;
    initialSpeakers: any[];
}) {
    const [speakers, setSpeakers] = useState(initialSpeakers);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        full_name: "",
        designation: "",
        company: "",
        biography: "",
        profile_image: "",
        linkedin: "",
        session_title: "",
        session_time: "",
        display_order: "1",
    });

    function update(key: string, value: string) {
        setForm({ ...form, [key]: value });
    }

    async function addSpeaker(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const { data, error } = await supabase
            .from("speakers")
            .insert({
                event_id: eventId,
                full_name: form.full_name,
                designation: form.designation,
                company: form.company,
                biography: form.biography,
                profile_image: form.profile_image,
                linkedin: form.linkedin,
                session_title: form.session_title,
                session_time: form.session_time,
                display_order: Number(form.display_order || 1),
            })
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setSpeakers([...speakers, data]);
        setForm({
            full_name: "",
            designation: "",
            company: "",
            biography: "",
            profile_image: "",
            linkedin: "",
            session_title: "",
            session_time: "",
            display_order: String(speakers.length + 2),
        });
    }

    async function deleteSpeaker(id: string) {
        const ok = confirm("Delete this speaker?");
        if (!ok) return;

        const { error } = await supabase.from("speakers").delete().eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setSpeakers(speakers.filter((speaker) => speaker.id !== id));
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <h2 className="text-2xl font-black">Speaker List</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {speakers.map((speaker) => (
                        <div key={speaker.id} className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-xl font-black text-white">
                                    {speaker.profile_image ? (
                                        <img
                                            src={speaker.profile_image}
                                            alt={speaker.full_name}
                                            className="h-full w-full rounded-2xl object-cover"
                                        />
                                    ) : (
                                        speaker.full_name?.charAt(0)
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-black">{speaker.full_name}</h3>
                                    <p className="text-sm text-slate-500">
                                        {speaker.designation || "-"} {speaker.company ? `· ${speaker.company}` : ""}
                                    </p>

                                    {speaker.session_title && (
                                        <p className="mt-3 rounded-xl bg-[#F7F5FF] px-3 py-2 text-sm font-bold">
                                            {speaker.session_time || "-"} · {speaker.session_title}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {speaker.biography && (
                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    {speaker.biography}
                                </p>
                            )}

                            <button
                                onClick={() => deleteSpeaker(speaker.id)}
                                className="mt-5 rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}

                    {speakers.length === 0 && (
                        <div className="col-span-full rounded-2xl bg-white p-8 text-center">
                            <div className="text-5xl">🎤</div>
                            <h3 className="mt-4 text-2xl font-black">No speakers yet</h3>
                            <p className="mt-2 text-slate-500">
                                Add speakers to display them on your event website.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-black">Add Speaker</h2>

                <form onSubmit={addSpeaker} className="mt-6 space-y-5">
                    <Input label="Full Name" value={form.full_name} onChange={(v) => update("full_name", v)} />
                    <Input label="Designation" value={form.designation} onChange={(v) => update("designation", v)} required={false} />
                    <Input label="Company" value={form.company} onChange={(v) => update("company", v)} required={false} />
                    <Input label="Profile Image URL" value={form.profile_image} onChange={(v) => update("profile_image", v)} required={false} />
                    <Input label="LinkedIn URL" value={form.linkedin} onChange={(v) => update("linkedin", v)} required={false} />
                    <Input label="Session Title" value={form.session_title} onChange={(v) => update("session_title", v)} required={false} />
                    <Input label="Session Time" value={form.session_time} onChange={(v) => update("session_time", v)} placeholder="7:30 PM" required={false} />
                    <Input label="Display Order" type="number" value={form.display_order} onChange={(v) => update("display_order", v)} />

                    <div>
                        <label className="mb-2 block font-semibold">Biography</label>
                        <textarea
                            value={form.biography}
                            onChange={(e) => update("biography", e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            placeholder="Short speaker biography..."
                        />
                    </div>

                    {message && (
                        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                            {message}
                        </div>
                    )}

                    <button className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white">
                        Add Speaker
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
    placeholder,
    required = true,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
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
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
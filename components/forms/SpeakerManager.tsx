"use client";

import { useState } from "react";
import { Loader2, Pencil, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatClockTime } from "@/lib/format-time";

const emptyForm = {
    full_name: "",
    designation: "",
    company: "",
    biography: "",
    profile_image: "",
    linkedin: "",
    session_title: "",
    session_time: "",
    display_order: "1",
};

type SpeakerItem = {
    id: string;
    full_name?: string | null;
    designation?: string | null;
    company?: string | null;
    biography?: string | null;
    profile_image?: string | null;
    linkedin?: string | null;
    session_title?: string | null;
    session_time?: string | null;
    display_order?: number | null;
};

export default function SpeakerManager({
    eventId,
    initialSpeakers,
}: {
    eventId: string;
    initialSpeakers: any[];
}) {
    const [speakers, setSpeakers] = useState(initialSpeakers);
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState(emptyForm);

    function update(key: string, value: string) {
        setForm({ ...form, [key]: value });
    }

    async function uploadProfileImage(file: File) {
        setUploading(true);
        setMessage("");

        try {
            const safeName = file.name
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, "-");
            const filePath = `speakers/${eventId}/${Date.now()}-${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from("event-images")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                setMessage(uploadError.message);
                return;
            }

            const { data } = supabase.storage
                .from("event-images")
                .getPublicUrl(filePath);

            update("profile_image", data.publicUrl);
        } finally {
            setUploading(false);
        }
    }

    function editSpeaker(speaker: SpeakerItem) {
        setEditingId(speaker.id);
        setForm({
            full_name: speaker.full_name || "",
            designation: speaker.designation || "",
            company: speaker.company || "",
            biography: speaker.biography || "",
            profile_image: speaker.profile_image || "",
            linkedin: speaker.linkedin || "",
            session_title: speaker.session_title || "",
            session_time: speaker.session_time || "",
            display_order: String(speaker.display_order ?? 1),
        });
        setMessage("");
    }

    function cancelEdit() {
        setEditingId(null);
        setForm({
            ...emptyForm,
            display_order: String(speakers.length + 1),
        });
        setMessage("");
    }

    async function saveSpeaker(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const payload = {
            full_name: form.full_name,
            designation: form.designation,
            company: form.company,
            biography: form.biography,
            profile_image: form.profile_image,
            linkedin: form.linkedin,
            session_title: form.session_title,
            session_time: form.session_time,
            display_order: Number(form.display_order || 1),
        };

        if (editingId) {
            const { data, error } = await supabase
                .from("speakers")
                .update(payload)
                .eq("id", editingId)
                .select()
                .single();

            if (error) {
                setMessage(error.message);
                return;
            }

            setSpeakers(
                speakers.map((speaker) =>
                    speaker.id === data.id ? data : speaker
                )
            );
            setEditingId(null);
            setForm({
                ...emptyForm,
                display_order: String(speakers.length + 1),
            });
            return;
        }

        const { data, error } = await supabase
            .from("speakers")
            .insert({
                event_id: eventId,
                ...payload,
            })
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setSpeakers([...speakers, data]);
        setForm({
            ...emptyForm,
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

        if (editingId === id) {
            cancelEdit();
        }
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
                                            {speaker.session_time ? formatClockTime(speaker.session_time) : "-"} · {speaker.session_title}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {speaker.biography && (
                                <p className="mt-4 text-sm leading-6 text-slate-600">
                                    {speaker.biography}
                                </p>
                            )}

                            <div className="mt-5 flex gap-2">
                                <button
                                    onClick={() => editSpeaker(speaker)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-black text-[#4F46E5]"
                                >
                                    <Pencil size={14} />
                                    Edit
                                </button>

                                <button
                                    onClick={() => deleteSpeaker(speaker.id)}
                                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600"
                                >
                                    Delete
                                </button>
                            </div>
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
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-black">
                        {editingId ? "Edit Speaker" : "Add Speaker"}
                    </h2>

                    {editingId && (
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                        >
                            <X size={13} />
                            Cancel
                        </button>
                    )}
                </div>

                <form onSubmit={saveSpeaker} className="mt-6 space-y-5">
                    <Input label="Full Name" value={form.full_name} onChange={(v) => update("full_name", v)} />
                    <Input label="Designation" value={form.designation} onChange={(v) => update("designation", v)} required={false} />
                    <Input label="Company" value={form.company} onChange={(v) => update("company", v)} required={false} />

                    <div>
                        <label className="mb-2 block font-semibold">Profile Picture</label>

                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-xl font-black text-white">
                                {form.profile_image ? (
                                    <img
                                        src={form.profile_image}
                                        alt="Profile preview"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    (form.full_name || "?").charAt(0).toUpperCase()
                                )}
                            </div>

                            <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-[#4F46E5] hover:bg-[#F7F5FF]">
                                {uploading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Upload size={16} />
                                )}
                                {uploading ? "Uploading..." : form.profile_image ? "Replace Photo" : "Upload Photo"}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = "";
                                        if (file) void uploadProfileImage(file);
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <Input label="LinkedIn URL" value={form.linkedin} onChange={(v) => update("linkedin", v)} required={false} />
                    <Input label="Session Title" value={form.session_title} onChange={(v) => update("session_title", v)} required={false} />
                    <Input label="Session Time" type="time" value={form.session_time} onChange={(v) => update("session_time", v)} required={false} />
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
                        {editingId ? "Save Changes" : "Add Speaker"}
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
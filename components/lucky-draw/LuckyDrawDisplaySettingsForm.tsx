"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Settings = {
    id?: string;
    event_id: string;
    primary_color?: string;
    secondary_color?: string;
    background_color?: string;
    background_image_url?: string | null;
    background_image_opacity?: number | null;
};

export default function LuckyDrawDisplaySettingsForm({
    eventId,
    initialSettings,
}: {
    eventId: string;
    initialSettings?: Settings | null;
}) {
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        primary_color: initialSettings?.primary_color || "#4F46E5",
        secondary_color: initialSettings?.secondary_color || "#EC4899",
        background_color: initialSettings?.background_color || "#111827",
        background_image_url: initialSettings?.background_image_url || "",
        background_image_opacity: String(
            initialSettings?.background_image_opacity ?? 0.35
        ),
    });

    function update(key: string, value: string) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function uploadBackgroundImage(file: File) {
        setUploading(true);
        setMessage("");

        try {
            const safeName = file.name
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, "-");

            const filePath = `${eventId}/${Date.now()}-${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from("lucky-draw-assets")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                setMessage(uploadError.message);
                return;
            }

            const { data } = supabase.storage
                .from("lucky-draw-assets")
                .getPublicUrl(filePath);

            update("background_image_url", data.publicUrl);
            setMessage("Image uploaded. Click Save Settings to apply it.");
        } finally {
            setUploading(false);
        }
    }

    async function saveSettings() {
        setSaving(true);
        setMessage("");

        try {
            const { error } = await supabase
                .from("lucky_draw_display_settings")
                .upsert(
                    {
                        event_id: eventId,
                        primary_color: form.primary_color,
                        secondary_color: form.secondary_color,
                        background_color: form.background_color,
                        background_image_url:
                            form.background_image_url.trim() || null,
                        background_image_opacity: Number(
                            form.background_image_opacity || 0.35
                        ),
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "event_id",
                    }
                );

            if (error) {
                setMessage(error.message);
                return;
            }

            setMessage("Lucky draw display settings saved.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                    Lucky Draw Display
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                    Customise Colours & Background
                </h1>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                    These settings apply only to this event’s lucky draw audience display.
                </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
                <ColourInput
                    label="Primary Colour"
                    value={form.primary_color}
                    onChange={(value) => update("primary_color", value)}
                />

                <ColourInput
                    label="Secondary Colour"
                    value={form.secondary_color}
                    onChange={(value) => update("secondary_color", value)}
                />

                <ColourInput
                    label="Background Colour"
                    value={form.background_color}
                    onChange={(value) => update("background_color", value)}
                />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
                <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                        Background Image
                    </label>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-[#4F46E5] hover:bg-[#F7F5FF]">
                        {uploading ? (
                            <Loader2
                                className="animate-spin text-[#4F46E5]"
                                size={32}
                            />
                        ) : (
                            <ImagePlus className="text-[#4F46E5]" size={32} />
                        )}

                        <span className="mt-3 text-sm font-black text-slate-700">
                            {uploading ? "Uploading..." : "Upload Background Image"}
                        </span>

                        <span className="mt-1 text-xs font-semibold text-slate-500">
                            PNG, JPG or WebP recommended
                        </span>

                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) uploadBackgroundImage(file);
                            }}
                        />
                    </label>

                    <div className="mt-5">
                        <label className="mb-2 block text-sm font-black text-slate-700">
                            Background Image Opacity
                        </label>

                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={form.background_image_opacity}
                            onChange={(event) =>
                                update(
                                    "background_image_opacity",
                                    event.target.value
                                )
                            }
                            className="w-full"
                        />

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            Current: {form.background_image_opacity}
                        </p>
                    </div>

                    {form.background_image_url && (
                        <button
                            type="button"
                            onClick={() => update("background_image_url", "")}
                            className="mt-5 rounded-2xl bg-slate-100 px-6 py-3 font-black text-slate-700 transition hover:bg-slate-200"
                        >
                            Remove Image
                        </button>
                    )}
                </div>

                <div>
                    <p className="mb-2 text-sm font-black text-slate-700">
                        Preview
                    </p>

                    <div
                        className="relative min-h-[260px] overflow-hidden rounded-[2rem] border border-slate-200 p-6 text-white"
                        style={{
                            background: form.background_color,
                        }}
                    >
                        {form.background_image_url && (
                            <img
                                src={form.background_image_url}
                                alt="Lucky draw background preview"
                                className="absolute inset-0 h-full w-full object-cover"
                                style={{
                                    opacity: Number(
                                        form.background_image_opacity
                                    ),
                                }}
                            />
                        )}

                        <div className="absolute inset-0 bg-black/30" />

                        <div className="relative z-10">
                            <div
                                className="inline-flex rounded-full px-5 py-2 text-sm font-black"
                                style={{
                                    background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
                                }}
                            >
                                Spin Wheel
                            </div>

                            <h2 className="mt-8 text-4xl font-black">
                                Lucky Draw
                            </h2>

                            <div
                                className="mt-6 h-20 w-20 rounded-full"
                                style={{
                                    background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className="mt-6 rounded-xl bg-[#F7F5FF] p-4 text-sm font-bold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <div className="mt-8">
                <button
                    type="button"
                    onClick={saveSettings}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
                >
                    {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </div>
    );
}

function ColourInput({
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
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </label>

            <div className="flex overflow-hidden rounded-xl border border-slate-300">
                <input
                    type="color"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-12 w-16 cursor-pointer border-0 bg-transparent p-1"
                />

                <input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="flex-1 px-4 text-sm font-bold outline-none"
                />
            </div>
        </div>
    );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BrandingForm({
    eventId,
    branding,
}: {
    eventId: string;
    branding: any;
}) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        hero_title: branding?.hero_title || "",
        hero_subtitle: branding?.hero_subtitle || "",
        primary_color: branding?.primary_color || "#4F46E5",
        secondary_color: branding?.secondary_color || "#EC4899",
        background_color: branding?.background_color || "#F7F5FF",
        banner_text_color: branding?.banner_text_color || "#FFFFFF",
        banner_overlay_opacity: branding?.banner_overlay_opacity || 0.45,
    });

    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [pageBgFile, setPageBgFile] = useState<File | null>(null);

    const [bannerPreview, setBannerPreview] = useState(
        branding?.banner_background_url || ""
    );
    const [pagePreview, setPagePreview] = useState(
        branding?.page_background_url || ""
    );

    function update(key: string, value: string | number) {
        setForm({ ...form, [key]: value });
    }

    async function uploadImage(file: File, folder: string) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${folder}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${fileExt}`;

        const { error } = await supabase.storage
            .from("event-images")
            .upload(fileName, file);

        if (error) throw error;

        const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
        return data.publicUrl;
    }

    async function saveBranding(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            let bannerUrl = bannerPreview;
            let pageBgUrl = pagePreview;

            if (bannerFile) {
                bannerUrl = await uploadImage(bannerFile, "banners");
            }

            if (pageBgFile) {
                pageBgUrl = await uploadImage(pageBgFile, "backgrounds");
            }

            const { error } = await supabase
                .from("event_branding")
                .update({
                    ...form,
                    banner_background_url: bannerUrl || null,
                    page_background_url: pageBgUrl || null,
                })
                .eq("event_id", eventId);

            if (error) throw error;

            setMessage("Branding updated successfully.");
        } catch (error: any) {
            setMessage(error.message || "Failed to update branding.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={saveBranding} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2">
                <Input
                    label="Hero Title"
                    value={form.hero_title}
                    onChange={(value) => update("hero_title", value)}
                />

                <Input
                    label="Hero Subtitle"
                    value={form.hero_subtitle}
                    onChange={(value) => update("hero_subtitle", value)}
                />

                <ColorInput
                    label="Primary Color"
                    value={form.primary_color}
                    onChange={(value) => update("primary_color", value)}
                />

                <ColorInput
                    label="Secondary Color"
                    value={form.secondary_color}
                    onChange={(value) => update("secondary_color", value)}
                />

                <ColorInput
                    label="Page Background Color"
                    value={form.background_color}
                    onChange={(value) => update("background_color", value)}
                />

                <ColorInput
                    label="Banner Text Color"
                    value={form.banner_text_color}
                    onChange={(value) => update("banner_text_color", value)}
                />
            </div>

            <div>
                <label className="mb-2 block font-semibold">
                    Banner Overlay Opacity
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={form.banner_overlay_opacity}
                    onChange={(e) =>
                        update("banner_overlay_opacity", Number(e.target.value))
                    }
                    className="w-full"
                />
                <p className="mt-1 text-sm text-slate-500">
                    {Math.round(Number(form.banner_overlay_opacity) * 100)}%
                </p>
            </div>

            <ImageUpload
                title="Banner Image"
                description="Appears at the top of the public event and registration pages."
                icon="🖼️"
                preview={bannerPreview}
                onChange={(file) => {
                    setBannerFile(file);
                    setBannerPreview(URL.createObjectURL(file));
                }}
            />

            <ImageUpload
                title="Webpage Background Image"
                description="Appears behind the event page."
                icon="🌄"
                preview={pagePreview}
                onChange={(file) => {
                    setPageBgFile(file);
                    setPagePreview(URL.createObjectURL(file));
                }}
            />

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Saving..." : "Save Branding"}
            </button>
        </form>
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

function ColorInput({
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
            <div className="flex gap-3">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-12 w-16 rounded-xl"
                />
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
            </div>
        </div>
    );
}

function ImageUpload({
    title,
    description,
    icon,
    preview,
    onChange,
}: {
    title: string;
    description: string;
    icon: string;
    preview: string;
    onChange: (file: File) => void;
}) {
    return (
        <div>
            <label className="mb-3 block font-semibold">{title}</label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-[#4F46E5] hover:bg-[#F7F5FF]">
                {preview ? (
                    <img src={preview} alt={title} className="h-56 w-full rounded-xl object-cover" />
                ) : (
                    <>
                        <div className="mb-3 text-5xl">{icon}</div>
                        <p className="font-bold text-slate-800">{title}</p>
                        <p className="mt-1 text-sm text-slate-500">{description}</p>
                        <span className="mt-4 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-2 text-sm font-bold text-white">
                            Choose Image
                        </span>
                    </>
                )}

                <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        onChange(file);
                    }}
                />
            </label>
        </div>
    );
}
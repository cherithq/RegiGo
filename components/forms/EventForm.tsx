"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EventForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [pageBgFile, setPageBgFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState("");
    const [pagePreview, setPagePreview] = useState("");

    const [form, setForm] = useState({
        event_name: "",
        event_slug: "",
        event_date: "",
        event_time: "",
        venue: "",
        description: "",
        max_guests: "",
        enable_ticket_types: false,
        enable_tables: false,
    });

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    }

    function handleToggle(name: "enable_ticket_types" | "enable_tables") {
        setForm((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
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

        const { data } = supabase.storage
            .from("event-images")
            .getPublicUrl(fileName);

        return data.publicUrl;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const { data: company, error: companyError } = await supabase
                .from("companies")
                .select("id")
                .eq("company_slug", "regigo-demo")
                .maybeSingle();

            if (companyError) throw companyError;
            if (!company) throw new Error("No company found.");

            let bannerUrl = "";
            let pageBgUrl = "";

            if (bannerFile) {
                bannerUrl = await uploadImage(bannerFile, "banners");
            }

            if (pageBgFile) {
                pageBgUrl = await uploadImage(pageBgFile, "backgrounds");
            }

            const { data: event, error: eventError } = await supabase
                .from("events")
                .insert({
                    company_id: company.id,
                    event_name: form.event_name,
                    event_slug: form.event_slug,
                    event_date: form.event_date,
                    event_time: form.event_time,
                    venue: form.venue,
                    description: form.description,
                    max_guests: Number(form.max_guests || 0),
                    status: "draft",
                    enable_ticket_types: form.enable_ticket_types,
                    enable_tables: form.enable_tables,
                })
                .select()
                .single();

            if (eventError || !event) {
                throw eventError || new Error("Failed to create event.");
            }

            await supabase.from("event_branding").insert({
                event_id: event.id,
                hero_title: form.event_name,
                hero_subtitle: form.description,
                banner_background_url: bannerUrl || null,
                page_background_url: pageBgUrl || null,
                banner_overlay_opacity: 0.45,
                banner_text_color: "#FFFFFF",
            });

            const { data: regForm, error: formError } = await supabase
                .from("registration_forms")
                .insert({
                    event_id: event.id,
                    form_title: "Registration Form",
                    form_description: "Please complete your details below.",
                })
                .select()
                .single();

            if (formError) throw formError;

            if (regForm) {
                await supabase.from("registration_fields").insert([
                    {
                        form_id: regForm.id,
                        field_label: "Full Name",
                        field_key: "full_name",
                        field_type: "text",
                        is_required: true,
                        sort_order: 1,
                    },
                    {
                        form_id: regForm.id,
                        field_label: "Email Address",
                        field_key: "email",
                        field_type: "email",
                        is_required: true,
                        sort_order: 2,
                    },
                    {
                        form_id: regForm.id,
                        field_label: "Mobile Number",
                        field_key: "phone",
                        field_type: "phone",
                        is_required: true,
                        sort_order: 3,
                    },
                ]);
            }

            window.location.href = `/dashboard/events/${event.id}/registration`;
        } catch (error: any) {
            setMessage(error.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none";

    return (
        <form onSubmit={handleSubmit} className="space-y-7">
            <Input
                label="Event Name"
                name="event_name"
                value={form.event_name}
                onChange={handleChange}
                required
            />

            <Input
                label="Event Slug"
                name="event_slug"
                value={form.event_slug}
                onChange={handleChange}
                placeholder="dinner-dance-2026"
                required
            />

            <Input
                label="Event Date"
                name="event_date"
                type="date"
                value={form.event_date}
                onChange={handleChange}
                required
            />

            <Input
                label="Event Time"
                name="event_time"
                value={form.event_time}
                onChange={handleChange}
                placeholder="6:30 PM"
                required
            />

            <Input
                label="Venue"
                name="venue"
                value={form.venue}
                onChange={handleChange}
                required
            />

            <Input
                label="Max Guests"
                name="max_guests"
                type="number"
                value={form.max_guests}
                onChange={handleChange}
            />

            <div>
                <label className="mb-2 block font-semibold text-slate-900">
                    Description
                </label>
                <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    className={inputClass}
                    placeholder="Describe your event..."
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                    Registration Options
                </h3>

                <ToggleSwitch
                    title="Enable Ticket Types"
                    description="Turn on if guests must select a ticket type during registration."
                    checked={form.enable_ticket_types}
                    onChange={() => handleToggle("enable_ticket_types")}
                />

                <div className="mt-4">
                    <ToggleSwitch
                        title="Enable Tables"
                        description="Turn on if guests must select a table during registration."
                        checked={form.enable_tables}
                        onChange={() => handleToggle("enable_tables")}
                    />
                </div>
            </div>

            <ImageUpload
                title="Banner Image"
                description="This appears at the top of the event page."
                icon="🖼️"
                preview={bannerPreview}
                onChange={(file) => {
                    setBannerFile(file);
                    setBannerPreview(URL.createObjectURL(file));
                }}
            />

            <ImageUpload
                title="Webpage Background Image"
                description="This appears as the full page background."
                icon="🌄"
                preview={pagePreview}
                onChange={(file) => {
                    setPageBgFile(file);
                    setPagePreview(URL.createObjectURL(file));
                }}
            />

            {message && (
                <div className="rounded-xl bg-red-50 p-4 font-semibold text-red-600">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Creating..." : "Create Event"}
            </button>
        </form>
    );
}

function ToggleSwitch({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-4">
            <div>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{description}</p>
            </div>

            <button
                type="button"
                onClick={onChange}
                className={`relative h-8 w-14 rounded-full transition ${checked ? "bg-[#4F46E5]" : "bg-slate-300"
                    }`}
            >
                <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${checked ? "left-7" : "left-1"
                        }`}
                />
            </button>
        </div>
    );
}

function Input({
    label,
    name,
    value,
    onChange,
    type = "text",
    placeholder = "Type here",
    required = false,
}: {
    label: string;
    name: string;
    value: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold text-slate-900">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-[#4F46E5] focus:outline-none"
            />
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
            <label className="mb-3 block font-semibold text-slate-900">
                {title}
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-[#4F46E5] hover:bg-[#F7F5FF]">
                {preview ? (
                    <img
                        src={preview}
                        alt={title}
                        className="h-56 w-full rounded-xl object-cover"
                    />
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

            {preview && (
                <p className="mt-2 text-sm text-slate-500">
                    Click the image box again to replace it.
                </p>
            )}
        </div>
    );
}
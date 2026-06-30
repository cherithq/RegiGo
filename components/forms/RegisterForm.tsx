"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        full_name: "",
        company_name: "",
        job_title: "",
        country_code: "+65",
        phone: "",
        email: "",
        password: "",
        confirm_password: "",
        agreed: false,
    });

    function update(key: string, value: string | boolean) {
        setForm({ ...form, [key]: value });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        if (form.password !== form.confirm_password) {
            setMessage("Passwords do not match.");
            return;
        }

        if (!form.agreed) {
            setMessage("Please agree to the Terms and Privacy Policy.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
                data: {
                    full_name: form.full_name,
                    company_name: form.company_name,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            await supabase.from("profiles").upsert({
                id: data.user.id,
                full_name: form.full_name,
                email: form.email,
                role: "organizer",
            });

            await supabase.from("companies").insert({
                company_name: form.company_name,
                company_slug: form.company_name
                    .toLowerCase()
                    .replaceAll(" ", "-")
                    .replace(/[^a-z0-9-]/g, ""),
                contact_email: form.email,
            });
        }

        setLoading(false);
        setMessage("Account created. Please check your email to verify.");
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
                <Input label="Full Name" value={form.full_name} onChange={(v) => update("full_name", v)} />
                <Input label="Company Name" value={form.company_name} onChange={(v) => update("company_name", v)} />
            </div>

            <Input label="Job Title" value={form.job_title} onChange={(v) => update("job_title", v)} required={false} />

            <div>
                <label className="mb-2 block font-semibold">Mobile Number</label>
                <div className="grid grid-cols-[120px_1fr]">
                    <select
                        value={form.country_code}
                        onChange={(e) => update("country_code", e.target.value)}
                        className="rounded-l-xl border border-r-0 border-slate-300 bg-white px-3 py-3 text-slate-950"
                    >
                        <option value="+65">🇸🇬 +65</option>
                        <option value="+60">🇲🇾 +60</option>
                        <option value="+86">🇨🇳 +86</option>
                        <option value="+95">🇲🇲 +95</option>
                    </select>

                    <input
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="Phone number"
                        className="rounded-r-xl border border-slate-300 px-4 py-3 text-slate-950"
                    />
                </div>
            </div>

            <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} />
            <Input label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} />
            <Input label="Confirm Password" type="password" value={form.confirm_password} onChange={(v) => update("confirm_password", v)} />

            <label className="flex items-start gap-3 text-sm text-slate-600">
                <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => update("agreed", e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#4F46E5]"
                />
                <span>
                    I agree to the Terms of Service and Privacy Policy.
                </span>
            </label>

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 text-sm font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Creating..." : "Create Account"}
            </button>
        </form>
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 focus:border-[#4F46E5] focus:outline-none"
            />
        </div>
    );
}
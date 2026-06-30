"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileForm({
    user,
    profile,
}: {
    user: any;
    profile: any;
}) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        full_name: profile?.full_name || "",
        email: user?.email || profile?.email || "",
        role: profile?.role || "organizer",
    });

    function update(key: string, value: string) {
        setForm({ ...form, [key]: value });
    }

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (!user?.id) {
            setMessage("User not found. Please login again.");
            setLoading(false);
            return;
        }

        const { error: profileError } = await supabase.from("profiles").upsert({
            id: user.id,
            full_name: form.full_name,
            email: form.email,
            role: form.role,
        });

        if (profileError) {
            setMessage(profileError.message);
            setLoading(false);
            return;
        }

        if (form.email !== user.email) {
            const { error: emailError } = await supabase.auth.updateUser({
                email: form.email,
            });

            if (emailError) {
                setMessage(emailError.message);
                setLoading(false);
                return;
            }
        }

        setMessage("Profile updated successfully.");
        setLoading(false);
    }

    return (
        <form onSubmit={saveProfile} className="space-y-6">
            <Input
                label="Full Name"
                value={form.full_name}
                onChange={(v) => update("full_name", v)}
            />

            <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => update("email", v)}
            />

            <div>
                <label className="mb-2 block font-semibold">Role</label>
                <input
                    value={form.role}
                    disabled
                    className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-500"
                />
                <p className="mt-1 text-sm text-slate-500">
                    Role is managed by the workspace admin.
                </p>
            </div>

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Saving..." : "Save Profile"}
            </button>
        </form>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                required
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-[#4F46E5] focus:outline-none"
            />
        </div>
    );
}
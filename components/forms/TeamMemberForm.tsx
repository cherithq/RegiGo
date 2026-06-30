"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TeamMemberForm({ companyId }: { companyId: string }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        role: "viewer",
    });

    async function addMember(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (!companyId) {
            setMessage("Company not found.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.from("team_members").insert({
            company_id: companyId,
            full_name: form.full_name,
            email: form.email,
            role: form.role,
            status: "active",
        });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        window.location.reload();
    }

    return (
        <form onSubmit={addMember} className="space-y-5">
            <Input
                label="Full Name"
                value={form.full_name}
                onChange={(value) => setForm({ ...form, full_name: value })}
            />

            <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
            />

            <div>
                <label className="mb-2 block font-semibold">Role</label>
                <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                    <option value="admin">Admin</option>
                    <option value="event_manager">Event Manager</option>
                    <option value="check_in_staff">Check-in Staff</option>
                    <option value="viewer">Viewer</option>
                </select>
            </div>

            {message && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Adding..." : "Add Member"}
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
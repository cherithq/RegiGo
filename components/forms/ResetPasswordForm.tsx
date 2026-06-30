"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordForm() {
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.updateUser({
            password,
        });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Password updated successfully. Redirecting...");
        setTimeout(() => {
            window.location.href = "/auth/login";
        }, 1200);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="mb-2 block font-semibold">New Password</label>
                <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 focus:border-[#4F46E5] focus:outline-none"
                />
            </div>

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 text-sm font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Updating..." : "Update Password"}
            </button>
        </form>
    );
}
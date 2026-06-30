"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
        });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        window.location.href = "/dashboard";
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="mb-2 block font-semibold">Email</label>
                <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 focus:border-[#4F46E5] focus:outline-none"
                />
            </div>

            <div>
                <label className="mb-2 block font-semibold">Password</label>
                <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 focus:border-[#4F46E5] focus:outline-none"
                />
            </div>

            {message && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                    {message}
                </div>
            )}
            <div className="text-right">
                <Link href="/auth/forgot-password" className="text-sm font-bold text-[#4F46E5]">
                    Forgot password?
                </Link>
            </div>
            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Logging in..." : "Login"}
            </button>

            <p className="text-center text-sm text-slate-500">
                No account yet?{" "}
                <Link href="/auth/register" className="font-bold text-[#4F46E5]">
                    Create account
                </Link>
            </p>
        </form>
    );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function RegisterForm() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        if (!fullName.trim()) {
            setMessage("Please enter your full name.");
            return;
        }

        if (!email.trim()) {
            setMessage("Please enter your email.");
            return;
        }

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        setLoading(true);

        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${siteUrl}/auth/callback`,
                data: {
                    full_name: fullName,
                    role: "Organization Owner",
                },
            },
        });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage(
            "Account created. Please check your email to verify your account before logging in."
        );
    }

    return (
        <form onSubmit={handleRegister} className="space-y-5">
            <div>
                <label className="mb-2 block font-bold text-slate-700">
                    Full Name
                </label>
                <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#4F46E5]"
                    placeholder="Enter your full name"
                />
            </div>

            <div>
                <label className="mb-2 block font-bold text-slate-700">
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#4F46E5]"
                    placeholder="Enter your email"
                />
            </div>

            <div>
                <label className="mb-2 block font-bold text-slate-700">
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#4F46E5]"
                    placeholder="Enter password"
                />
            </div>

            <div>
                <label className="mb-2 block font-bold text-slate-700">
                    Confirm Password
                </label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#4F46E5]"
                    placeholder="Confirm password"
                />
            </div>

            {message && (
                <div className="rounded-xl bg-[#F7F5FF] p-4 text-sm font-semibold text-slate-700">
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-60"
            >
                {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-bold text-[#4F46E5]">
                    Login
                </Link>
            </p>
        </form>
    );
}
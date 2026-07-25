"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    KeyRound,
    Loader2,
    ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SetInvitedPasswordPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [hasSession, setHasSession] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let mounted = true;

        async function loadSession() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!mounted) return;

            setHasSession(Boolean(session));
            setChecking(false);
        }

        void loadSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;
                setHasSession(Boolean(session));
                setChecking(false);
            },
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function savePassword(
        event: React.FormEvent,
    ) {
        event.preventDefault();
        setMessage("");

        if (password.length < 8) {
            setMessage(
                "Password must be at least 8 characters.",
            );
            return;
        }

        if (password !== confirmPassword) {
            setMessage("The passwords do not match.");
            return;
        }

        setSaving(true);

        try {
            const { error } =
                await supabase.auth.updateUser({
                    password,
                });

            if (error) {
                setMessage(error.message);
                return;
            }

            const acceptResponse = await fetch(
                "/api/company/team/accept",
                {
                    method: "POST",
                },
            );

            const acceptResult =
                await acceptResponse.json();

            if (!acceptResponse.ok) {
                setMessage(
                    acceptResult.error ||
                        "Password saved, but company access could not be activated.",
                );
                return;
            }

            setMessage(
                "Password created. Opening RegiGo...",
            );

            router.replace("/dashboard");
            router.refresh();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to create the password.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
                <div className="bg-gradient-to-r from-[#4F46E5] to-[#EC4899] p-8 text-white">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                        <ShieldCheck size={28} />
                    </div>
                    <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-white/75">
                        RegiGo Team Invitation
                    </p>
                    <h1 className="mt-3 text-3xl font-black">
                        Create your password
                    </h1>
                    <p className="mt-3 leading-7 text-white/85">
                        Complete your account setup to access
                        the events assigned by your company.
                    </p>
                </div>

                <div className="p-7 md:p-8">
                    {checking ? (
                        <div className="flex items-center justify-center gap-3 py-10 font-bold text-slate-500">
                            <Loader2
                                size={20}
                                className="animate-spin"
                            />
                            Checking invitation...
                        </div>
                    ) : !hasSession ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                            This invitation link is invalid or
                            has expired. Ask the company
                            administrator to invite you again.
                        </div>
                    ) : (
                        <form
                            onSubmit={savePassword}
                            className="space-y-5"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-black text-slate-700">
                                    New password
                                </label>
                                <div className="relative">
                                    <KeyRound
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 py-3.5 pl-11 pr-4 outline-none transition focus:border-[#4F46E5]"
                                        placeholder="At least 8 characters"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-black text-slate-700">
                                    Confirm password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-[#4F46E5]"
                                    placeholder="Enter the password again"
                                    autoComplete="new-password"
                                />
                            </div>

                            {message && (
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? (
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <CheckCircle2 size={18} />
                                )}
                                {saving
                                    ? "Creating password..."
                                    : "Create Password and Continue"}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

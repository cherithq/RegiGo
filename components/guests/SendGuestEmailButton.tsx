"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type SendGuestEmailButtonProps = {
    eventId: string;
    registrationId: string;
};

export default function SendGuestEmailButton({
    eventId,
    registrationId,
}: SendGuestEmailButtonProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    async function resendConfirmationEmail() {
        const ok = window.confirm("Resend the confirmation email to this guest?");
        if (!ok) return;

        setLoading(true);
        setStatus("idle");
        setMessage("");

        try {
            const response = await fetch("/api/emails/template", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventId,
                    registrationId,
                    type: "confirmation",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setStatus("error");
                setMessage(result.error || "Failed to resend email.");
                return;
            }

            setStatus("success");
            setMessage("Resent.");
        } catch (error: any) {
            setStatus("error");
            setMessage(error?.message || "Failed to resend email.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <button
                type="button"
                onClick={resendConfirmationEmail}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#4F46E5]/40 hover:bg-[#F7F5FF] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Mail size={14} />
                )}
                {loading ? "Sending..." : "Resend Confirmation Email"}
            </button>

            {status === "success" && (
                <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={12} />
                    {message}
                </p>
            )}

            {status === "error" && (
                <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
                    <AlertCircle size={12} />
                    {message}
                </p>
            )}
        </div>
    );
}
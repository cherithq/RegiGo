"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type EmailType = "reminder" | "thank_you" | "event_update";

type BulkEmailButtonProps = {
    eventId: string;
    type: EmailType;
    checkedInOnly?: boolean;
};

function getLabel(type: EmailType, checkedInOnly?: boolean) {
    if (type === "reminder") return "Send Reminder to All Guests";

    if (type === "thank_you") {
        return checkedInOnly
            ? "Send Thank You to Checked-In Guests"
            : "Send Thank You to All Guests";
    }

    return "Send Event Update";
}

export default function BulkEmailButton({
    eventId,
    type,
    checkedInOnly = false,
}: BulkEmailButtonProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    async function sendBulkEmail() {
        const ok = window.confirm(
            `Are you sure you want to ${getLabel(type, checkedInOnly).toLowerCase()}?`
        );

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
                    type,
                    checkedInOnly,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setStatus("error");
                setMessage(result.error || "Failed to send email.");
                return;
            }

            setStatus("success");
            setMessage(result.message || "Email sent.");
        } catch (error: any) {
            setStatus("error");
            setMessage(error?.message || "Failed to send email.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <button
                type="button"
                onClick={sendBulkEmail}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-4 py-3 text-sm font-black text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Mail size={16} />
                )}
                {loading ? "Sending..." : getLabel(type, checkedInOnly)}
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
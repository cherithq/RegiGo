"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: text || "The server returned an invalid response." };
    }
}

export default function EventStatusToggle({
    eventId,
    initialStatus,
}: {
    eventId: string;
    initialStatus: string;
}) {
    const router = useRouter();
    const [status, setStatus] = useState(String(initialStatus || "draft").toLowerCase());
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");

    const published = status === "published";

    async function setEventStatus(next: "draft" | "published") {
        if (next === "draft" && !window.confirm("Revert this event to draft? It will stop looking live to your team.")) return;

        setWorking(true);
        setMessage("");

        try {
            const response = await fetch(`/api/events/${eventId}/configuration`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: { status: next } }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to update event status.");
            setStatus(next);
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to update event status.");
        } finally {
            setWorking(false);
        }
    }

    return (
        <span className="inline-flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
                <BadgeCheck size={15} />
                {published ? "Published" : "Draft"}
            </span>
            <button
                type="button"
                disabled={working}
                onClick={() => void setEventStatus(published ? "draft" : "published")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white transition disabled:opacity-50 ${published ? "bg-slate-700 hover:bg-slate-800" : "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] hover:opacity-90"}`}
            >
                {working ? <Loader2 size={14} className="animate-spin" /> : null}
                {published ? "Revert to Draft" : "Publish Event"}
            </button>
            {message && <span className="text-xs font-bold text-red-600">{message}</span>}
        </span>
    );
}

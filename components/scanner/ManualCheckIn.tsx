"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type QrPayload = {
    rawValue: string;
    cleanedValue: string;
    qrToken: string | null;
    registrationId: string | null;
};

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function cleanScannedUrl(value: string) {
    return value.trim().replace(/^(https?:\/\/[^/]+)\/+/, "$1/");
}

function extractQrPayload(value: string): QrPayload {
    const rawValue = value.trim();
    const cleanedValue = cleanScannedUrl(rawValue);
    let qrToken: string | null = null;
    let registrationId: string | null = null;

    try {
        const url = new URL(cleanedValue);
        registrationId =
            url.searchParams.get("registration") ||
            url.searchParams.get("registration_id") ||
            url.searchParams.get("registrationId");
        qrToken =
            url.searchParams.get("qr_token") ||
            url.searchParams.get("qrToken") ||
            url.searchParams.get("token") ||
            url.searchParams.get("ticket");
    } catch {
        // Not a URL.
    }

    if (!registrationId && isUuid(cleanedValue)) {
        registrationId = cleanedValue;
    }

    if (!qrToken && !registrationId && cleanedValue) {
        qrToken = cleanedValue;
    }

    return { rawValue, cleanedValue, qrToken, registrationId };
}

async function readJsonResponse(response: Response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            `The check-in route returned a non-JSON response (${response.status}). Check app/api/events/[eventId]/check-in/route.ts.`,
        );
    }
}

export default function ManualCheckIn({ eventId }: { eventId: string }) {
    const [query, setQuery] = useState("");
    const [guests, setGuests] = useState<any[]>([]);
    const [message, setMessage] = useState("");
    const [checkingInId, setCheckingInId] = useState<string | null>(null);

    async function searchByRegistrationId(registrationId: string) {
        const { data, error } = await supabase
            .from("registrations")
            .select("*")
            .eq("event_id", eventId)
            .eq("id", registrationId)
            .maybeSingle();

        if (error) throw new Error(error.message);

        if (data) {
            setGuests([data]);
            setMessage("Guest found from QR pass link.");
            return true;
        }

        return false;
    }

    async function searchByQrToken(qrToken: string) {
        const { data, error } = await supabase
            .from("qr_tickets")
            .select("*, registrations(*)")
            .eq("event_id", eventId)
            .eq("qr_token", qrToken)
            .limit(1)
            .maybeSingle();

        if (error) throw new Error(error.message);

        if (data?.registrations) {
            setGuests([data.registrations]);
            setMessage("Guest found from QR token.");
            return true;
        }

        return false;
    }

    async function searchGuest() {
        setMessage("");
        setGuests([]);
        const cleanQuery = query.trim();

        if (!cleanQuery) {
            setMessage(
                "Please enter a name, email, QR link, registration ID, or QR token.",
            );
            return;
        }

        try {
            const payload = extractQrPayload(cleanQuery);

            if (payload.registrationId) {
                const found = await searchByRegistrationId(payload.registrationId);
                if (found) return;
            }

            if (payload.qrToken && payload.qrToken !== payload.registrationId) {
                const found = await searchByQrToken(payload.qrToken);
                if (found) return;
            }

            const { data, error } = await supabase
                .from("registrations")
                .select("*")
                .eq("event_id", eventId)
                .or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
                .limit(10);

            if (error) {
                setMessage(error.message);
                return;
            }

            setGuests(data || []);

            if (!data || data.length === 0) {
                setMessage("No guest found.");
            }
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "Failed to search guest.",
            );
        }
    }

    async function checkInGuest(guest: any) {
        setMessage("");
        setCheckingInId(guest.id);

        try {
            const response = await fetch(`/api/events/${eventId}/check-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    registrationId: guest.id,
                    source: "manual",
                }),
                cache: "no-store",
            });

            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(data.error || "Failed to check in guest.");
            }

            setMessage(
                `${data.message || "Checked in successfully."} ${
                    data.emailMessage || ""
                }`.trim(),
            );
            setGuests([]);
            setQuery("");
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "Failed to check in guest.",
            );
        } finally {
            setCheckingInId(null);
        }
    }

    return (
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-6 md:rounded-[2rem]">
            <h2 className="text-xl font-black sm:text-2xl">Manual Check-In</h2>
            <p className="mt-2 text-sm text-slate-500">
                Search by guest name, email, registration ID, or QR pass.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") void searchGuest();
                    }}
                    placeholder="Search name, email, QR link, registration ID or token"
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-950 outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                />

                <button
                    type="button"
                    onClick={() => void searchGuest()}
                    className="min-h-12 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
                >
                    Search
                </button>
            </div>

            {message && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm font-semibold leading-6 text-[#4F46E5]">
                    {message}
                </div>
            )}

            <div className="mt-5 space-y-3">
                {guests.map((guest) => (
                    <div
                        key={guest.id}
                        className="flex flex-col gap-4 rounded-2xl bg-[#F7F5FF] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <p className="truncate font-black">
                                {guest.full_name || "Unnamed Guest"}
                            </p>
                            <p className="break-all text-sm text-slate-500">
                                {guest.email || "No email"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                                Status: {guest.registration_status || "confirmed"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void checkInGuest(guest)}
                            disabled={checkingInId === guest.id}
                            className="min-h-11 shrink-0 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-4 py-2 font-bold text-white disabled:opacity-60"
                        >
                            {checkingInId === guest.id
                                ? "Checking in..."
                                : "Check In"}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
        value
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
        // Not a URL. Continue below.
    }

    if (!registrationId && isUuid(cleanedValue)) {
        registrationId = cleanedValue;
    }

    if (!qrToken && !registrationId && cleanedValue) {
        qrToken = cleanedValue;
    }

    return {
        rawValue,
        cleanedValue,
        qrToken,
        registrationId,
    };
}

export default function ManualCheckIn({ eventId }: { eventId: string }) {
    const [query, setQuery] = useState("");
    const [guests, setGuests] = useState<any[]>([]);
    const [message, setMessage] = useState("");

    async function searchByRegistrationId(registrationId: string) {
        const { data, error } = await supabase
            .from("registrations")
            .select("*")
            .eq("event_id", eventId)
            .eq("id", registrationId)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

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

        if (error) {
            throw new Error(error.message);
        }

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
            setMessage("Please enter a name, email, QR link, registration ID, or QR token.");
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
        } catch (error: any) {
            setMessage(error?.message || "Failed to search guest.");
        }
    }

    async function syncCheckedInState(guest: any) {
        const { error: registrationUpdateError } = await supabase
            .from("registrations")
            .update({
                registration_status: "checked_in",
            })
            .eq("id", guest.id)
            .eq("event_id", eventId);

        if (registrationUpdateError) {
            throw new Error(registrationUpdateError.message);
        }

        const { error: ticketUpdateError } = await supabase
            .from("qr_tickets")
            .update({
                is_active: false,
            })
            .eq("registration_id", guest.id)
            .eq("event_id", eventId);

        if (ticketUpdateError) {
            throw new Error(ticketUpdateError.message);
        }
    }

    async function checkInGuest(guest: any) {
        setMessage("");

        try {
            const { data: existing, error: existingError } = await supabase
                .from("check_ins")
                .select("*")
                .eq("registration_id", guest.id)
                .eq("event_id", eventId)
                .eq("scan_result", "checked_in")
                .limit(1)
                .maybeSingle();

            if (existingError) {
                throw new Error(existingError.message);
            }

            const { data: ticket, error: ticketError } = await supabase
                .from("qr_tickets")
                .select("*")
                .eq("registration_id", guest.id)
                .eq("event_id", eventId)
                .limit(1)
                .maybeSingle();

            if (ticketError) {
                throw new Error(ticketError.message);
            }

            if (
                existing ||
                guest.registration_status === "checked_in" ||
                guest.registration_status === "attended" ||
                ticket?.is_active === false
            ) {
                await syncCheckedInState(guest);

                setMessage(
                    `${guest.full_name || "Guest"} is already checked in. Check-in status has been synced.`
                );
                setGuests([]);
                setQuery("");
                return;
            }

            const { error: insertError } = await supabase.from("check_ins").insert({
                registration_id: guest.id,
                event_id: eventId,
                qr_ticket_id: ticket?.id || null,
                checked_in_by: "Admin",
                device_name: "Manual Search",
                scan_result: "checked_in",
            });

            if (insertError) {
                throw new Error(insertError.message);
            }

            await syncCheckedInState(guest);

            setMessage(`${guest.full_name || "Guest"} checked in successfully.`);
            setGuests([]);
            setQuery("");
        } catch (error: any) {
            setMessage(error?.message || "Failed to check in guest.");
        }
    }

    return (
        <div className="rounded-[2rem] bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-black">Manual Check-In</h2>

            <p className="mt-2 text-sm text-slate-500">
                Search by guest name, email, QR pass link, registration ID, or QR token.
            </p>

            <div className="mt-5 flex gap-3">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            searchGuest();
                        }
                    }}
                    placeholder="Search name, email, QR link, registration ID or token"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-950"
                />

                <button
                    onClick={searchGuest}
                    className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
                >
                    Search
                </button>
            </div>

            {message && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <div className="mt-5 space-y-3">
                {guests.map((guest) => (
                    <div
                        key={guest.id}
                        className="flex items-center justify-between rounded-2xl bg-[#F7F5FF] p-4"
                    >
                        <div>
                            <p className="font-black">
                                {guest.full_name || "Unnamed Guest"}
                            </p>
                            <p className="text-sm text-slate-500">
                                {guest.email || "No email"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                                Status: {guest.registration_status || "confirmed"}
                            </p>
                        </div>

                        <button
                            onClick={() => checkInGuest(guest)}
                            className="rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-4 py-2 font-bold text-white"
                        >
                            Check In
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
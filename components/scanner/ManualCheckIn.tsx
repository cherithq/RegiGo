"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ManualCheckIn({ eventId }: { eventId: string }) {
    const [query, setQuery] = useState("");
    const [guests, setGuests] = useState<any[]>([]);
    const [message, setMessage] = useState("");

    async function searchGuest() {
        setMessage("");

        if (!query.trim()) {
            setMessage("Please enter a name or email.");
            return;
        }

        const { data, error } = await supabase
            .from("registrations")
            .select("*")
            .eq("event_id", eventId)
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);

        if (error) {
            setMessage(error.message);
            return;
        }

        setGuests(data || []);
    }

    async function syncCheckedInState(guest: any) {
        const { error: registrationUpdateError } = await supabase
            .from("registrations")
            .update({
                registration_status: "checked_in",
            })
            .eq("id", guest.id);

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
                .maybeSingle();

            if (existingError) {
                throw new Error(existingError.message);
            }

            if (existing || guest.registration_status === "checked_in") {
                await syncCheckedInState(guest);
                setMessage(`${guest.full_name} is already checked in. Check-in status has been synced.`);
                setGuests([]);
                setQuery("");
                return;
            }

            const { data: ticket } = await supabase
                .from("qr_tickets")
                .select("*")
                .eq("registration_id", guest.id)
                .eq("event_id", eventId)
                .maybeSingle();

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

            setMessage(`${guest.full_name} checked in successfully.`);
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
                Search by guest name or email if QR scanning is unavailable.
            </p>

            <div className="mt-5 flex gap-3">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or email"
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
                            <p className="font-black">{guest.full_name}</p>
                            <p className="text-sm text-slate-500">{guest.email}</p>
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
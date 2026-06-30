"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TableAssignmentForm({
    eventId,
    tables,
    guests,
    assignments,
}: {
    eventId: string;
    tables: any[];
    guests: any[];
    assignments: any[];
}) {
    const [items, setItems] = useState(assignments);
    const [message, setMessage] = useState("");

    const assignedGuestIds = useMemo(
        () => new Set(items.map((item) => item.registration_id)),
        [items]
    );

    const unassignedGuests = guests.filter((guest) => !assignedGuestIds.has(guest.id));

    function guestsForTable(tableId: string) {
        return guests.filter((guest) =>
            items.some(
                (assignment) =>
                    assignment.table_id === tableId &&
                    assignment.registration_id === guest.id
            )
        );
    }

    async function assignGuest(registrationId: string, tableId: string) {
        setMessage("");

        const table = tables.find((item) => item.id === tableId);
        const currentCount = items.filter((item) => item.table_id === tableId).length;

        if (table && currentCount >= Number(table.table_capacity || 0)) {
            setMessage(`${table.table_name} is already full.`);
            return;
        }

        const { data, error } = await supabase
            .from("table_assignments")
            .upsert(
                {
                    event_id: eventId,
                    table_id: tableId,
                    registration_id: registrationId,
                },
                {
                    onConflict: "event_id,registration_id",
                }
            )
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setItems((prev) => [
            ...prev.filter((item) => item.registration_id !== registrationId),
            data,
        ]);
    }

    async function removeAssignment(registrationId: string) {
        setMessage("");

        const { error } = await supabase
            .from("table_assignments")
            .delete()
            .eq("event_id", eventId)
            .eq("registration_id", registrationId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setItems((prev) =>
            prev.filter((item) => item.registration_id !== registrationId)
        );
    }

    return (
        <div className="space-y-8">
            {message && (
                <div className="rounded-xl bg-red-50 p-4 font-semibold text-red-600">
                    {message}
                </div>
            )}

            <section className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <h2 className="text-2xl font-black">Unassigned Guests</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Select a table for each guest.
                </p>

                <div className="mt-5 space-y-3">
                    {unassignedGuests.length > 0 ? (
                        unassignedGuests.map((guest) => (
                            <div
                                key={guest.id}
                                className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <p className="font-black">{guest.full_name}</p>
                                    <p className="text-sm text-slate-500">{guest.email}</p>
                                </div>

                                <select
                                    defaultValue=""
                                    onChange={(e) => assignGuest(guest.id, e.target.value)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                                >
                                    <option value="" disabled>
                                        Assign table
                                    </option>
                                    {tables.map((table) => (
                                        <option key={table.id} value={table.id}>
                                            {table.table_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-2xl bg-white p-5 font-semibold text-slate-500">
                            All guests have been assigned.
                        </p>
                    )}
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {tables.map((table) => {
                    const seatedGuests = guestsForTable(table.id);
                    const capacity = Number(table.table_capacity || 0);
                    const remaining = Math.max(capacity - seatedGuests.length, 0);

                    return (
                        <div key={table.id} className="rounded-[2rem] bg-white p-6 shadow-xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl font-black">{table.table_name}</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {seatedGuests.length}/{capacity} seated · {remaining} left
                                    </p>
                                </div>

                                <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-black text-[#4F46E5]">
                                    {remaining === 0 ? "FULL" : "OPEN"}
                                </span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {seatedGuests.length > 0 ? (
                                    seatedGuests.map((guest) => (
                                        <div
                                            key={guest.id}
                                            className="flex items-center justify-between rounded-2xl bg-[#F7F5FF] p-4"
                                        >
                                            <div>
                                                <p className="font-black">{guest.full_name}</p>
                                                <p className="text-xs text-slate-500">{guest.email}</p>
                                            </div>

                                            <button
                                                onClick={() => removeAssignment(guest.id)}
                                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-2xl bg-[#F7F5FF] p-4 text-sm font-semibold text-slate-500">
                                        No guests assigned yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {tables.length === 0 && (
                    <div className="col-span-full rounded-[2rem] bg-[#F7F5FF] p-8 text-center">
                        <div className="text-5xl">🪑</div>
                        <h2 className="mt-4 text-2xl font-black">No tables yet</h2>
                        <p className="mt-2 text-slate-500">
                            Create tables first before assigning guests.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
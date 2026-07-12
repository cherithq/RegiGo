"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
    const router = useRouter();

    const [items, setItems] = useState(assignments || []);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error" | "">("");
    const [assigningGuestId, setAssigningGuestId] = useState<string | null>(null);
    const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);

    const assignedGuestIds = useMemo(
        () =>
            new Set(
                items
                    .map((item) => item.registration_id)
                    .filter(Boolean)
            ),
        [items]
    );

    const unassignedGuests = guests.filter(
        (guest) => !assignedGuestIds.has(guest.id)
    );

    function guestsForTable(tableId: string) {
        return guests.filter((guest) =>
            items.some(
                (assignment) =>
                    assignment.table_id === tableId &&
                    assignment.registration_id === guest.id
            )
        );
    }

    async function triggerEmailWorker() {
        try {
            const response = await fetch("/api/email-worker/trigger", {
                method: "POST",
            });

            const text = await response.text();

            let result: any = {};

            try {
                result = text ? JSON.parse(text) : {};
            } catch {
                result = { raw: text };
            }

            if (!response.ok) {
                console.error("Email worker trigger failed:", result);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Email worker trigger failed:", error);
            return false;
        }
    }

    async function assignGuest(registrationId: string, tableId: string) {
        if (!registrationId || !tableId) return;

        setMessage("");
        setMessageType("");
        setAssigningGuestId(registrationId);

        const table = tables.find((item) => item.id === tableId);
        const currentCount = items.filter(
            (item) =>
                item.table_id === tableId &&
                item.registration_id !== registrationId
        ).length;

        if (table && currentCount >= Number(table.table_capacity || 0)) {
            setMessage(`${table.table_name} is already full.`);
            setMessageType("error");
            setAssigningGuestId(null);
            return;
        }

        const { data: existingAssignment, error: existingError } = await supabase
            .from("table_assignments")
            .select("*")
            .eq("registration_id", registrationId)
            .maybeSingle();

        if (existingError) {
            setMessage(existingError.message);
            setMessageType("error");
            setAssigningGuestId(null);
            return;
        }

        let savedAssignment: any = null;
        let saveError: any = null;

        if (existingAssignment) {
            const { data, error } = await supabase
                .from("table_assignments")
                .update({
                    event_id: eventId,
                    table_id: tableId,
                })
                .eq("registration_id", registrationId)
                .select("*")
                .single();

            savedAssignment = data;
            saveError = error;
        } else {
            const { data, error } = await supabase
                .from("table_assignments")
                .insert({
                    event_id: eventId,
                    table_id: tableId,
                    registration_id: registrationId,
                })
                .select("*")
                .single();

            savedAssignment = data;
            saveError = error;
        }

        if (saveError) {
            setMessage(saveError.message);
            setMessageType("error");
            setAssigningGuestId(null);
            return;
        }

        setItems((prev) => [
            ...prev.filter((item) => item.registration_id !== registrationId),
            savedAssignment,
        ]);

        router.refresh();

        const emailSent = await triggerEmailWorker();

        if (emailSent) {
            setMessage("Table assigned and email sent.");
            setMessageType("success");
        } else {
            setMessage(
                "Table assigned, but the email worker did not run. The table assignment was still saved."
            );
            setMessageType("success");
        }

        setAssigningGuestId(null);
    }

    async function removeAssignment(registrationId: string) {
        if (!registrationId) return;

        setMessage("");
        setMessageType("");
        setRemovingGuestId(registrationId);

        const { error } = await supabase
            .from("table_assignments")
            .delete()
            .eq("registration_id", registrationId);

        if (error) {
            setMessage(error.message);
            setMessageType("error");
            setRemovingGuestId(null);
            return;
        }

        setItems((prev) =>
            prev.filter((item) => item.registration_id !== registrationId)
        );

        router.refresh();

        setMessage("Table assignment removed.");
        setMessageType("success");
        setRemovingGuestId(null);
    }

    return (
        <div className="space-y-5 md:space-y-8">
            {message && (
                <div
                    className={`rounded-2xl p-4 text-sm font-semibold md:text-base ${
                        messageType === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                    }`}
                >
                    {message}
                </div>
            )}

            <section className="rounded-[1.5rem] bg-[#F7F5FF] p-5 md:rounded-[2rem] md:p-6">
                <h2 className="text-xl font-black md:text-2xl">
                    Unassigned Guests
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Select a table for each guest. Once assigned, the guest will receive a
                    table assignment email automatically.
                </p>

                <div className="mt-5 space-y-3">
                    {unassignedGuests.length > 0 ? (
                        unassignedGuests.map((guest) => (
                            <div
                                key={guest.id}
                                className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-black text-slate-950">
                                        {guest.full_name || "Unnamed Guest"}
                                    </p>

                                    <p className="break-all text-sm text-slate-500">
                                        {guest.email || "No email"}
                                    </p>
                                </div>

                                <select
                                    value=""
                                    disabled={assigningGuestId === guest.id}
                                    onChange={(event) =>
                                        assignGuest(guest.id, event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50 md:w-[220px]"
                                >
                                    <option value="" disabled>
                                        {assigningGuestId === guest.id
                                            ? "Assigning..."
                                            : "Assign table"}
                                    </option>

                                    {tables.map((table) => {
                                        const currentCount = items.filter(
                                            (item) => item.table_id === table.id
                                        ).length;

                                        const capacity = Number(
                                            table.table_capacity || 0
                                        );

                                        const isFull =
                                            capacity > 0 && currentCount >= capacity;

                                        return (
                                            <option
                                                key={table.id}
                                                value={table.id}
                                                disabled={isFull}
                                            >
                                                {table.table_name}
                                                {isFull ? " - Full" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500">
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
                    const isFull = capacity > 0 && remaining === 0;

                    return (
                        <div
                            key={table.id}
                            className="rounded-[1.5rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h3 className="truncate text-xl font-black md:text-2xl">
                                        {table.table_name}
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        {seatedGuests.length}/{capacity} seated ·{" "}
                                        {remaining} left
                                    </p>
                                </div>

                                <span
                                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                                        isFull
                                            ? "bg-red-50 text-red-700"
                                            : "bg-[#F7F5FF] text-[#4F46E5]"
                                    }`}
                                >
                                    {isFull ? "FULL" : "OPEN"}
                                </span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {seatedGuests.length > 0 ? (
                                    seatedGuests.map((guest) => (
                                        <div
                                            key={guest.id}
                                            className="flex flex-col gap-3 rounded-2xl bg-[#F7F5FF] p-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-black text-slate-950">
                                                    {guest.full_name || "Unnamed Guest"}
                                                </p>

                                                <p className="break-all text-xs text-slate-500">
                                                    {guest.email || "No email"}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeAssignment(guest.id)
                                                }
                                                disabled={
                                                    removingGuestId === guest.id
                                                }
                                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {removingGuestId === guest.id
                                                    ? "Removing..."
                                                    : "Remove"}
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
                    <div className="col-span-full rounded-[1.5rem] bg-[#F7F5FF] p-8 text-center md:rounded-[2rem]">
                        <div className="text-5xl">🪑</div>

                        <h2 className="mt-4 text-2xl font-black">
                            No tables yet
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Create tables first before assigning guests.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
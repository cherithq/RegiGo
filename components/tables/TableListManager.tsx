"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";

type EventTable = {
    id: string;
    table_name: string;
    table_capacity: number | null;
};

type TableAssignment = {
    id: string;
    table_id: string | null;
    registration_id: string | null;
};

type Guest = {
    id: string;
    full_name: string | null;
    email: string | null;
};

export default function TableListManager({
    eventId,
    initialTables,
    assignments,
    guests,
}: {
    eventId: string;
    initialTables: EventTable[];
    assignments: TableAssignment[];
    guests: Guest[];
}) {
    const router = useRouter();

    const [tables, setTables] = useState(initialTables);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        table_name: "",
        table_capacity: "",
    });
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error" | "">(
        ""
    );

    const guestMap = new Map<string, Guest>();
    guests.forEach((guest) => guestMap.set(guest.id, guest));

    function startEdit(table: EventTable) {
        setEditingId(table.id);
        setEditForm({
            table_name: table.table_name || "",
            table_capacity: String(table.table_capacity || ""),
        });
        setMessage("");
    }

    function cancelEdit() {
        setEditingId(null);
        setMessage("");
    }

    async function saveEdit(tableId: string) {
        setSavingId(tableId);
        setMessage("");
        setMessageType("");

        const response = await fetch(
            `/api/events/${eventId}/tables/${tableId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tableName: editForm.table_name,
                    tableCapacity: Number(editForm.table_capacity || 0),
                }),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            setMessage(result.error || "Failed to update table.");
            setMessageType("error");
            setSavingId(null);
            return;
        }

        setTables((prev) =>
            prev.map((table) =>
                table.id === tableId ? result.table : table
            )
        );
        setEditingId(null);
        setSavingId(null);
        setMessage("Table updated.");
        setMessageType("success");
        router.refresh();
    }

    async function deleteTable(table: EventTable) {
        const seatedCount = assignments.filter(
            (assignment) => assignment.table_id === table.id
        ).length;

        const warning = seatedCount
            ? `${table.table_name} has ${seatedCount} guest${
                  seatedCount === 1 ? "" : "s"
              } assigned. Deleting it will remove those seat assignments. Continue?`
            : `Delete ${table.table_name}?`;

        if (!confirm(warning)) return;

        setDeletingId(table.id);
        setMessage("");
        setMessageType("");

        const response = await fetch(
            `/api/events/${eventId}/tables/${table.id}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            setMessage(result.error || "Failed to delete table.");
            setMessageType("error");
            setDeletingId(null);
            return;
        }

        setTables((prev) => prev.filter((item) => item.id !== table.id));
        setDeletingId(null);
        setMessage("Table deleted.");
        setMessageType("success");
        router.refresh();
    }

    return (
        <div className="space-y-4">
            {message && (
                <div
                    className={`rounded-2xl p-4 text-sm font-semibold ${
                        messageType === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                    }`}
                >
                    {message}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {tables.length > 0 ? (
                    tables.map((table) => {
                        const seatedGuests = assignments
                            .filter(
                                (assignment) =>
                                    assignment.table_id === table.id
                            )
                            .map((assignment) =>
                                assignment.registration_id
                                    ? guestMap.get(assignment.registration_id)
                                    : null
                            )
                            .filter(Boolean) as Guest[];

                        const capacity = Number(table.table_capacity || 0);
                        const remaining = Math.max(
                            capacity - seatedGuests.length,
                            0
                        );
                        const isFull = capacity > 0 && remaining === 0;
                        const isEditing = editingId === table.id;

                        return (
                            <div
                                key={table.id}
                                className="rounded-[1.5rem] bg-[#F7F5FF] p-5 md:rounded-[2rem] md:p-6"
                            >
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-black text-slate-500">
                                                Table Name
                                            </label>
                                            <input
                                                value={editForm.table_name}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        table_name:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-black text-slate-500">
                                                Capacity
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.table_capacity}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        table_capacity:
                                                            e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    saveEdit(table.id)
                                                }
                                                disabled={
                                                    savingId === table.id
                                                }
                                                className="flex-1 rounded-xl bg-[#4F46E5] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                            >
                                                {savingId === table.id
                                                    ? "Saving..."
                                                    : "Save"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600"
                                            >
                                                <X size={13} />
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h2 className="truncate text-xl font-black md:text-2xl">
                                                    {table.table_name}
                                                </h2>

                                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                                    {seatedGuests.length}/
                                                    {capacity} assigned ·{" "}
                                                    {remaining} seat
                                                    {remaining === 1
                                                        ? ""
                                                        : "s"}{" "}
                                                    left
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-black ${
                                                        isFull
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-green-100 text-green-700"
                                                    }`}
                                                >
                                                    {isFull ? "FULL" : "OPEN"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    startEdit(table)
                                                }
                                                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#4F46E5] shadow-sm"
                                            >
                                                <Pencil size={13} />
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteTable(table)
                                                }
                                                disabled={
                                                    deletingId === table.id
                                                }
                                                className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-50"
                                            >
                                                <Trash2 size={13} />
                                                {deletingId === table.id
                                                    ? "Deleting..."
                                                    : "Delete"}
                                            </button>
                                        </div>

                                        <div className="mt-5 space-y-2">
                                            {seatedGuests.length > 0 ? (
                                                seatedGuests
                                                    .slice(0, 5)
                                                    .map((guest) => (
                                                        <div
                                                            key={guest.id}
                                                            className="rounded-2xl bg-white p-3 text-sm font-semibold text-slate-700"
                                                        >
                                                            <p className="font-black">
                                                                {guest.full_name ||
                                                                    "Unnamed Guest"}
                                                            </p>
                                                            <p className="break-all text-xs text-slate-500">
                                                                {guest.email ||
                                                                    "No email"}
                                                            </p>
                                                        </div>
                                                    ))
                                            ) : (
                                                <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
                                                    No guests assigned yet.
                                                </p>
                                            )}

                                            {seatedGuests.length > 5 && (
                                                <p className="text-sm font-bold text-slate-500">
                                                    +{" "}
                                                    {seatedGuests.length - 5}{" "}
                                                    more guests
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full rounded-2xl bg-[#F7F5FF] p-8 text-center">
                        <div className="text-5xl">🪑</div>

                        <h2 className="mt-4 text-2xl font-black">
                            No tables yet
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Add tables before assigning guests.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FloorPlanEditor({
    eventId,
    tables,
    assignments,
}: {
    eventId: string;
    tables: any[];
    assignments: any[];
}) {
    const [items, setItems] = useState(tables);
    const [selected, setSelected] = useState<any | null>(tables[0] || null);
    const [message, setMessage] = useState("");

    const assignmentMap = useMemo(() => {
        const map: Record<string, any[]> = {};
        assignments.forEach((item) => {
            if (!map[item.table_id]) map[item.table_id] = [];
            map[item.table_id].push(item);
        });
        return map;
    }, [assignments]);

    async function updateTable(tableId: string, updates: any) {
        setItems((prev) =>
            prev.map((table) =>
                table.id === tableId ? { ...table, ...updates } : table
            )
        );

        if (selected?.id === tableId) {
            setSelected({ ...selected, ...updates });
        }

        const { error } = await supabase
            .from("event_tables")
            .update(updates)
            .eq("id", tableId);

        if (error) setMessage(error.message);
    }

    function startDrag(e: React.MouseEvent, table: any) {
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const originalX = table.floor_x || 80;
        const originalY = table.floor_y || 80;

        function onMove(moveEvent: MouseEvent) {
            const nextX = Math.max(0, originalX + moveEvent.clientX - startX);
            const nextY = Math.max(0, originalY + moveEvent.clientY - startY);

            setItems((prev) =>
                prev.map((item) =>
                    item.id === table.id
                        ? { ...item, floor_x: nextX, floor_y: nextY }
                        : item
                )
            );
        }

        async function onUp(upEvent: MouseEvent) {
            const nextX = Math.max(0, originalX + upEvent.clientX - startX);
            const nextY = Math.max(0, originalY + upEvent.clientY - startY);

            await updateTable(table.id, {
                floor_x: nextX,
                floor_y: nextY,
            });

            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black">Floor Layout</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Drag tables to arrange your venue layout.
                        </p>
                    </div>

                    {message && (
                        <span className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                            {message}
                        </span>
                    )}
                </div>

                <div className="relative h-[650px] overflow-hidden rounded-[2rem] border-2 border-dashed border-slate-300 bg-white">
                    <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-2xl bg-slate-950 px-16 py-4 font-black text-white">
                        STAGE
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-2xl bg-slate-100 px-10 py-3 font-black text-slate-600">
                        ENTRANCE
                    </div>

                    {items.map((table) => {
                        const seated = assignmentMap[table.id]?.length || 0;
                        const capacity = Number(table.table_capacity || 0);
                        const isFull = capacity > 0 && seated >= capacity;
                        const almostFull = capacity > 0 && seated / capacity >= 0.8;

                        return (
                            <button
                                key={table.id}
                                onMouseDown={(e) => startDrag(e, table)}
                                onClick={() => setSelected(table)}
                                className={`absolute flex cursor-move flex-col items-center justify-center border-4 text-center font-black shadow-lg transition ${table.table_shape === "rectangle"
                                        ? "rounded-2xl"
                                        : "rounded-full"
                                    } ${selected?.id === table.id
                                        ? "border-[#4F46E5]"
                                        : "border-white"
                                    } ${isFull
                                        ? "bg-red-100 text-red-700"
                                        : almostFull
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-green-100 text-green-700"
                                    }`}
                                style={{
                                    left: table.floor_x || 80,
                                    top: table.floor_y || 80,
                                    width: table.table_size || 90,
                                    height: table.table_size || 90,
                                    transform: `rotate(${table.rotation || 0}deg)`,
                                }}
                            >
                                <span>{table.table_name}</span>
                                <span className="text-xs">
                                    {seated}/{capacity}
                                </span>
                            </button>
                        );
                    })}

                    {items.length === 0 && (
                        <div className="flex h-full items-center justify-center text-center">
                            <div>
                                <div className="text-6xl">🪑</div>
                                <p className="mt-4 text-2xl font-black">No tables yet</p>
                                <p className="mt-2 text-slate-500">
                                    Create tables first before arranging the floor plan.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <aside className="rounded-[2rem] bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-black">Table Details</h2>

                {selected ? (
                    <div className="mt-6 space-y-5">
                        <div className="rounded-2xl bg-[#F7F5FF] p-5">
                            <p className="text-sm text-slate-500">Selected Table</p>
                            <p className="mt-1 text-2xl font-black">{selected.table_name}</p>
                            <p className="mt-2 text-sm font-semibold text-slate-600">
                                {(assignmentMap[selected.id]?.length || 0)}/
                                {selected.table_capacity || 0} assigned
                            </p>
                        </div>

                        <Control
                            label="Shape"
                            value={selected.table_shape || "circle"}
                            type="select"
                            options={["circle", "rectangle"]}
                            onChange={(v) =>
                                updateTable(selected.id, { table_shape: v })
                            }
                        />

                        <Control
                            label="Size"
                            value={String(selected.table_size || 90)}
                            type="number"
                            onChange={(v) =>
                                updateTable(selected.id, { table_size: Number(v) })
                            }
                        />

                        <Control
                            label="Rotation"
                            value={String(selected.rotation || 0)}
                            type="number"
                            onChange={(v) =>
                                updateTable(selected.id, { rotation: Number(v) })
                            }
                        />

                        <div>
                            <h3 className="font-black">Assigned Guests</h3>

                            <div className="mt-3 space-y-2">
                                {(assignmentMap[selected.id] || []).map((assignment) => (
                                    <div
                                        key={assignment.id}
                                        className="rounded-xl bg-[#F7F5FF] p-3 text-sm font-semibold"
                                    >
                                        {assignment.registrations?.full_name || "Guest"}
                                    </div>
                                ))}

                                {(!assignmentMap[selected.id] ||
                                    assignmentMap[selected.id].length === 0) && (
                                        <p className="rounded-xl bg-[#F7F5FF] p-3 text-sm text-slate-500">
                                            No guests assigned.
                                        </p>
                                    )}
                            </div>
                        </div>

                        <a
                            href={`/dashboard/events/${eventId}/tables/assign`}
                            className="block rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 text-center font-black text-white"
                        >
                            Assign Guests
                        </a>
                    </div>
                ) : (
                    <p className="mt-6 rounded-2xl bg-[#F7F5FF] p-5 text-slate-500">
                        Select a table to edit its position and details.
                    </p>
                )}
            </aside>
        </div>
    );
}

function Control({
    label,
    value,
    onChange,
    type = "text",
    options = [],
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number" | "select";
    options?: string[];
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>

            {type === "select" ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
            )}
        </div>
    );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TableForm({ eventId }: { eventId: string }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        table_name: "",
        table_capacity: "10",
    });

    async function addTable(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.from("event_tables").insert({
            event_id: eventId,
            table_name: form.table_name,
            table_capacity: Number(form.table_capacity || 10),
        });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        window.location.reload();
    }

    return (
        <form onSubmit={addTable} className="space-y-5">
            <div>
                <label className="mb-2 block font-semibold">Table Name</label>
                <input
                    required
                    value={form.table_name}
                    onChange={(e) => setForm({ ...form, table_name: e.target.value })}
                    placeholder="Table 1"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-semibold">Capacity</label>
                <input
                    required
                    type="number"
                    value={form.table_capacity}
                    onChange={(e) =>
                        setForm({ ...form, table_capacity: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
            </div>

            {message && (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Adding..." : "Add Table"}
            </button>
        </form>
    );
}
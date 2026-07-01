"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TicketTypesManager({
    eventId,
    initialTickets,
}: {
    eventId: string;
    initialTickets: any[];
}) {
    const [tickets, setTickets] = useState(initialTickets);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        ticket_name: "",
        capacity: "0",
        colour: "#4F46E5",
        description: "",
    });

    async function addTicket(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const { data, error } = await supabase
            .from("ticket_types")
            .insert({
                event_id: eventId,
                ticket_name: form.ticket_name,
                capacity: Number(form.capacity || 0),
                colour: form.colour,
                description: form.description,
                display_order: tickets.length + 1,
            })
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setTickets([...tickets, data]);
        setForm({
            ticket_name: "",
            capacity: "0",
            colour: "#4F46E5",
            description: "",
        });
    }

    async function deleteTicket(id: string) {
        const ok = confirm("Delete this ticket type?");
        if (!ok) return;

        const { error } = await supabase.from("ticket_types").delete().eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setTickets(tickets.filter((ticket) => ticket.id !== id));
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <section className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <h2 className="text-2xl font-black">Existing Ticket Types</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span
                                        className="inline-flex rounded-full px-3 py-1 text-xs font-black text-white"
                                        style={{ backgroundColor: ticket.colour }}
                                    >
                                        {ticket.ticket_name}
                                    </span>

                                    <p className="mt-4 text-sm text-slate-500">
                                        Capacity: {ticket.capacity || "Unlimited"}
                                    </p>

                                    <p className="mt-2 text-sm text-slate-600">
                                        {ticket.description || "No description"}
                                    </p>
                                </div>

                                <button
                                    onClick={() => deleteTicket(ticket.id)}
                                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {tickets.length === 0 && (
                        <div className="col-span-full rounded-2xl bg-white p-8 text-center">
                            <div className="text-5xl">🎟️</div>
                            <h3 className="mt-4 text-2xl font-black">No ticket types yet</h3>
                            <p className="mt-2 text-slate-500">
                                Add VIP, Standard, Staff, or other guest categories.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-black">Add Ticket Type</h2>

                <form onSubmit={addTicket} className="mt-6 space-y-5">
                    <Input
                        label="Ticket Name"
                        value={form.ticket_name}
                        onChange={(v) => setForm({ ...form, ticket_name: v })}
                        placeholder="VIP"
                    />

                    <Input
                        label="Capacity"
                        type="number"
                        value={form.capacity}
                        onChange={(v) => setForm({ ...form, capacity: v })}
                        placeholder="50"
                    />

                    <div>
                        <label className="mb-2 block font-semibold">Colour</label>
                        <input
                            type="color"
                            value={form.colour}
                            onChange={(e) => setForm({ ...form, colour: e.target.value })}
                            className="h-12 w-full rounded-xl"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block font-semibold">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                            }
                            rows={4}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            placeholder="For VIP guests and management team."
                        />
                    </div>

                    {message && (
                        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                            {message}
                        </div>
                    )}

                    <button className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white">
                        Add Ticket Type
                    </button>
                </form>
            </section>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                required
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
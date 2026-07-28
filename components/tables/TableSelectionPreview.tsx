"use client";

import {
    Eye,
    Loader2,
    TableProperties,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";

type TableRow = {
    id: string;
    table_name: string;
    capacity: number;
    guest_selectable: boolean;
    selection_label: string | null;
    selection_description: string | null;
    availableSeats: number;
};

type Settings = {
    instructions: string | null;
    page_title: string | null;
    page_subtitle: string | null;
    banner_color_from: string | null;
    banner_color_to: string | null;
    banner_image_url: string | null;
};

type Payload = {
    settings: Settings;
    tables: TableRow[];
};

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: text || "The server returned an invalid response." };
    }
}

export default function TableSelectionPreview({ eventId }: { eventId: string }) {
    const [data, setData] = useState<Payload | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const response = await fetch(`/api/events/${eventId}/table-selection`, { cache: "no-store" });
                const result = await readJson(response);
                if (!response.ok) throw new Error(result.error || "Unable to load table selection.");
                setData(result as Payload);
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to load table selection.");
            }
        })();
    }, [eventId]);

    if (message) {
        return <div className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-700">{message}</div>;
    }

    if (!data) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    const visibleTables = data.tables.filter((table) => table.guest_selectable);

    return (
        <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white">
                <Eye size={16} />
                Preview mode — this is what guests see, no table is reserved here
            </div>

            <section
                className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-xl sm:p-8 md:p-10"
                style={{
                    backgroundImage: data.settings.banner_image_url
                        ? `linear-gradient(rgba(2,6,23,.35), rgba(2,6,23,.55)), url("${data.settings.banner_image_url}")`
                        : `linear-gradient(to right, ${data.settings.banner_color_from || "#4F46E5"}, ${data.settings.banner_color_to || "#EC4899"})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75 sm:text-sm">Registration Complete</p>
                <h1 className="mt-4 text-3xl font-black sm:text-4xl md:text-5xl">{data.settings.page_title || "Choose your table"}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                    {data.settings.page_subtitle || "Your registration has been saved. Choose a table for your party before continuing to your QR pass."}
                </p>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                        <TableProperties size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black sm:text-2xl">Available tables</h2>
                        <p className="mt-1 text-sm text-slate-500">{visibleTables.length} of {data.tables.length} tables shown to guests</p>
                    </div>
                </div>

                {data.settings.instructions && (
                    <p className="mt-5 rounded-2xl bg-indigo-50 px-5 py-4 text-sm font-bold leading-6 text-indigo-800">
                        {data.settings.instructions}
                    </p>
                )}

                {visibleTables.length === 0 ? (
                    <p className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
                        No tables are currently enabled for guest selection.
                    </p>
                ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {visibleTables.map((table) => (
                            <div key={table.id} className="rounded-2xl border border-slate-200 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-black">{table.selection_label || table.table_name}</p>
                                        {table.selection_description && (
                                            <p className="mt-1 text-sm text-slate-500">{table.selection_description}</p>
                                        )}
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${table.availableSeats > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                        {table.availableSeats > 0 ? `${table.availableSeats} seats left` : "Full"}
                                    </span>
                                </div>
                                <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                                    <Users size={13} /> Capacity {table.capacity}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

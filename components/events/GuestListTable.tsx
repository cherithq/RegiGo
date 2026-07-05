"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";

type RegistrationField = {
    id: string;
    field_label: string;
    field_key: string;
    sort_order?: number;
};

type Guest = {
    id: string;
    created_at: string;
    full_name?: string;
    email?: string;
    phone?: string;
    status?: string;
    custom_answers?: Record<string, any> | null;
    [key: string]: any;
};

export default function GuestListTable({
    guests,
    fields,
}: {
    guests: Guest[];
    fields: RegistrationField[];
}) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredGuests = useMemo(() => {
        const cleanSearch = searchTerm.trim().toLowerCase();

        if (!cleanSearch) {
            return guests;
        }

        return guests.filter((guest) => {
            const fieldValues = fields.map((field) =>
                getGuestValue(guest, field.field_key)
            );

            const allValues = [
                guest.full_name,
                guest.email,
                guest.phone,
                guest.status,
                guest.created_at,
                ...fieldValues,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return allValues.includes(cleanSearch);
        });
    }, [guests, fields, searchTerm]);

    function getGuestValue(guest: Guest, fieldKey: string) {
        const directValue = guest[fieldKey];
        const customValue = guest.custom_answers?.[fieldKey];

        if (directValue !== undefined && directValue !== null && directValue !== "") {
            return formatValue(directValue);
        }

        if (customValue !== undefined && customValue !== null && customValue !== "") {
            return formatValue(customValue);
        }

        return "-";
    }

    function formatValue(value: any) {
        if (Array.isArray(value)) {
            return value.join(", ");
        }

        if (typeof value === "object" && value !== null) {
            return JSON.stringify(value);
        }

        return String(value);
    }

    function clearSearch() {
        setSearchTerm("");
    }

    return (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-950">All Guests</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Search registered guests for this event.
                    </p>
                </div>

                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search guest name, email, phone..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-semibold outline-none transition focus:border-[#4F46E5] focus:bg-white md:w-[360px]"
                    />

                    {searchTerm && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#4F46E5]" />
                    Showing {filteredGuests.length} of {guests.length} guest
                    {guests.length === 1 ? "" : "s"}
                </div>

                {searchTerm && (
                    <p>
                        Search result for{" "}
                        <span className="font-black text-[#4F46E5]">"{searchTerm}"</span>
                    </p>
                )}
            </div>

            <div className="mt-6 overflow-x-auto rounded-[2rem] border border-slate-200">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                        <tr>
                            {fields.map((field) => (
                                <th key={field.id} className="whitespace-nowrap p-4 font-black">
                                    {field.field_label}
                                </th>
                            ))}

                            <th className="whitespace-nowrap p-4 font-black">
                                Registered At
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredGuests.map((guest) => (
                            <tr
                                key={guest.id}
                                className="border-t border-slate-100 transition hover:bg-[#F7F5FF]/60"
                            >
                                {fields.map((field) => (
                                    <td
                                        key={field.id}
                                        className="max-w-[260px] break-words p-4 font-semibold text-slate-700"
                                    >
                                        {getGuestValue(guest, field.field_key)}
                                    </td>
                                ))}

                                <td className="whitespace-nowrap p-4 font-semibold text-slate-500">
                                    {guest.created_at
                                        ? new Date(guest.created_at).toLocaleString()
                                        : "-"}
                                </td>
                            </tr>
                        ))}

                        {filteredGuests.length === 0 && (
                            <tr>
                                <td
                                    colSpan={fields.length + 1}
                                    className="p-10 text-center text-slate-500"
                                >
                                    <div className="mx-auto max-w-sm">
                                        <p className="text-lg font-black text-slate-700">
                                            No guests found.
                                        </p>
                                        <p className="mt-2 text-sm leading-6">
                                            Try searching another name, email, phone number or custom
                                            field value.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
"use client";

import QRCode from "react-qr-code";

export default function QRPassCard({
    event,
    guest,
    ticket,
}: {
    event: any;
    guest: any;
    ticket: any;
}) {
    const tableAssignment = Array.isArray(guest.table_assignments)
        ? guest.table_assignments[0]
        : guest.table_assignments;

    const tableName = tableAssignment?.event_tables?.table_name || "-";

    return (
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-[#4F46E5] to-[#EC4899] p-8 text-white">
                <p className="text-sm font-bold text-white/80">RegiGo QR Pass</p>
                <h1 className="mt-3 text-3xl font-black">{event.event_name}</h1>
                <p className="mt-2 text-white/80">{event.venue}</p>
            </div>

            <div className="p-8 text-center">
                <h2 className="text-2xl font-black">{guest.full_name}</h2>
                <p className="mt-1 text-slate-500">{guest.email}</p>

                <div className="mx-auto mt-8 flex h-72 w-72 items-center justify-center rounded-3xl bg-white p-6 shadow-inner">
                    <QRCode value={ticket.qr_token} size={240} className="h-full w-full" />
                </div>

                <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
                    <Info label="Table" value={tableName} />
                    <Info label="Date" value={event.event_date || "-"} />
                    <Info label="Time" value={event.event_time || "-"} />
                    <Info label="Department" value={guest.department || "-"} />
                    <Info label="Dietary" value={guest.dietary_request || "-"} />
                </div>

                <p className="mt-8 rounded-2xl bg-[#F7F5FF] p-4 text-sm font-semibold text-slate-600">
                    Please show this QR code to event personnel during check-in.
                </p>
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-[#F7F5FF] p-4">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 font-black">{value}</p>
        </div>
    );
}
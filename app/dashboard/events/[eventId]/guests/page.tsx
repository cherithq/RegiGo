import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import SendGuestEmailButton from "@/components/guests/SendGuestEmailButton";
import BulkEmailButton from "@/components/guests/BulkEmailButton";

type QrTicket = {
    id?: string;
    registration_id?: string;
    event_id?: string;
    qr_token?: string;
    qr_code_url?: string | null;
    is_active?: boolean;
    issued_at?: string;
    [key: string]: any;
};

type Guest = {
    id: string;
    event_id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    country_code?: string;
    department?: string;
    dietary_request?: string;
    require_transport?: string;
    custom_answers?: Record<string, any>;
    registration_status?: string;
    email_verified?: boolean;
    created_at?: string;
    ticket_type_id?: string;
    __qr_ticket?: QrTicket | null;
    [key: string]: any;
};

type RegistrationField = {
    id: string;
    label?: string;
    field_label?: string;
    name?: string;
    field_name?: string;
    key?: string;
    field_key?: string;
    type?: string;
    sort_order?: number;
    [key: string]: any;
};

function getGuestName(guest: Guest) {
    return guest.full_name || guest.custom_answers?.full_name || "-";
}

function getTableInfo(guest: Guest) {
    return (
        guest.table_name ||
        guest.table_number ||
        guest.table_no ||
        guest.custom_answers?.table ||
        guest.custom_answers?.Table ||
        "-"
    );
}

function isGuestCheckedIn(guest: Guest) {
    return Boolean(
        guest.registration_status === "checked_in" ||
        guest.registration_status === "attended" ||
        guest.__qr_ticket?.is_active === false
    );
}

function getCheckInStatus(guest: Guest) {
    return isGuestCheckedIn(guest) ? "Checked In" : "Not Checked In";
}

function getFieldLabel(field: RegistrationField) {
    return (
        field.label ||
        field.field_label ||
        field.name ||
        field.field_name ||
        field.key ||
        field.field_key ||
        "Field"
    );
}

function getFieldKey(field: RegistrationField) {
    return (
        field.key ||
        field.field_key ||
        field.name ||
        field.field_name ||
        field.label ||
        field.field_label ||
        ""
    );
}

function getGuestFieldValue(guest: Guest, field: RegistrationField) {
    const key = getFieldKey(field);

    if (!key) return "-";

    const value = guest[key] ?? guest.custom_answers?.[key];

    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

export default async function GuestsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    await requirePermission("can_manage_guests");

    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    const baseGuests = (guests || []) as Guest[];
    const registrationIds = baseGuests.map((guest) => guest.id);

    let guestsWithQrTickets: Guest[] = baseGuests;

    if (registrationIds.length > 0) {
        const { data: qrTickets } = await supabaseServer
            .from("qr_tickets")
            .select("*")
            .in("registration_id", registrationIds);

        const qrTicketMap = new Map<string, QrTicket>();

        for (const ticket of (qrTickets || []) as QrTicket[]) {
            if (!ticket.registration_id) continue;

            const existing = qrTicketMap.get(ticket.registration_id);

            if (!existing) {
                qrTicketMap.set(ticket.registration_id, ticket);
                continue;
            }

            if (ticket.is_active === false && existing.is_active !== false) {
                qrTicketMap.set(ticket.registration_id, ticket);
            }
        }

        guestsWithQrTickets = baseGuests.map((guest) => ({
            ...guest,
            __qr_ticket: qrTicketMap.get(guest.id) || null,
        }));
    }

    const { data: form } = await supabaseServer
        .from("registration_forms")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    let fields: RegistrationField[] = [];

    if (form?.id) {
        const { data: registrationFields } = await supabaseServer
            .from("registration_fields")
            .select("*")
            .eq("form_id", form.id)
            .order("sort_order", { ascending: true });

        fields = (registrationFields || []) as RegistrationField[];
    }

    const guestList = guestsWithQrTickets;
    const fieldList = fields;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 font-bold text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={18} />
                    Back to Event
                </Link>

                <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                                Guest Management
                            </p>

                            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                                Guest List
                            </h1>

                            <p className="mt-2 text-slate-600">
                                {event.event_name || event.title || event.name}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                            <div className="rounded-2xl bg-[#F7F5FF] px-5 py-4 text-sm font-black text-[#4F46E5]">
                                {guestList.length} guest
                                {guestList.length === 1 ? "" : "s"} registered
                            </div>

                            <div className="flex flex-wrap gap-3 lg:justify-end">
                                <BulkEmailButton eventId={eventId} type="reminder" />

                                <BulkEmailButton
                                    eventId={eventId}
                                    type="thank_you"
                                    checkedInOnly={true}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                    {guestList.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                <Mail size={24} />
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950">
                                No guests registered yet
                            </h2>

                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                Once guests register, they will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                        <th className="px-5 py-4">Guest</th>
                                        <th className="px-5 py-4">Email</th>
                                        <th className="px-5 py-4">Phone</th>
                                        <th className="px-5 py-4">Department</th>
                                        <th className="px-5 py-4">Table</th>
                                        <th className="px-5 py-4">Check-In</th>

                                        {fieldList.map((field) => (
                                            <th key={field.id} className="px-5 py-4">
                                                {getFieldLabel(field)}
                                            </th>
                                        ))}

                                        <th className="px-5 py-4">Email Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {guestList.map((guest) => (
                                        <tr
                                            key={guest.id}
                                            className="border-b border-slate-100 align-top transition hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4 text-sm font-black text-slate-950">
                                                {getGuestName(guest)}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                                                {guest.email || "-"}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                                                {guest.phone || "-"}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                                                {guest.department || "-"}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                                                {getTableInfo(guest)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={
                                                        getCheckInStatus(guest) === "Checked In"
                                                            ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                                                            : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                                                    }
                                                >
                                                    {getCheckInStatus(guest)}
                                                </span>
                                            </td>

                                            {fieldList.map((field) => (
                                                <td
                                                    key={field.id}
                                                    className="max-w-[240px] px-5 py-4 text-sm font-semibold text-slate-600"
                                                >
                                                    <div className="line-clamp-3">
                                                        {getGuestFieldValue(guest, field)}
                                                    </div>
                                                </td>
                                            ))}

                                            <td className="px-5 py-4">
                                                <SendGuestEmailButton
                                                    eventId={eventId}
                                                    registrationId={guest.id}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
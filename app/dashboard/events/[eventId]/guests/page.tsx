import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import BulkEmailButton from "@/components/guests/BulkEmailButton";
import GuestsManager from "@/components/guests/GuestsManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    ticket_type_id?: string | null;
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
    field_type?: string;
    sort_order?: number;
    options?: any;
    field_options?: any;
    [key: string]: any;
};

export default async function GuestsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { supabaseServer } = await requirePermission("can_manage_guests");
    const { eventId } = await params;

    const [eventResult, guestsResult, formResult] = await Promise.all([
        supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        supabaseServer
            .from("registrations")
            .select(
                "id, event_id, full_name, email, phone, country_code, department, dietary_request, require_transport, custom_answers, registration_status, email_verified, created_at, ticket_type_id"
            )
            .eq("event_id", eventId)
            .order("created_at", { ascending: false }),

        supabaseServer
            .from("registration_forms")
            .select("id")
            .eq("event_id", eventId)
            .maybeSingle(),
    ]);

    const event = eventResult.data;

    if (eventResult.error) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">
                        Failed to load event: {eventResult.error.message}
                    </p>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const baseGuests = (guestsResult.data || []) as Guest[];
    const registrationIds = baseGuests.map((guest) => guest.id);
    const form = formResult.data;

    const [qrTicketsResult, fieldsResult] = await Promise.all([
        registrationIds.length > 0
            ? supabaseServer
                  .from("qr_tickets")
                  .select(
                      "id, registration_id, event_id, qr_token, qr_code_url, is_active, issued_at"
                  )
                  .in("registration_id", registrationIds)
            : Promise.resolve({ data: [] as QrTicket[] }),

        form?.id
            ? supabaseServer
                  .from("registration_fields")
                  .select(
                      "id, form_id, field_label, field_key, field_type, field_options, options, sort_order"
                  )
                  .eq("form_id", form.id)
                  .order("sort_order", { ascending: true })
            : Promise.resolve({ data: [] as RegistrationField[] }),
    ]);

    const qrTicketMap = new Map<string, QrTicket>();

    for (const ticket of (qrTicketsResult.data || []) as QrTicket[]) {
        if (!ticket.registration_id) continue;

        const existing = qrTicketMap.get(ticket.registration_id);

        if (!existing) {
            qrTicketMap.set(ticket.registration_id, ticket);
            continue;
        }

        if (ticket.is_active !== false && existing.is_active === false) {
            qrTicketMap.set(ticket.registration_id, ticket);
        }
    }

    const guestsWithQrTickets = baseGuests.map((guest) => ({
        ...guest,
        __qr_ticket: qrTicketMap.get(guest.id) || null,
    }));

    const fields = (fieldsResult.data || []) as RegistrationField[];
    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Link
                            href={`/dashboard/events/${eventId}`}
                            className="inline-flex items-center gap-2 font-bold text-[#4F46E5] transition hover:text-[#EC4899]"
                        >
                            <ArrowLeft size={18} />
                            Back to Event
                        </Link>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
                            Guests
                        </h1>

                        <p className="mt-1 text-sm font-bold text-slate-500">
                            {eventName}
                        </p>
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

                <GuestsManager
                    eventId={eventId}
                    initialGuests={guestsWithQrTickets}
                    fields={fields}
                />
            </div>
        </main>
    );
}
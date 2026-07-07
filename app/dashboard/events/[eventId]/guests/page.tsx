import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
    sort_order?: number;
    options?: any;
    [key: string]: any;
};

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

            if (ticket.is_active !== false && existing.is_active === false) {
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
                        <p className="mt-1 text-sm font-bold text-slate-500">{eventName}</p>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:justify-end">
                        <BulkEmailButton eventId={eventId} type="reminder" />
                        <BulkEmailButton eventId={eventId} type="thank_you" checkedInOnly={true} />
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

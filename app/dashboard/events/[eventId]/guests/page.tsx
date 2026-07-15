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

async function loadAllRegistrations(
    supabaseServer: any,
    eventId: string
) {
    const pageSize = 1000;
    const registrations: Guest[] = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabaseServer
            .from("registrations")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) {
            return {
                data: [] as Guest[],
                error,
            };
        }

        const rows = (data || []) as Guest[];
        registrations.push(...rows);

        if (rows.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return {
        data: registrations,
        error: null,
    };
}

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

        loadAllRegistrations(
            supabaseServer,
            eventId
        ),

        supabaseServer
            .from("registration_forms")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle(),
    ]);

    const event = eventResult.data;

    if (eventResult.error) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">
                        Failed to load event: {eventResult.error.message}
                    </p>
                </div>
            </main>
        );
    }

    if (guestsResult.error) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">
                        Failed to load guests: {guestsResult.error.message}
                    </p>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
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
                  .select("*")
                  .in("registration_id", registrationIds)
            : Promise.resolve({ data: [] as QrTicket[] }),

        form?.id
            ? supabaseServer
                  .from("registration_fields")
                  .select("*")
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
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Guests
                            </h1>

                            <p className="mt-2 text-sm font-bold text-slate-500 md:text-base">
                                {eventName}
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Showing all {baseGuests.length} registered guest
                                {baseGuests.length === 1 ? "" : "s"}. Use the
                                search, check-in filter and page controls below.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:flex sm:flex-wrap lg:justify-end">
                            <BulkEmailButton eventId={eventId} type="reminder" />
                            <BulkEmailButton
                                eventId={eventId}
                                type="thank_you"
                                checkedInOnly={true}
                            />
                        </div>
                    </div>
                </section>

                <div className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <GuestsManager
                        eventId={eventId}
                        initialGuests={guestsWithQrTickets}
                        fields={fields}
                    />
                </div>
            </div>
        </main>
    );
}
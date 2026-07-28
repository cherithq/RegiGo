import Link from "next/link";
import {
    MailCheck,
} from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";
import BulkEmailButton from "@/components/guests/BulkEmailButton";
import GuestsManager from "@/components/guests/GuestsManager";
import BackButton from "@/components/layout/BackButton";

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
    rsvp_status?: string | null;
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
    await requirePermission(
        "can_manage_guests",
    );

    const { eventId } = await params;

    // Service-role client: this page needs to see every registration for
    // the event regardless of how the row was created (registration form,
    // admin import, or a direct database insert), and RLS on these tables
    // can otherwise hide rows from the signed-in session even though
    // requirePermission already gates access to this page.
    const admin = getSupabaseAdminClient();

    const { data: event } =
        await admin
            .from("events")
            .select("*")
            .eq("id", eventId)
            .single();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">
                        Event not found.
                    </p>
                </div>
            </main>
        );
    }

    const [
        { data: guests },
        registeredCountResult,
        checkedInCountResult,
    ] = await Promise.all([
        admin
            .from("registrations")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", {
                ascending: false,
            }),

        admin
            .from("registrations")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("event_id", eventId)
            .not("registration_status", "in", "(cancelled,declined)"),

        admin
            .from("check_ins")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("event_id", eventId),
    ]);

    const initialCounters = {
        registered: registeredCountResult.count || 0,
        checkedIn: checkedInCountResult.count || 0,
    };

    const baseGuests =
        (guests || []) as Guest[];

    const registrationIds = baseGuests.map(
        (guest) => guest.id,
    );

    let guestsWithQrTickets: Guest[] =
        baseGuests;

    if (registrationIds.length > 0) {
        const { data: qrTickets } =
            await admin
                .from("qr_tickets")
                .select("*")
                .in(
                    "registration_id",
                    registrationIds,
                );

        const qrTicketMap = new Map<
            string,
            QrTicket
        >();

        for (const ticket of
            (qrTickets || []) as QrTicket[]) {
            if (!ticket.registration_id) {
                continue;
            }

            const existing =
                qrTicketMap.get(
                    ticket.registration_id,
                );

            if (!existing) {
                qrTicketMap.set(
                    ticket.registration_id,
                    ticket,
                );
                continue;
            }

            if (
                ticket.is_active !== false &&
                existing.is_active === false
            ) {
                qrTicketMap.set(
                    ticket.registration_id,
                    ticket,
                );
            }
        }

        guestsWithQrTickets =
            baseGuests.map((guest) => ({
                ...guest,
                __qr_ticket:
                    qrTicketMap.get(guest.id) ||
                    null,
            }));
    }

    const { data: form } =
        await admin
            .from("registration_forms")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle();

    let fields: RegistrationField[] = [];

    if (form?.id) {
        const { data: registrationFields } =
            await admin
                .from("registration_fields")
                .select("*")
                .eq("form_id", form.id)
                .order("sort_order", {
                    ascending: true,
                });

        fields =
            (registrationFields ||
                []) as RegistrationField[];
    }

    const eventName =
        event.event_name ||
        event.title ||
        event.name ||
        "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <BackButton href={`/dashboard/events/${eventId}`}>
                            Back to Event
                        </BackButton>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
                            Guests
                        </h1>

                        <p className="mt-1 text-sm font-bold text-slate-500">
                            {eventName}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:justify-end">
                        <Link
                            href={`/dashboard/events/${eventId}/invitations`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                        >
                            <MailCheck size={17} />
                            Invitations & RSVP
                        </Link>

                        <BulkEmailButton
                            eventId={eventId}
                            type="reminder"
                        />

                        <BulkEmailButton
                            eventId={eventId}
                            type="thank_you"
                            checkedInOnly={true}
                        />
                    </div>
                </div>

                <GuestsManager
                    eventId={eventId}
                    initialGuests={
                        guestsWithQrTickets
                    }
                    initialCounters={
                        initialCounters
                    }
                    fields={fields}
                />
            </div>
        </main>
    );
}

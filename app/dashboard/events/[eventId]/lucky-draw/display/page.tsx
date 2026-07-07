import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import LuckyDrawAudienceDisplay from "@/components/lucky-draw/LuckyDrawAudienceDisplay";

type Registration = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    registration_status: string | null;
};

type QrTicket = {
    id: string;
    registration_id: string;
    event_id: string;
    qr_token: string | null;
    qr_code_url: string | null;
    is_active: boolean | null;
    issued_at: string | null;
};

type CheckIn = {
    id: string;
    registration_id: string;
    event_id: string;
    scan_result: string | null;
    created_at?: string | null;
};

function isCheckedInGuest({
    registration,
    qrTicket,
    checkIn,
}: {
    registration: Registration;
    qrTicket?: QrTicket | null;
    checkIn?: CheckIn | null;
}) {
    return Boolean(
        registration.registration_status === "checked_in" ||
        registration.registration_status === "attended" ||
        qrTicket?.is_active === false ||
        checkIn
    );
}

export default async function LuckyDrawDisplayPage({
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
            <main className="min-h-screen bg-slate-950 p-8 text-white">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white/10 p-8">
                    <p className="font-black text-red-300">Event not found.</p>
                </div>
            </main>
        );
    }

    const { data: registrations } = await supabaseServer
        .from("registrations")
        .select("id, full_name, email, phone, department, registration_status")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    const registrationList = (registrations || []) as Registration[];
    const registrationIds = registrationList.map((guest) => guest.id);

    let qrTickets: QrTicket[] = [];
    let checkIns: CheckIn[] = [];

    if (registrationIds.length > 0) {
        const { data: qrTicketRows } = await supabaseServer
            .from("qr_tickets")
            .select("*")
            .in("registration_id", registrationIds);

        qrTickets = (qrTicketRows || []) as QrTicket[];

        const { data: checkInRows } = await supabaseServer
            .from("check_ins")
            .select("*")
            .eq("event_id", eventId)
            .eq("scan_result", "checked_in")
            .in("registration_id", registrationIds);

        checkIns = (checkInRows || []) as CheckIn[];
    }

    const qrTicketMap = new Map<string, QrTicket>();

    for (const ticket of qrTickets) {
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

    const checkInMap = new Map<string, CheckIn>();

    for (const checkIn of checkIns) {
        if (!checkIn.registration_id) continue;
        checkInMap.set(checkIn.registration_id, checkIn);
    }

    const checkedInGuests = registrationList
        .filter((registration) =>
            isCheckedInGuest({
                registration,
                qrTicket: qrTicketMap.get(registration.id),
                checkIn: checkInMap.get(registration.id),
            })
        )
        .map((registration) => ({
            id: registration.id,
            full_name: registration.full_name,
            email: registration.email,
            phone: registration.phone,
            department: registration.department,
            checked_in_at:
                checkInMap.get(registration.id)?.created_at ||
                qrTicketMap.get(registration.id)?.issued_at ||
                null,
        }));

    const { data: winners } = await supabaseServer
        .from("lucky_draw_winners")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    const { data: prizes } = await supabaseServer
        .from("lucky_draw_prizes")
        .select("*")
        .eq("event_id", eventId)
        .order("prize_order", { ascending: true });

    const { data: displaySettings } = await supabaseServer
        .from("lucky_draw_display_settings")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="absolute left-6 top-6 z-50 flex flex-wrap gap-3">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                    <ArrowLeft size={18} />
                    Back to Event
                </Link>

                <Link
                    href={`/dashboard/events/${eventId}/lucky-draw/settings`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                >
                    <Settings size={18} />
                    Display Settings
                </Link>
            </div>

            <LuckyDrawAudienceDisplay
                eventId={eventId}
                eventName={
                    event.event_name || event.title || event.name || "Lucky Draw"
                }
                guests={checkedInGuests}
                initialWinners={winners || []}
                initialPrizes={prizes || []}
                displaySettings={displaySettings}
            />
        </main>
    );
}
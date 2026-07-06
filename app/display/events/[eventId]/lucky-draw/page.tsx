import { Gift } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import LuckyDrawAudienceDisplay from "@/components/lucky-draw/LuckyDrawAudienceDisplay";

type CheckedInGuest = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    checked_in_at: string | null;
};

export default async function LuckyDrawDisplayPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();

    await requirePermission("can_scan_qr");

    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white">
                <div className="rounded-[2rem] bg-white/10 p-8 text-center">
                    <p className="text-2xl font-black">Event not found</p>
                </div>
            </main>
        );
    }

    const { data: checkIns } = await supabaseServer
        .from("check_ins")
        .select("*")
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in")
        .order("checked_in_at", { ascending: false });

    const checkedInRegistrationIds = Array.from(
        new Set((checkIns || []).map((item) => item.registration_id).filter(Boolean))
    );

    let checkedInGuests: CheckedInGuest[] = [];

    if (checkedInRegistrationIds.length > 0) {
        const { data: registrations } = await supabaseServer
            .from("registrations")
            .select("id, full_name, email, phone, department")
            .eq("event_id", eventId)
            .in("id", checkedInRegistrationIds);

        checkedInGuests = (registrations || []).map((guest) => {
            const checkIn = (checkIns || []).find(
                (item) => item.registration_id === guest.id
            );

            return {
                id: guest.id,
                full_name: guest.full_name,
                email: guest.email,
                phone: guest.phone,
                department: guest.department,
                checked_in_at: checkIn?.checked_in_at || checkIn?.created_at || null,
            };
        });
    }

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

    return (
        <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
            <div className="pointer-events-none fixed left-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-[#4F46E5]/30 blur-3xl" />
            <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] h-[620px] w-[620px] rounded-full bg-[#EC4899]/30 blur-3xl" />

            <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-8 py-8">
                <header>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-black text-white backdrop-blur">
                        <Gift size={16} />
                        Lucky Draw Display
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                        {event.event_name}
                    </h1>
                </header>

                <div className="flex flex-1 items-center py-8">
                    <LuckyDrawAudienceDisplay
                        eventId={eventId}
                        eventName={event.event_name || "Event"}
                        guests={checkedInGuests}
                        initialWinners={winners || []}
                        initialPrizes={prizes || []}
                    />
                </div>
            </section>
        </main>
    );
}
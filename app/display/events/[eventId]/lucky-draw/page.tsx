import { Gift } from "lucide-react";
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

export const dynamic = "force-dynamic";

export default async function LuckyDrawDisplayPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { supabaseServer } = await requirePermission("can_scan_qr");
    const { eventId } = await params;

    const [eventResult, checkInsResult, winnersResult, prizesResult] =
        await Promise.all([
            supabaseServer
                .from("events")
                .select("*")
                .eq("id", eventId)
                .maybeSingle(),

            supabaseServer
                .from("check_ins")
                .select("*")
                .eq("event_id", eventId)
                .eq("scan_result", "checked_in")
                .order("checked_in_at", { ascending: false }),

            supabaseServer
                .from("lucky_draw_winners")
                .select("*")
                .eq("event_id", eventId)
                .order("created_at", { ascending: false }),

            supabaseServer
                .from("lucky_draw_prizes")
                .select("*")
                .eq("event_id", eventId)
                .order("prize_order", { ascending: true }),
        ]);

    const event = eventResult.data;

    if (eventResult.error || !event) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white md:p-8">
                <div className="rounded-[1.5rem] bg-white/10 p-6 text-center backdrop-blur md:rounded-[2rem] md:p-8">
                    <p className="text-2xl font-black">Event not found</p>

                    {eventResult.error?.message && (
                        <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/70">
                            {eventResult.error.message}
                        </p>
                    )}
                </div>
            </main>
        );
    }

    const checkIns = checkInsResult.data || [];

    const checkedInRegistrationIds = Array.from(
        new Set(
            checkIns
                .map((item: any) => item.registration_id)
                .filter(Boolean)
        )
    );

    const checkInMap = new Map<string, any>();

    for (const checkIn of checkIns as any[]) {
        if (!checkIn.registration_id) continue;

        if (!checkInMap.has(checkIn.registration_id)) {
            checkInMap.set(checkIn.registration_id, checkIn);
        }
    }

    let checkedInGuests: CheckedInGuest[] = [];

    if (checkedInRegistrationIds.length > 0) {
        const { data: registrations } = await supabaseServer
            .from("registrations")
            .select("id, full_name, email, phone, department")
            .eq("event_id", eventId)
            .in("id", checkedInRegistrationIds);

        checkedInGuests = (registrations || []).map((guest: any) => {
            const checkIn = checkInMap.get(guest.id);

            return {
                id: guest.id,
                full_name: guest.full_name,
                email: guest.email,
                phone: guest.phone,
                department: guest.department,
                checked_in_at:
                    checkIn?.checked_in_at || checkIn?.created_at || null,
            };
        });
    }

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
            <div className="pointer-events-none fixed left-[-35%] top-[-20%] h-[360px] w-[360px] rounded-full bg-[#4F46E5]/30 blur-3xl md:left-[-10%] md:h-[520px] md:w-[520px]" />
            <div className="pointer-events-none fixed bottom-[-25%] right-[-35%] h-[420px] w-[420px] rounded-full bg-[#EC4899]/30 blur-3xl md:right-[-10%] md:h-[620px] md:w-[620px]" />

            <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 md:px-8 md:py-8">
                <header className="shrink-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white backdrop-blur md:px-5 md:text-sm">
                        <Gift size={15} />
                        Lucky Draw Display
                    </div>

                    <h1 className="mt-4 max-w-5xl text-3xl font-black tracking-tight sm:text-4xl md:text-6xl">
                        {eventName}
                    </h1>

                    <p className="mt-3 text-sm font-semibold text-white/60 md:text-base">
                        {checkedInGuests.length} checked-in guest
                        {checkedInGuests.length === 1 ? "" : "s"} eligible
                    </p>
                </header>

                <div className="flex flex-1 items-center py-5 md:py-8">
                    <div className="w-full">
                        <LuckyDrawAudienceDisplay
                            eventId={eventId}
                            eventName={eventName}
                            guests={checkedInGuests}
                            initialWinners={winnersResult.data || []}
                            initialPrizes={prizesResult.data || []}
                        />
                    </div>
                </div>
            </section>
        </main>
    );
}
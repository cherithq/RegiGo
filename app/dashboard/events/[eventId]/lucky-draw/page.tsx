import Link from "next/link";
import {
    ArrowLeft,
    ExternalLink,
    Gift,
    Sparkles,
    Trophy,
    CheckCircle2,
} from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import LuckyDrawWheel from "@/components/lucky-draw/LuckyDrawWheel";

type CheckedInGuest = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    checked_in_at: string | null;
    custom_answers?: Record<string, unknown> | null;
};

type RegistrationField = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    field_options?: any;
    options?: any;
    sort_order?: number;
};

export default async function LuckyDrawPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { supabaseServer } = await requirePermission("can_scan_qr");
    const { eventId } = await params;

    const [
        eventResult,
        checkInsResult,
        registrationFormResult,
        winnersResult,
        prizesResult,
    ] = await Promise.all([
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
            .from("registration_forms")
            .select("id")
            .eq("event_id", eventId)
            .maybeSingle(),

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

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const checkIns = checkInsResult.data || [];

    const checkedInRegistrationIds = Array.from(
        new Set(
            (checkIns || [])
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

    const registrationForm = registrationFormResult.data;

    const [registrationsResult, fieldRowsResult] = await Promise.all([
        checkedInRegistrationIds.length > 0
            ? supabaseServer
                  .from("registrations")
                  .select("id, full_name, email, phone, department, custom_answers")
                  .eq("event_id", eventId)
                  .in("id", checkedInRegistrationIds)
            : Promise.resolve({ data: [], error: null }),

        registrationForm?.id
            ? supabaseServer
                  .from("registration_fields")
                  .select(
                      "id, field_label, field_key, field_type, field_options, options, sort_order"
                  )
                  .eq("form_id", registrationForm.id)
                  .order("sort_order", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
    ]);

    const checkedInGuests: CheckedInGuest[] = (
        registrationsResult.data || []
    ).map((guest: any) => {
        const checkIn = checkInMap.get(guest.id);

        return {
            id: guest.id,
            full_name: guest.full_name,
            email: guest.email,
            phone: guest.phone,
            department: guest.department,
            custom_answers: guest.custom_answers || {},
            checked_in_at: checkIn?.checked_in_at || checkIn?.created_at || null,
        };
    });

    const registrationFields = (fieldRowsResult.data || []) as RegistrationField[];
    const winners = winnersResult.data || [];
    const prizes = prizesResult.data || [];

    const totalCheckedIn = checkedInGuests.length;
    const totalWinners = winners.length;
    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-64 md:w-64" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-40 md:h-64 md:w-64" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <Gift size={15} />
                                Event Day Lucky Draw
                            </div>

                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                                Lucky Draw
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:mt-4 md:text-lg md:leading-7">
                                Create prizes, choose which checked-in guests are eligible for
                                each prize, then spin the wheel for the selected prize.
                            </p>

                            <p className="mt-3 text-sm font-bold text-slate-500">
                                {eventName}
                            </p>
                        </div>

                        <div className="grid gap-4">
                            <Link
                                href={`/display/events/${eventId}/lucky-draw`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90 sm:w-auto md:px-6 md:py-4 md:text-base"
                            >
                                <ExternalLink size={18} />
                                Open Audience Display
                            </Link>

                            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 md:rounded-[2rem] md:p-6">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                        <Sparkles size={22} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-500">
                                            Prize Eligibility
                                        </p>
                                        <p className="text-xl font-black text-slate-950 md:text-2xl">
                                            Select by form field
                                        </p>
                                    </div>
                                </div>

                                <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                                    Filter checked-in guests using registration form answers.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-3 gap-3 md:gap-5">
                    <StatCard
                        title="Checked-In"
                        value={totalCheckedIn}
                        text="Available"
                        icon={CheckCircle2}
                    />

                    <StatCard
                        title="Prizes"
                        value={prizes.length}
                        text="Created"
                        icon={Gift}
                    />

                    <StatCard
                        title="Winners"
                        value={totalWinners}
                        text="Drawn"
                        icon={Trophy}
                    />
                </section>

                <section className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <LuckyDrawWheel
                        eventId={eventId}
                        eventName={eventName}
                        guests={checkedInGuests}
                        initialWinners={winners}
                        initialPrizes={prizes}
                        registrationFields={registrationFields}
                    />
                </section>
            </div>
        </main>
    );
}

function StatCard({
    title,
    value,
    text,
    icon: Icon,
}: {
    title: string;
    value: number;
    text: string;
    icon: any;
}) {
    return (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="w-fit rounded-2xl bg-[#F7F5FF] p-2.5 text-[#4F46E5] md:p-3">
                <Icon size={20} />
            </div>

            <p className="mt-4 text-xs font-bold text-slate-500 md:mt-6 md:text-sm">
                {title}
            </p>

            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:mt-2 md:text-4xl">
                {value}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 md:mt-3 md:text-sm md:leading-6">
                {text}
            </p>
        </div>
    );
}
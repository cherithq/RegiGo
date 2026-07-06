import Link from "next/link";
import {
    ArrowLeft,
    ExternalLink,
    Gift,
    Sparkles,
    Trophy,
    Users,
    CheckCircle2,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import LuckyDrawWheel from "@/components/lucky-draw/LuckyDrawWheel";

type CheckedInGuest = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    checked_in_at: string | null;
};

export default async function LuckyDrawPage({
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
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
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

    const totalCheckedIn = checkedInGuests.length;
    const totalWinners = winners?.length || 0;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Gift size={16} />
                                Event Day Lucky Draw
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Lucky Draw Wheel
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                                Create prizes, choose which checked-in guests are eligible for
                                each prize, then spin the wheel for the selected prize.
                            </p>

                            <p className="mt-3 text-sm font-bold text-slate-500">
                                {event.event_name}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <Link
                                href={`/display/events/${eventId}/lucky-draw`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                            >
                                <ExternalLink size={18} />
                                Open Audience Display
                            </Link>

                            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                        <Sparkles size={24} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-500">
                                            Prize Eligibility
                                        </p>
                                        <p className="text-3xl font-black text-slate-950">
                                            Select by prize
                                        </p>
                                    </div>
                                </div>

                                <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                                    Audience display hides backend setup, guest emails, group
                                    allocation, and eligibility controls.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-5 md:grid-cols-3">
                    <StatCard
                        title="Checked-In Guests"
                        value={totalCheckedIn}
                        text="Guests currently available for draw setup"
                        icon={CheckCircle2}
                    />

                    <StatCard
                        title="Prizes Created"
                        value={prizes?.length || 0}
                        text="Each prize can have its own eligible group"
                        icon={Gift}
                    />

                    <StatCard
                        title="Winners Drawn"
                        value={totalWinners}
                        text="Saved lucky draw winners"
                        icon={Trophy}
                    />
                </section>

                <section className="mt-8">
                    <LuckyDrawWheel
                        eventId={eventId}
                        eventName={event.event_name || "Event"}
                        guests={checkedInGuests}
                        initialWinners={winners || []}
                        initialPrizes={prizes || []}
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
        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="w-fit rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] transition group-hover:bg-[#4F46E5] group-hover:text-white">
                <Icon size={24} />
            </div>

            <p className="mt-6 text-sm font-bold text-slate-500">{title}</p>

            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {value}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}
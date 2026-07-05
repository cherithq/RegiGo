import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    MapPin,
    QrCode,
    ScanLine,
    Search,
    ShieldCheck,
    Ticket,
    Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CameraScanner from "@/components/scanner/CameraScanner";
import ManualCheckIn from "@/components/scanner/ManualCheckIn";
import { requirePermission } from "@/lib/permissions";

export default async function ScannerPage({
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

    const { count: totalGuests } = await supabaseServer
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

    const { count: checkedInGuests } = await supabaseServer
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in");

    const total = totalGuests || 0;
    const checkedIn = checkedInGuests || 0;
    const pending = Math.max(total - checkedIn, 0);
    const checkedInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

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

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <ScanLine size={16} />
                                Event Check-In
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                QR Scanner
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                                Scan guest QR passes or manually search for registrations to
                                complete check-in for this event.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <EventInfo
                                    icon={Ticket}
                                    label={event.event_name || "Untitled Event"}
                                />

                                {event.event_date && (
                                    <EventInfo
                                        icon={CalendarDays}
                                        label={formatDate(event.event_date)}
                                    />
                                )}

                                {event.venue && <EventInfo icon={MapPin} label={event.venue} />}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                    <ShieldCheck size={24} />
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-slate-500">
                                        Check-in Progress
                                    </p>
                                    <p className="text-3xl font-black text-slate-950">
                                        {checkedInRate}%
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                    style={{ width: `${checkedInRate}%` }}
                                />
                            </div>

                            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                                {checkedIn} of {total} registered guests have checked in.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-5 md:grid-cols-3">
                    <StatCard
                        title="Total Guests"
                        value={total}
                        text="Registered guests"
                        icon={Users}
                    />

                    <StatCard
                        title="Checked In"
                        value={checkedIn}
                        text="Verified arrivals"
                        icon={CheckCircle2}
                    />

                    <StatCard
                        title="Pending"
                        value={pending}
                        text="Not checked in yet"
                        icon={QrCode}
                    />
                </section>

                <section className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                    <QrCode size={16} />
                                    Camera Mode
                                </div>

                                <h2 className="mt-4 text-2xl font-black text-slate-950">
                                    Scan QR Pass
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Use the device camera to scan the QR code from the guest email
                                    or pass page.
                                </p>
                            </div>
                        </div>

                        <CameraScanner eventId={eventId} />
                    </div>

                    <div className="space-y-8">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Search size={16} />
                                Manual Mode
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950">
                                Manual Check-In
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Search for a guest manually when their QR code cannot be scanned.
                            </p>

                            <div className="mt-6">
                                <ManualCheckIn eventId={eventId} />
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-black text-slate-950">
                                Check-In Tips
                            </h3>

                            <div className="mt-5 space-y-4">
                                <TipItem text="Ask guests to open the QR pass from their confirmation email." />
                                <TipItem text="Increase screen brightness if the QR code is hard to scan." />
                                <TipItem text="Use manual check-in when the guest has no email access." />
                                <TipItem text="Duplicate scans will be blocked automatically." />
                            </div>
                        </div>
                    </div>
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

function EventInfo({
    icon: Icon,
    label,
}: {
    icon: any;
    label: string;
}) {
    return (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
            <Icon size={16} className="text-[#4F46E5]" />
            <span>{label}</span>
        </div>
    );
}

function TipItem({ text }: { text: string }) {
    return (
        <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-[#4F46E5]" />
            <p className="text-sm font-semibold leading-6 text-slate-600">{text}</p>
        </div>
    );
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
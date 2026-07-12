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
import CameraScanner from "@/components/scanner/CameraScanner";
import ManualCheckIn from "@/components/scanner/ManualCheckIn";
import { requirePermission } from "@/lib/permissions";

export default async function ScannerPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { supabaseServer } = await requirePermission("can_scan_qr");
    const { eventId } = await params;

    const [eventResult, totalGuestsResult, checkedInGuestsResult] =
        await Promise.all([
            supabaseServer
                .from("events")
                .select("*")
                .eq("id", eventId)
                .maybeSingle(),

            supabaseServer
                .from("registrations")
                .select("id", { count: "exact", head: true })
                .eq("event_id", eventId),

            supabaseServer
                .from("check_ins")
                .select("id", { count: "exact", head: true })
                .eq("event_id", eventId)
                .eq("scan_result", "checked_in"),
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

    const total = totalGuestsResult.count || 0;
    const checkedIn = checkedInGuestsResult.count || 0;
    const pending = Math.max(total - checkedIn, 0);
    const checkedInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    const eventName = event.event_name || event.title || event.name || "Untitled Event";

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

                    <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center lg:gap-8">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <ScanLine size={15} />
                                Event Check-In
                            </div>

                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                                QR Scanner
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:mt-4 md:text-lg md:leading-7">
                                Scan guest QR passes or manually search for registrations to
                                complete check-in for this event.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2 md:mt-6 md:gap-3">
                                <EventInfo icon={Ticket} label={eventName} />

                                {event.event_date && (
                                    <EventInfo
                                        icon={CalendarDays}
                                        label={formatDate(event.event_date)}
                                    />
                                )}

                                {event.venue && (
                                    <EventInfo icon={MapPin} label={event.venue} />
                                )}
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 md:rounded-[2rem] md:p-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                    <ShieldCheck size={22} />
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

                <section className="grid grid-cols-3 gap-3 md:gap-5">
                    <StatCard
                        title="Total"
                        value={total}
                        text="Guests"
                        icon={Users}
                    />

                    <StatCard
                        title="In"
                        value={checkedIn}
                        text="Checked"
                        icon={CheckCircle2}
                    />

                    <StatCard
                        title="Left"
                        value={pending}
                        text="Pending"
                        icon={QrCode}
                    />
                </section>

                <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:gap-8">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                        <div className="mb-5 md:mb-6">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <QrCode size={15} />
                                Camera Mode
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950 md:text-3xl">
                                Scan QR Pass
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Use your phone camera to scan the QR code from the guest email
                                or pass page.
                            </p>
                        </div>

                        <CameraScanner eventId={eventId} />
                    </div>

                    <div className="space-y-5 md:space-y-8">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <Search size={15} />
                                Manual Mode
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-slate-950 md:text-3xl">
                                Manual Check-In
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Search for a guest manually when their QR code cannot be scanned.
                            </p>

                            <div className="mt-5 md:mt-6">
                                <ManualCheckIn eventId={eventId} />
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                            <h3 className="text-lg font-black text-slate-950">
                                Check-In Tips
                            </h3>

                            <div className="mt-4 space-y-3 md:mt-5 md:space-y-4">
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
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="flex items-center justify-between gap-3 md:block">
                <div className="w-fit rounded-2xl bg-[#F7F5FF] p-2.5 text-[#4F46E5] md:p-3">
                    <Icon size={20} />
                </div>
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

function EventInfo({
    icon: Icon,
    label,
}: {
    icon: any;
    label: string;
}) {
    return (
        <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm md:px-4 md:py-3 md:text-sm">
            <Icon size={15} className="shrink-0 text-[#4F46E5]" />
            <span className="truncate">{label}</span>
        </div>
    );
}

function TipItem({ text }: { text: string }) {
    return (
        <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#4F46E5]" />
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
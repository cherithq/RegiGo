import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Globe2,
    LayoutDashboard,
    Mail,
    MapPin,
    MonitorSmartphone,
    Palette,
    QrCode,
    Settings,
    ShieldCheck,
    Sparkles,
    Table2,
    Ticket,
    UserCheck,
    Users,
    Mic2,
    CalendarClock,
    FileText,
    Printer,
    Map,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type UserRole = "admin" | "organizer" | "viewer" | "scanner";

type EventItem = {
    id: string;
    company_id: string | null;
    event_name: string;
    event_slug: string;
    event_date: string | null;
    event_time: string | null;
    venue: string | null;
    description: string | null;
    status: string | null;
    max_guests: number | null;
    registration_open: boolean | null;
    created_at: string | null;
};

type ModuleItem = {
    title: string;
    desc: string;
    href: string;
    icon: LucideIcon;
    roles: UserRole[];
};

type ModuleSectionType = {
    title: string;
    desc: string;
    icon: LucideIcon;
    items: ModuleItem[];
};

export default async function EventOverviewPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    const supabaseServer = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    const { data: profile } = user
        ? await supabaseServer
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", user.id)
            .single()
        : { data: null };

    const role = (profile?.role || "organizer") as UserRole;

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select(
            "id, company_id, event_name, event_slug, event_date, event_time, venue, description, status, max_guests, registration_open, created_at"
        )
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
        return (
            <div className="rounded-[2rem] border border-red-100 bg-red-50 p-8">
                <Link
                    href="/dashboard/events"
                    className="inline-flex items-center gap-2 text-sm font-black text-red-700"
                >
                    <ArrowLeft size={16} />
                    Back to Events
                </Link>

                <h1 className="mt-6 text-3xl font-black text-red-800">
                    Event not found
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-red-700">
                    This event does not exist, or your account does not have permission to
                    access it.
                </p>
            </div>
        );
    }

    const currentEvent = event as EventItem;

    const { count: totalRegistered } = await supabaseServer
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

    const { count: checkedIn } = await supabaseServer
        .from("check_ins")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in");

    const total = totalRegistered || 0;
    const arrived = checkedIn || 0;
    const pending = Math.max(total - arrived, 0);
    const checkInRate = total > 0 ? Math.round((arrived / total) * 100) : 0;

    const visibleSections = getModuleSections(eventId)
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.roles.includes(role)),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <div className="space-y-8">
            <Link
                href="/dashboard/events"
                className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] hover:text-[#EC4899]"
            >
                <ArrowLeft size={16} />
                Back to Events
            </Link>

            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Sparkles size={16} />
                                Event Workspace
                            </div>

                            <StatusBadge status={currentEvent.status || "draft"} />

                            {currentEvent.registration_open ? (
                                <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                                    REGISTRATION OPEN
                                </span>
                            ) : (
                                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                                    REGISTRATION CLOSED
                                </span>
                            )}
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            {currentEvent.event_name}
                        </h1>

                        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                            {currentEvent.description || "No description added yet."}
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <InfoPill icon={CalendarDays} value={formatDate(currentEvent.event_date)} />
                            <InfoPill icon={Clock3} value={currentEvent.event_time || "No time added"} />
                            <InfoPill icon={MapPin} value={currentEvent.venue || "No venue added"} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                        <Link
                            href={`/event/${currentEvent.event_slug}`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                            <Globe2 size={18} />
                            Preview Website
                        </Link>

                        <Link
                            href={`/event/${currentEvent.event_slug}/register`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white shadow-lg transition hover:opacity-90"
                        >
                            <UserCheck size={18} />
                            Registration Page
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Registered"
                    value={total}
                    subtitle="Total submitted registrations"
                    icon={Users}
                />

                <StatCard
                    title="Checked In"
                    value={arrived}
                    subtitle="Guests checked in on event day"
                    icon={CheckCircle2}
                />

                <StatCard
                    title="Pending"
                    value={pending}
                    subtitle="Registered guests not checked in yet"
                    icon={Clock3}
                />

                <ProgressCard
                    title="Check-in Rate"
                    value={checkInRate}
                    subtitle={`${arrived} of ${total} guests checked in`}
                />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">
                            Event Control Centre
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Access the tools available for your role. Admins and organizers
                            can manage event setup, while viewers and scanners only see the
                            areas they are allowed to use.
                        </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-black capitalize text-slate-700">
                        Role: {role}
                    </span>
                </div>
            </section>

            {visibleSections.map((section) => (
                <ModuleSection key={section.title} section={section} />
            ))}
        </div>
    );
}

function getModuleSections(eventId: string): ModuleSectionType[] {
    const allRoles: UserRole[] = ["admin", "organizer", "viewer", "scanner"];
    const managers: UserRole[] = ["admin", "organizer"];
    const scanners: UserRole[] = ["admin", "organizer", "scanner"];
    const reportViewers: UserRole[] = ["admin", "organizer", "viewer"];

    return [
        {
            title: "Registration & Guests",
            desc: "Manage guest registrations, forms, tickets, QR check-in, and reports.",
            icon: FileText,
            items: [
                {
                    title: "Registration Builder",
                    desc: "Customize guest form fields for this event.",
                    icon: FileText,
                    href: `/dashboard/events/${eventId}/registration`,
                    roles: managers,
                },
                {
                    title: "Guest List",
                    desc: "View and manage event registrations.",
                    icon: Users,
                    href: `/dashboard/events/${eventId}/guests`,
                    roles: managers,
                },
                {
                    title: "Ticket Types",
                    desc: "Create VIP, staff, or custom ticket categories.",
                    icon: Ticket,
                    href: `/dashboard/events/${eventId}/tickets`,
                    roles: managers,
                },
                {
                    title: "QR Scanner",
                    desc: "Check in guests on event day.",
                    icon: QrCode,
                    href: `/dashboard/events/${eventId}/scanner`,
                    roles: scanners,
                },
                {
                    title: "Reports",
                    desc: "Export guest and attendance reports.",
                    icon: BarChart3,
                    href: `/dashboard/events/${eventId}/reports`,
                    roles: reportViewers,
                },
                {
                    title: "Analytics",
                    desc: "View event insights and summaries.",
                    icon: LayoutDashboard,
                    href: `/dashboard/events/${eventId}/analytics`,
                    roles: reportViewers,
                },
            ],
        },
        {
            title: "Seating & On-site",
            desc: "Prepare the on-site event experience, including tables, floor plans, and badges.",
            icon: Table2,
            items: [
                {
                    title: "Tables",
                    desc: "Create and manage event tables.",
                    icon: Table2,
                    href: `/dashboard/events/${eventId}/tables`,
                    roles: managers,
                },
                {
                    title: "Floor Plan",
                    desc: "Arrange tables visually for the venue.",
                    icon: Map,
                    href: `/dashboard/events/${eventId}/floor-plan`,
                    roles: managers,
                },
                {
                    title: "Badge Designer",
                    desc: "Design and print guest badges.",
                    icon: Printer,
                    href: `/dashboard/events/${eventId}/badges`,
                    roles: managers,
                },
            ],
        },
        {
            title: "Event Experience",
            desc: "Customize the public event page, branding, speakers, agenda, and emails.",
            icon: Palette,
            items: [
                {
                    title: "Website Builder",
                    desc: "Edit public event page sections.",
                    icon: MonitorSmartphone,
                    href: `/dashboard/events/${eventId}/website`,
                    roles: managers,
                },
                {
                    title: "Branding",
                    desc: "Edit banner, background, logo, and colors.",
                    icon: Palette,
                    href: `/dashboard/events/${eventId}/branding`,
                    roles: managers,
                },
                {
                    title: "Speakers",
                    desc: "Add speakers and session details.",
                    icon: Mic2,
                    href: `/dashboard/events/${eventId}/speakers`,
                    roles: managers,
                },
                {
                    title: "Agenda Builder",
                    desc: "Build the event programme.",
                    icon: CalendarClock,
                    href: `/dashboard/events/${eventId}/agenda`,
                    roles: managers,
                },
                {
                    title: "Email Centre",
                    desc: "Manage event email templates.",
                    icon: Mail,
                    href: `/dashboard/events/${eventId}/emails`,
                    roles: managers,
                },
            ],
        },
        {
            title: "Administration",
            desc: "Control event settings and administrative options.",
            icon: Settings,
            items: [
                {
                    title: "Event Settings",
                    desc: "Publish, close, or update event configuration.",
                    icon: Settings,
                    href: `/dashboard/events/${eventId}/settings`,
                    roles: managers,
                },
                {
                    title: "Access Summary",
                    desc: "Review what each role can access for this event.",
                    icon: ShieldCheck,
                    href: `/dashboard/roles`,
                    roles: allRoles,
                },
            ],
        },
    ];
}

function InfoPill({
    icon: Icon,
    value,
}: {
    icon: LucideIcon;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            <Icon size={17} className="text-[#4F46E5]" />
            <span className="line-clamp-1">{value}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cleanStatus = status || "draft";

    const styles =
        cleanStatus === "published"
            ? "bg-emerald-50 text-emerald-700"
            : cleanStatus === "closed"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`rounded-full px-4 py-2 text-xs font-black uppercase ${styles}`}
        >
            {cleanStatus}
        </span>
    );
}

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
}: {
    title: string;
    value: number;
    subtitle: string;
    icon: LucideIcon;
}) {
    return (
        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between">
                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] transition group-hover:bg-[#4F46E5] group-hover:text-white">
                    <Icon size={24} />
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    Live
                </span>
            </div>

            <p className="mt-6 text-sm font-bold text-slate-500">{title}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
    );
}

function ProgressCard({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: number;
    subtitle: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] w-fit">
                <BadgeCheck size={24} />
            </div>

            <p className="mt-6 text-sm font-bold text-slate-500">{title}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {value}%
            </p>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                    style={{ width: `${value}%` }}
                />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
    );
}

function ModuleSection({ section }: { section: ModuleSectionType }) {
    const Icon = section.icon;

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex items-start gap-4">
                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                    <Icon size={24} />
                </div>

                <div>
                    <h2 className="text-2xl font-black text-slate-950">
                        {section.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        {section.desc}
                    </p>
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                    <ActionCard key={item.href} item={item} />
                ))}
            </div>
        </section>
    );
}

function ActionCard({ item }: { item: ModuleItem }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-indigo-100 hover:bg-[#F7F5FF] hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm transition group-hover:bg-[#4F46E5] group-hover:text-white">
                    <Icon size={23} />
                </div>

                <span className="inline-flex items-center gap-1 text-sm font-black text-[#4F46E5] opacity-0 transition group-hover:opacity-100">
                    Open
                    <ArrowRight size={15} />
                </span>
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p>
        </Link>
    );
}

function formatDate(date: string | null) {
    if (!date) {
        return "No date added";
    }

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
}
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    Globe2,
    LayoutDashboard,
    PlusCircle,
    Settings,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSupabaseServerClient } from "../../lib/supabase-server";

type UserRole = "admin" | "organizer" | "viewer" | "scanner";

type EventItem = {
    id: string;
    event_name: string;
    event_date: string | null;
    event_time: string | null;
    venue: string | null;
    status: string | null;
    created_at: string | null;
};

export default async function DashboardPage() {
    const supabaseServer = await createSupabaseServerClient();

    const today = new Date().toISOString().slice(0, 10);

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
    const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";

    const { count: totalEvents } = await supabaseServer
        .from("events")
        .select("*", { count: "exact", head: true });

    const { count: publishedEvents } = await supabaseServer
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

    const { count: draftEvents } = await supabaseServer
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft");

    const { count: upcomingEvents } = await supabaseServer
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", today);

    const { data: recentEvents } = await supabaseServer
        .from("events")
        .select("id, event_name, event_date, event_time, venue, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    const { data: upcomingList } = await supabaseServer
        .from("events")
        .select("id, event_name, event_date, event_time, venue, status, created_at")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(5);

    const completionRate =
        totalEvents && totalEvents > 0
            ? Math.round(((publishedEvents || 0) / totalEvents) * 100)
            : 0;

    const quickActions = getQuickActions(role);

    return (
        <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Sparkles size={16} />
                            RegiGo Workspace
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Welcome back, {displayName}
                        </h1>

                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            Monitor event performance, manage registrations, and prepare your
                            event workspace from one central dashboard.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold capitalize text-slate-700">
                                Role: {role}
                            </span>

                            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                                {upcomingEvents || 0} upcoming
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/dashboard/events"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                            View Events
                            <ArrowRight size={18} />
                        </Link>

                        {role === "admin" && (
                            <Link
                                href="/dashboard/events/new"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                            >
                                <PlusCircle size={19} />
                                Create Event
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Events"
                    value={totalEvents || 0}
                    subtitle="Events available to your account"
                    icon={CalendarDays}
                />

                <StatCard
                    title="Published"
                    value={publishedEvents || 0}
                    subtitle="Live and accessible events"
                    icon={Globe2}
                />

                <StatCard
                    title="Drafts"
                    value={draftEvents || 0}
                    subtitle="Events still being prepared"
                    icon={FileText}
                />

                <StatCard
                    title="Upcoming"
                    value={upcomingEvents || 0}
                    subtitle="Scheduled from today onwards"
                    icon={Clock3}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <SectionHeader
                        title="Recent Events"
                        text="Continue working on your latest event workspaces."
                        href="/dashboard/events"
                        linkText="View all"
                    />

                    <div className="mt-6 space-y-3">
                        {recentEvents && recentEvents.length > 0 ? (
                            recentEvents.map((event) => (
                                <EventRow key={event.id} event={event as EventItem} />
                            ))
                        ) : (
                            <EmptyState
                                icon={CalendarDays}
                                title="No events yet"
                                text={
                                    role === "admin"
                                        ? "Create your first event to start using RegiGo."
                                        : "No event has been assigned to this account yet."
                                }
                                href={role === "admin" ? "/dashboard/events/new" : undefined}
                                action={role === "admin" ? "Create Event" : undefined}
                            />
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">
                                    Publishing Progress
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Percentage of events currently marked as published.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                                <BarChart3 size={22} />
                            </div>
                        </div>

                        <div className="mt-7">
                            <p className="text-5xl font-black text-slate-950">
                                {completionRate}%
                            </p>

                            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                    style={{ width: `${completionRate}%` }}
                                />
                            </div>

                            <p className="mt-4 text-sm text-slate-500">
                                {publishedEvents || 0} out of {totalEvents || 0} events are
                                published.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                        <h2 className="text-xl font-black text-slate-950">
                            Upcoming Events
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Events scheduled from today onwards.
                        </p>

                        <div className="mt-5 space-y-3">
                            {upcomingList && upcomingList.length > 0 ? (
                                upcomingList.map((event) => (
                                    <EventMini key={event.id} event={event as EventItem} />
                                ))
                            ) : (
                                <EmptyState
                                    icon={Clock3}
                                    title="No upcoming events"
                                    text="Future events will appear here once created."
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <SectionHeader
                    title="Quick Actions"
                    text="Jump into the areas you use most often."
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {quickActions.map((action) => (
                        <ChecklistCard
                            key={action.href}
                            href={action.href}
                            icon={action.icon}
                            title={action.title}
                            text={action.text}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

function getQuickActions(role: UserRole) {
    if (role === "admin") {
        return [
            {
                href: "/dashboard/events",
                icon: CalendarDays,
                title: "Manage Events",
                text: "View all events and open event workspaces.",
            },
            {
                href: "/dashboard/events/new",
                icon: PlusCircle,
                title: "Create Event",
                text: "Create a new event and configure event details.",
            },
            {
                href: "/dashboard/users",
                icon: Users,
                title: "Users & Permissions",
                text: "Create accounts and assign users to events.",
            },
            {
                href: "/dashboard/roles",
                icon: ShieldCheck,
                title: "Roles",
                text: "Review role permissions and access levels.",
            },
        ];
    }

    if (role === "organizer") {
        return [
            {
                href: "/dashboard/events",
                icon: CalendarDays,
                title: "My Events",
                text: "Open the events assigned to your account.",
            },
            {
                href: "/dashboard/company",
                icon: Settings,
                title: "Company Profile",
                text: "Manage company information and event branding.",
            },
            {
                href: "/dashboard/team",
                icon: Users,
                title: "Team Members",
                text: "Manage event managers and check-in staff.",
            },
            {
                href: "/dashboard/profile",
                icon: CheckCircle2,
                title: "My Profile",
                text: "Review your account information.",
            },
        ];
    }

    if (role === "scanner") {
        return [
            {
                href: "/dashboard/events",
                icon: CalendarDays,
                title: "My Events",
                text: "Open your assigned event.",
            },
            {
                href: "/dashboard/events",
                icon: CheckCircle2,
                title: "Check-in Access",
                text: "Select an event to start scanning guests.",
            },
            {
                href: "/dashboard/profile",
                icon: Settings,
                title: "My Profile",
                text: "Review your account details.",
            },
        ];
    }

    return [
        {
            href: "/dashboard/events",
            icon: CalendarDays,
            title: "My Events",
            text: "View events assigned to your account.",
        },
        {
            href: "/dashboard/profile",
            icon: Settings,
            title: "My Profile",
            text: "Review your account details.",
        },
    ];
}

function SectionHeader({
    title,
    text,
    href,
    linkText,
}: {
    title: string;
    text: string;
    href?: string;
    linkText?: string;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h2 className="text-2xl font-black text-slate-950">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
            </div>

            {href && linkText && (
                <Link
                    href={href}
                    className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] hover:text-[#EC4899]"
                >
                    {linkText}
                    <ArrowRight size={16} />
                </Link>
            )}
        </div>
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
            <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] transition group-hover:bg-[#4F46E5] group-hover:text-white">
                    <Icon size={24} />
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Active
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

function EventRow({ event }: { event: EventItem }) {
    return (
        <Link
            href={`/dashboard/events/${event.id}`}
            className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:border-indigo-100 hover:bg-[#F7F5FF]"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                        <CalendarDays size={22} />
                    </div>

                    <div>
                        <p className="text-lg font-black text-slate-950">
                            {event.event_name}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            {formatDate(event.event_date)} · {event.event_time || "No time"} ·{" "}
                            {event.venue || "No venue"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <StatusBadge status={event.status || "draft"} />

                    <div className="rounded-full bg-white p-2 text-slate-400">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>
        </Link>
    );
}

function EventMini({ event }: { event: EventItem }) {
    return (
        <Link
            href={`/dashboard/events/${event.id}`}
            className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-indigo-100 hover:bg-[#F7F5FF]"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-black text-slate-950">{event.event_name}</p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        {formatDate(event.event_date)} · {event.event_time || "No time"}
                    </p>
                </div>

                <StatusBadge status={event.status || "draft"} compact />
            </div>
        </Link>
    );
}

function ChecklistCard({
    href,
    icon: Icon,
    title,
    text,
}: {
    href: string;
    icon: LucideIcon;
    title: string;
    text: string;
}) {
    return (
        <Link
            href={href}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-indigo-100 hover:bg-[#F7F5FF] hover:shadow-md"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm transition group-hover:bg-[#4F46E5] group-hover:text-white">
                <Icon size={23} />
            </div>

            <p className="mt-5 font-black text-slate-950">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>

            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#4F46E5]">
                Open
                <ArrowRight size={15} />
            </div>
        </Link>
    );
}

function EmptyState({
    icon: Icon,
    title,
    text,
    href,
    action,
}: {
    icon: LucideIcon;
    title: string;
    text: string;
    href?: string;
    action?: string;
}) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm">
                <Icon size={26} />
            </div>

            <p className="mt-4 font-black text-slate-950">{title}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {text}
            </p>

            {href && action && (
                <Link
                    href={href}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg"
                >
                    {action}
                    <ArrowRight size={16} />
                </Link>
            )}
        </div>
    );
}

function StatusBadge({
    status,
    compact = false,
}: {
    status: string;
    compact?: boolean;
}) {
    const cleanStatus = status || "draft";

    const styles =
        cleanStatus === "published"
            ? "bg-emerald-50 text-emerald-700"
            : cleanStatus === "draft"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-700";

    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles} ${compact ? "hidden sm:inline-flex" : "inline-flex"
                }`}
        >
            {cleanStatus}
        </span>
    );
}

function formatDate(date: string | null) {
    if (!date) {
        return "No date";
    }

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}
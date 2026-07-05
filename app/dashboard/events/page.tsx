import Link from "next/link";
import {
    ArrowRight,
    CalendarDays,
    Clock3,
    Globe2,
    LayoutGrid,
    MapPin,
    PlusCircle,
    Search,
    Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

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

export default async function EventsPage() {
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
    const canCreateEvent = role === "admin";

    const { data: events, error } = await supabaseServer
        .from("events")
        .select(
            "id, company_id, event_name, event_slug, event_date, event_time, venue, description, status, max_guests, registration_open, created_at"
        )
        .order("created_at", { ascending: false });

    const eventList = (events || []) as EventItem[];

    const publishedCount = eventList.filter(
        (event) => event.status === "published"
    ).length;

    const draftCount = eventList.filter(
        (event) => !event.status || event.status === "draft"
    ).length;

    const openRegistrationCount = eventList.filter(
        (event) => event.registration_open
    ).length;

    return (
        <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Sparkles size={16} />
                            Event Workspace
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            My Events
                        </h1>

                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            View, manage, and monitor the events available to your account.
                            Admin users can see every event, while other users only see events
                            assigned to them.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold capitalize text-slate-700">
                                Role: {role}
                            </span>

                            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                                {eventList.length} event{eventList.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                            Dashboard
                            <ArrowRight size={18} />
                        </Link>

                        {canCreateEvent && (
                            <Link
                                href="/dashboard/events/new"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                            >
                                <PlusCircle size={19} />
                                New Event
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Total Events"
                    value={eventList.length}
                    text="Events visible to your account"
                    icon={LayoutGrid}
                />

                <SummaryCard
                    title="Published"
                    value={publishedCount}
                    text="Live public event pages"
                    icon={Globe2}
                />

                <SummaryCard
                    title="Drafts"
                    value={draftCount}
                    text="Events still being prepared"
                    icon={CalendarDays}
                />

                <SummaryCard
                    title="Registration Open"
                    value={openRegistrationCount}
                    text="Events accepting registrations"
                    icon={Search}
                />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">
                            Event List
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Open an event to manage guests, QR check-in, tables, speakers,
                            emails, and settings.
                        </p>
                    </div>

                    {canCreateEvent && eventList.length > 0 && (
                        <Link
                            href="/dashboard/events/new"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                        >
                            <PlusCircle size={17} />
                            Create Event
                        </Link>
                    )}
                </div>

                {error && (
                    <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
                        Failed to load events: {error.message}
                    </div>
                )}

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {eventList.length > 0 ? (
                        eventList.map((event) => (
                            <EventCard key={event.id} event={event} role={role} />
                        ))
                    ) : (
                        <div className="col-span-full">
                            <EmptyState canCreateEvent={canCreateEvent} />
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    text,
    icon: Icon,
}: {
    title: string;
    value: number;
    text: string;
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
            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}

function EventCard({
    event,
    role,
}: {
    event: EventItem;
    role: UserRole;
}) {
    const status = event.status || "draft";

    return (
        <div className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="h-2 bg-gradient-to-r from-[#4F46E5] to-[#EC4899]" />

            <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <StatusBadge status={status} />

                    {event.registration_open ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            OPEN
                        </span>
                    ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                            CLOSED
                        </span>
                    )}
                </div>

                <h2 className="mt-5 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
                    {event.event_name}
                </h2>

                <p className="mt-3 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-500">
                    {event.description || "No description added for this event yet."}
                </p>

                <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                    <InfoRow
                        icon={CalendarDays}
                        label={formatDate(event.event_date)}
                    />

                    <InfoRow
                        icon={Clock3}
                        label={event.event_time || "No time added"}
                    />

                    <InfoRow
                        icon={MapPin}
                        label={event.venue || "No venue added"}
                    />
                </div>

                <div className="mt-6 grid gap-3">
                    <Link
                        href={`/dashboard/events/${event.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-center font-black text-white transition hover:bg-slate-800"
                    >
                        {role === "viewer" ? "View Event" : "Manage Event"}
                        <ArrowRight size={17} />
                    </Link>

                    <Link
                        href={`/event/${event.event_slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-center font-black text-slate-700 transition hover:bg-[#F7F5FF] hover:text-[#4F46E5]"
                    >
                        View Public Page
                        <Globe2 size={17} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function InfoRow({
    icon: Icon,
    label,
}: {
    icon: LucideIcon;
    label: string;
}) {
    return (
        <div className="flex items-center gap-3 text-sm text-slate-600">
            <Icon size={17} className="text-[#4F46E5]" />
            <span className="line-clamp-1 font-semibold">{label}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles =
        status === "published"
            ? "bg-emerald-50 text-emerald-700"
            : status === "draft"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-700";

    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles}`}
        >
            {status}
        </span>
    );
}

function EmptyState({ canCreateEvent }: { canCreateEvent: boolean }) {
    return (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#4F46E5] shadow-sm">
                <CalendarDays size={30} />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
                No events found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {canCreateEvent
                    ? "Create your first event and start building your registration experience."
                    : "No event has been assigned to your account yet. Please contact your admin if you need access."}
            </p>

            {canCreateEvent && (
                <Link
                    href="/dashboard/events/new"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90"
                >
                    <PlusCircle size={18} />
                    Create Event
                </Link>
            )}
        </div>
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
    }).format(new Date(date));
}
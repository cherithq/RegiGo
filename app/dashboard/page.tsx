import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";

export default async function DashboardPage() {
    const supabaseServer = await createSupabaseServerClient();

    const today = new Date().toISOString().slice(0, 10);

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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

    const { data: upcomingList } = await supabaseServer
        .from("events")
        .select("*")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(4);

    return (
        <div>
            <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#EC4899] shadow-sm">
                        Organizer Dashboard
                    </p>

                    <h1 className="mt-5 text-5xl font-black tracking-tight">
                        Welcome back 👋
                    </h1>

                    <p className="mt-3 max-w-2xl text-lg text-slate-600">
                        Create events, manage branding, build registration forms, and prepare
                        for event-day check-in.
                    </p>
                </div>

                <Link
                    href="/dashboard/events/new"
                    className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-7 py-4 text-center font-black text-white shadow-lg"
                >
                    + Create
                </Link>
            </section>

            <section className="mt-10 grid gap-6 md:grid-cols-4">
                <StatCard title="Total Events" value={totalEvents || 0} icon="🎉" />
                <StatCard title="Published" value={publishedEvents || 0} icon="🌐" />
                <StatCard title="Drafts" value={draftEvents || 0} icon="📝" />
                <StatCard title="Upcoming" value={upcomingEvents || 0} icon="📅" />
            </section>

            <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[2rem] bg-white p-8 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black">Recent Events</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Continue working on your latest events.
                            </p>
                        </div>

                        <Link href="/dashboard/events" className="font-black text-[#4F46E5]">
                            View All →
                        </Link>
                    </div>

                    <div className="mt-6 space-y-4">
                        {recentEvents && recentEvents.length > 0 ? (
                            recentEvents.map((event) => (
                                <EventRow key={event.id} event={event} />
                            ))
                        ) : (
                            <EmptyState
                                icon="🎉"
                                title="No events yet"
                                text="Create your first event to start using RegiGo."
                            />
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] bg-white p-8 shadow-xl">
                    <h2 className="text-2xl font-black">Upcoming Events</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Events coming up soon.
                    </p>

                    <div className="mt-6 space-y-4">
                        {upcomingList && upcomingList.length > 0 ? (
                            upcomingList.map((event) => (
                                <EventMini key={event.id} event={event} />
                            ))
                        ) : (
                            <EmptyState
                                icon="📅"
                                title="No upcoming events"
                                text="Published future events will appear here."
                            />
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-xl">
                <h2 className="text-2xl font-black">Setup Checklist</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Useful steps to prepare your event properly.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <ChecklistCard
                        href="/dashboard/company"
                        icon="🏢"
                        title="Company Profile"
                        text="Set company details and email signature."
                    />

                    <ChecklistCard
                        href="/dashboard/events/new"
                        icon="🎨"
                        title="Create Event"
                        text="Add event details, banner, and background."
                    />

                    <ChecklistCard
                        href="/dashboard/events"
                        icon="📝"
                        title="Build Forms"
                        text="Customize registration fields per event."
                    />

                    <ChecklistCard
                        href="/dashboard/team"
                        icon="👥"
                        title="Add Team"
                        text="Add check-in staff and event managers."
                    />

                    <ChecklistCard
                        href="/dashboard/roles"
                        icon="🛡️"
                        title="Roles"
                        text="Manage staff permissions."
                    />

                </div>
            </section>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: string;
}) {
    return (
        <div className="rounded-[2rem] bg-white p-7 shadow-xl">
            <div className="text-4xl">{icon}</div>
            <p className="mt-5 font-bold text-slate-500">{title}</p>
            <p className="mt-3 text-5xl font-black">{value}</p>
        </div>
    );
}

function EventRow({ event }: { event: any }) {
    return (
        <Link
            href={`/dashboard/events/${event.id}`}
            className="block rounded-2xl bg-[#F7F5FF] p-5 transition hover:bg-indigo-50"
        >
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-lg font-black">{event.event_name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                        {event.event_date || "-"} · {event.event_time || "-"} ·{" "}
                        {event.venue || "-"}
                    </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#4F46E5]">
                    {(event.status || "draft").toUpperCase()}
                </span>
            </div>
        </Link>
    );
}

function EventMini({ event }: { event: any }) {
    return (
        <Link
            href={`/dashboard/events/${event.id}`}
            className="block rounded-2xl bg-[#F7F5FF] p-5"
        >
            <p className="font-black">{event.event_name}</p>
            <p className="mt-1 text-sm text-slate-500">
                📅 {event.event_date || "-"} · 🕒 {event.event_time || "-"}
            </p>
        </Link>
    );
}

function ChecklistCard({
    href,
    icon,
    title,
    text,
}: {
    href: string;
    icon: string;
    title: string;
    text: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-2xl bg-[#F7F5FF] p-6 transition hover:bg-indigo-50"
        >
            <div className="text-4xl">{icon}</div>
            <p className="mt-4 font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
        </Link>
    );
}

function EmptyState({
    icon,
    title,
    text,
}: {
    icon: string;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-2xl bg-[#F7F5FF] p-8 text-center">
            <div className="text-4xl">{icon}</div>
            <p className="mt-3 font-black">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
    );
}
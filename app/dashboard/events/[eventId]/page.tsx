import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

export default async function EventOverviewPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <div>Event not found.</div>;

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
    const pending = total - arrived;

    return (
        <div className="mx-auto max-w-7xl">
            <Link href="/dashboard/events" className="font-bold text-[#4F46E5]">
                ← Back to Events
            </Link>

            <section className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-4xl font-black">{event.event_name}</h1>
                            <StatusBadge status={event.status || "draft"} />
                            <span className="rounded-full bg-indigo-50 px-4 py-1 text-xs font-black text-[#4F46E5]">
                                {event.registration_open ? "REGISTRATION OPEN" : "REGISTRATION CLOSED"}
                            </span>
                        </div>

                        <p className="mt-3 max-w-3xl text-slate-600">
                            {event.description || "No description added yet."}
                        </p>

                        <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
                            <Info value={`📅 ${event.event_date || "-"}`} />
                            <Info value={`🕒 ${event.event_time || "-"}`} />
                            <Info value={`📍 ${event.venue || "-"}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={`/event/${event.event_slug}`}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-black hover:bg-slate-50"
                        >
                            Preview Website
                        </Link>

                        <Link
                            href={`/event/${event.event_slug}/register`}
                            className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-center font-black text-white"
                        >
                            Registration Page
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-3">
                <Stat title="Registered" value={total} icon="👥" />
                <Stat title="Checked In" value={arrived} icon="✅" />
                <Stat title="Pending" value={pending} icon="⏳" />
            </section>

            <ModuleSection
                title="Registration & Guests"
                icon="📋"
                items={[
                    ["Registration Builder", "Customize guest form fields.", "📝", `/dashboard/events/${eventId}/registration`],
                    ["Guest List", "View and manage registrations.", "👥", `/dashboard/events/${eventId}/guests`],
                    ["Ticket Types", "Create VIP, staff or custom categories.", "🎟️", `/dashboard/events/${eventId}/tickets`],
                    ["QR Scanner", "Check in guests on event day.", "📷", `/dashboard/events/${eventId}/scanner`],
                    ["Reports", "Export guest and attendance reports.", "📊", `/dashboard/events/${eventId}/reports`],
                    ["Analytics", "View event insights and summaries.", "📈", `/dashboard/events/${eventId}/analytics`],
                ]}
            />

            <ModuleSection
                title="Seating & On-site"
                icon="🪑"
                items={[
                    ["Tables", "Create and manage event tables.", "🪑", `/dashboard/events/${eventId}/tables`],
                    ["Floor Plan", "Arrange tables visually.", "🗺️", `/dashboard/events/${eventId}/floor-plan`],
                    ["Badge Designer", "Design and print guest badges.", "🖨️", `/dashboard/events/${eventId}/badges`],
                ]}
            />

            <ModuleSection
                title="Event Experience"
                icon="🎨"
                items={[
                    ["Website Builder", "Edit public event page sections.", "🌐", `/dashboard/events/${eventId}/website`],
                    ["Branding", "Edit banner, background and colours.", "🎨", `/dashboard/events/${eventId}/branding`],
                    ["Speakers", "Add speakers and session details.", "🎤", `/dashboard/events/${eventId}/speakers`],
                    ["Agenda Builder", "Build the event programme.", "🗓️", `/dashboard/events/${eventId}/agenda`],
                    ["Email Centre", "Manage event email templates.", "📧", `/dashboard/events/${eventId}/emails`],
                ]}
            />

            <ModuleSection
                title="Administration"
                icon="⚙️"
                items={[
                    ["Settings", "Publish, close or delete event.", "⚙️", `/dashboard/events/${eventId}/settings`],
                ]}
            />
        </div>
    );
}

function Info({ value }: { value: string }) {
    return <div className="rounded-2xl bg-[#F7F5FF] px-4 py-3">{value}</div>;
}

function StatusBadge({ status }: { status: string }) {
    const color =
        status === "published"
            ? "bg-green-100 text-green-700"
            : status === "closed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700";

    return (
        <span className={`rounded-full px-4 py-1 text-xs font-black ${color}`}>
            {status.toUpperCase()}
        </span>
    );
}

function Stat({
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

function ModuleSection({
    title,
    icon,
    items,
}: {
    title: string;
    icon: string;
    items: string[][];
}) {
    return (
        <section className="mt-10">
            <div className="mb-5 flex items-center gap-3">
                <div className="text-3xl">{icon}</div>
                <h2 className="text-2xl font-black">{title}</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map(([title, desc, icon, href]) => (
                    <ActionCard
                        key={href}
                        title={title}
                        desc={desc}
                        icon={icon}
                        href={href}
                    />
                ))}
            </div>
        </section>
    );
}

function ActionCard({
    href,
    icon,
    title,
    desc,
}: {
    href: string;
    icon: string;
    title: string;
    desc: string;
}) {
    return (
        <Link
            href={href}
            className="group rounded-[2rem] bg-white p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5FF] text-3xl">
                    {icon}
                </div>

                <span className="text-sm font-black text-[#4F46E5] opacity-0 transition group-hover:opacity-100">
                    Open →
                </span>
            </div>

            <h3 className="mt-5 text-xl font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
        </Link>
    );
}
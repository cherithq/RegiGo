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

    if (!event) return <main className="p-8">Event not found.</main>;

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

    const statusColor =
        event.status === "published"
            ? "bg-green-100 text-green-700"
            : event.status === "closed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link href="/dashboard/events" className="font-bold text-[#4F46E5]">
                    ← Back to Events
                </Link>

                <section className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-4xl font-black">{event.event_name}</h1>

                                <span className={`rounded-full px-4 py-1 text-xs font-black ${statusColor}`}>
                                    {(event.status || "draft").toUpperCase()}
                                </span>

                                <span className="rounded-full bg-indigo-50 px-4 py-1 text-xs font-black text-[#4F46E5]">
                                    {event.registration_open ? "REGISTRATION OPEN" : "REGISTRATION CLOSED"}
                                </span>
                            </div>

                            <p className="mt-3 max-w-2xl text-slate-600">
                                {event.description || "No description added yet."}
                            </p>

                            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                                <p>📅 {event.event_date || "-"}</p>
                                <p>🕒 {event.event_time || "-"}</p>
                                <p>📍 {event.venue || "-"}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={`/event/${event.event_slug}`}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-black"
                            >
                                Preview Website
                            </Link>

                            <Link
                                href={`/event/${event.event_slug}/register`}
                                className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-center font-black text-white"
                            >
                                Registration Link
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-6 md:grid-cols-3">
                    <Stat title="Total Registered" value={total} icon="👥" />
                    <Stat title="Checked In" value={arrived} icon="✅" />
                    <Stat title="Not Checked In" value={pending} icon="⏳" />
                </section>

                <SectionTitle title="Guest Management" icon="📋" />

                <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <ActionCard
                        href={`/dashboard/events/${eventId}/registration`}
                        icon="📝"
                        title="Registration Builder"
                        desc="Customize fields, labels and options."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/guests`}
                        icon="👥"
                        title="Guest List"
                        desc="View all registrations."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/scanner`}
                        icon="📷"
                        title="QR Scanner"
                        desc="Check in guests on event day."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/reports`}
                        icon="📊"
                        title="Reports"
                        desc="Attendance, export and insights."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/tables`}
                        icon="🪑"
                        title="Tables"
                        desc="Create and manage event tables."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/emails`}
                        icon="📧"
                        title="Email Centre"
                        desc="Create and manage event email templates."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/badges`}
                        icon="🖨️"
                        title="Badge Designer"
                        desc="Design and print guest badges."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/website`}
                        icon="🌐"
                        title="Website Builder"
                        desc="Edit event page sections."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/analytics`}
                        icon="📊"
                        title="Analytics"
                        desc="View event insights and attendance trends."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/tickets`}
                        icon="🎟️"
                        title="Ticket Types"
                        desc="Create VIP, Standard, Staff or custom guest categories."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/speakers`}
                        icon="🎤"
                        title="Speakers"
                        desc="Add speakers and session details."
                    />

                    <ActionCard
                        href={`/dashboard/events/${eventId}/agenda`}
                        icon="🗓️"
                        title="Agenda Builder"
                        desc="Build the event programme and schedule."
                    />
                </section>

                <SectionTitle title="Event Experience" icon="🎨" />

                <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <ActionCard
                        href={`/dashboard/events/${eventId}/branding`}
                        icon="🎨"
                        title="Branding"
                        desc="Banner, background and colours."
                    />
                    <ActionCard
                        href={`/event/${event.event_slug}`}
                        icon="🌐"
                        title="Public Website"
                        desc="Preview guest-facing event page."
                    />
                    <ActionCard
                        href={`/dashboard/events/${eventId}/emails`}
                        icon="📧"
                        title="Emails"
                        desc="Edit confirmation and QR emails."
                    />
                    <ActionCard
                        href={`/event/${event.event_slug}/register`}
                        icon="🎟️"
                        title="Registration Page"
                        desc="Preview the guest form."
                    />
                </section>

                <SectionTitle title="Administration" icon="⚙️" />

                <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <ActionCard
                        href={`/dashboard/events/${eventId}/settings`}
                        icon="⚙️"
                        title="Settings"
                        desc="Publish, close or delete event."
                    />
                </section>
            </div>
        </main>
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
        <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <div className="text-3xl">{icon}</div>
            <p className="mt-4 font-bold text-slate-500">{title}</p>
            <p className="mt-3 text-5xl font-black">{value}</p>
        </div>
    );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
    return (
        <div className="mt-10 mb-5 flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <h2 className="text-2xl font-black">{title}</h2>
        </div>
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
            className="rounded-[2rem] bg-white p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
        >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5FF] text-3xl">
                {icon}
            </div>

            <h3 className="mt-5 text-xl font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>

            <p className="mt-5 text-sm font-black text-[#4F46E5]">Open →</p>
        </Link>
    );
}
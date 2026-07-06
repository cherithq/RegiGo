import Link from "next/link";
import { redirect } from "next/navigation";
import {
    ArrowLeft,
    BadgeCheck,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Globe2,
    LayoutDashboard,
    Mail,
    Map,
    MapPin,
    Palette,
    QrCode,
    Settings,
    ShieldCheck,
    Sparkles,
    Ticket,
    Users,
    UserRoundCheck,
    Utensils,
    Mic2,
    ListTodo,
    Gift,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Role = "admin" | "organizer" | "viewer" | "scanner" | string;

export default async function EventOverviewPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabaseServer
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", user.id)
        .single();

    const role: Role = profile?.role || "viewer";

    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer";
    const isViewer = role === "viewer";
    const isScanner = role === "scanner";

    const canManageEvent = isAdmin || isOrganizer;
    const canScan = isAdmin || isOrganizer || isScanner;
    const canViewReports = isAdmin || isOrganizer || isViewer;

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

    const { count: ticketTypes } = await supabaseServer
        .from("ticket_types")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

    const { count: assignedTables } = await supabaseServer
        .from("table_assignments")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

    const total = totalGuests || 0;
    const checkedIn = checkedInGuests || 0;
    const pending = Math.max(total - checkedIn, 0);
    const checkedInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href="/dashboard/events"
                    className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to My Events
                </Link>

                <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <LayoutDashboard size={16} />
                                Event Workspace
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                {event.event_name}
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                                Manage registrations, guests, check-in operations and event-day
                                reporting from one control centre.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <EventInfo
                                    icon={BadgeCheck}
                                    label={formatStatus(event.status)}
                                />

                                {event.event_date && (
                                    <EventInfo
                                        icon={CalendarDays}
                                        label={formatDate(event.event_date)}
                                    />
                                )}

                                {event.event_time && (
                                    <EventInfo icon={ClockIcon} label={event.event_time} />
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
                                        Your Access
                                    </p>
                                    <p className="text-3xl font-black capitalize text-slate-950">
                                        {role}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl bg-white p-4">
                                <p className="text-sm font-black text-slate-950">
                                    Check-in Progress
                                </p>

                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                        style={{ width: `${checkedInRate}%` }}
                                    />
                                </div>

                                <p className="mt-3 text-sm font-semibold text-slate-500">
                                    {checkedIn} of {total} guests checked in.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
                        text="Awaiting check-in"
                        icon={QrCode}
                    />

                    <StatCard
                        title="Table Assigned"
                        value={assignedTables || 0}
                        text={`${ticketTypes || 0} ticket type${(ticketTypes || 0) === 1 ? "" : "s"
                            } created`}
                        icon={Utensils}
                    />
                </section>

                {canManageEvent && (
                    <WorkspaceSection
                        eyebrow="Operations"
                        title="Event Management"
                        description="Tools for managing guests, tickets, seating and event content."
                    >
                        <ModuleCard
                            title="Guest List"
                            description="View, search and manage registered guests."
                            href={`/dashboard/events/${eventId}/guests`}
                            icon={Users}
                        />

                        <ModuleCard
                            title="Ticket Types"
                            description="Set up ticket categories, limits and pricing rules."
                            href={`/dashboard/events/${eventId}/tickets`}
                            icon={Ticket}
                        />

                        <ModuleCard
                            title="Tables"
                            description="Create event tables and assign guests to seats."
                            href={`/dashboard/events/${eventId}/tables`}
                            icon={Utensils}
                        />

                        <ModuleCard
                            title="Floor Plan"
                            description="Arrange table layout and seating flow visually."
                            href={`/dashboard/events/${eventId}/floor-plan`}
                            icon={Map}
                        />

                        <ModuleCard
                            title="Speakers"
                            description="Manage event speakers and speaker details."
                            href={`/dashboard/events/${eventId}/speakers`}
                            icon={Mic2}
                        />

                        <ModuleCard
                            title="Agenda"
                            description="Build the event programme and timeline."
                            href={`/dashboard/events/${eventId}/agenda`}
                            icon={ListTodo}
                        />
                    </WorkspaceSection>
                )}

                {canScan && (
                    <WorkspaceSection
                        eyebrow="Event Day"
                        title="Check-In Tools"
                        description="Scan QR passes and process guest arrivals during the event."
                    >
                        <ModuleCard
                            title="QR Scanner"
                            description="Scan guest QR codes and record check-ins."
                            href={`/dashboard/events/${eventId}/scanner`}
                            icon={QrCode}
                            highlight
                        />

                        <ModuleCard
                            title="Manual Check-In"
                            description="Search guests manually if QR scanning is unavailable."
                            href={`/dashboard/events/${eventId}/scanner`}
                            icon={UserRoundCheck}
                        />

                        <ModuleCard
                            title="Lucky Draw"
                            description="Spin a Wheel of Fortune using checked-in guests only."
                            href={`/dashboard/events/${eventId}/lucky-draw`}
                            icon={Gift}
                        />
                    </WorkspaceSection>
                )}

                {canViewReports && (
                    <WorkspaceSection
                        eyebrow="Insights"
                        title="Reports & Analytics"
                        description="Monitor registration performance, attendance and guest data."
                    >
                        <ModuleCard
                            title="Analytics"
                            description="View attendance, registration and table assignment insights."
                            href={`/dashboard/events/${eventId}/analytics`}
                            icon={BarChart3}
                        />
                    </WorkspaceSection>
                )}

                {isAdmin && (
                    <WorkspaceSection
                        eyebrow="Admin Only"
                        title="Administration"
                        description="Only admin accounts can access registration setup, event settings, website tools, branding and email templates."
                    >
                        <ModuleCard
                            title="Registration Builder"
                            description="Create and manage the event registration form fields."
                            href={`/dashboard/events/${eventId}/registration`}
                            icon={ClipboardList}
                        />

                        <ModuleCard
                            title="Website Builder"
                            description="Customise the public event registration website."
                            href={`/dashboard/events/${eventId}/website`}
                            icon={Globe2}
                        />

                        <ModuleCard
                            title="Branding"
                            description="Manage event colours, logo and visual identity."
                            href={`/dashboard/events/${eventId}/branding`}
                            icon={Palette}
                        />

                        <ModuleCard
                            title="Email Centre"
                            description="Create and manage event email templates."
                            href={`/dashboard/events/${eventId}/emails`}
                            icon={Mail}
                        />

                        <ModuleCard
                            title="Event Settings"
                            description="Control event visibility, registration rules and system settings."
                            href={`/dashboard/events/${eventId}/settings`}
                            icon={Settings}
                        />
                    </WorkspaceSection>
                )}

                {!canManageEvent && !canScan && !canViewReports && (
                    <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F7F5FF] text-[#4F46E5]">
                            <ShieldCheck size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-black text-slate-950">
                            Limited Access
                        </h2>

                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Your current role does not have access to management tools for
                            this event. Please contact an admin if you need additional access.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}

function WorkspaceSection({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                    <Sparkles size={16} />
                    {eyebrow}
                </div>

                <h2 className="mt-4 text-2xl font-black text-slate-950">{title}</h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{children}</div>
        </section>
    );
}

function ModuleCard({
    title,
    description,
    href,
    icon: Icon,
    highlight = false,
}: {
    title: string;
    description: string;
    href: string;
    icon: any;
    highlight?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`group rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${highlight
                ? "border-[#4F46E5]/20 bg-gradient-to-br from-[#4F46E5] to-[#EC4899] text-white"
                : "border-slate-200 bg-white text-slate-950"
                }`}
        >
            <div
                className={`w-fit rounded-2xl p-3 transition ${highlight
                    ? "bg-white/20 text-white"
                    : "bg-[#F7F5FF] text-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white"
                    }`}
            >
                <Icon size={24} />
            </div>

            <h3
                className={`mt-6 text-lg font-black ${highlight ? "text-white" : "text-slate-950"
                    }`}
            >
                {title}
            </h3>

            <p
                className={`mt-2 text-sm leading-6 ${highlight ? "text-white/80" : "text-slate-500"
                    }`}
            >
                {description}
            </p>
        </Link>
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

function ClockIcon({ size = 16, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function formatStatus(status?: string | null) {
    if (!status) return "Draft";

    return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
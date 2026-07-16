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
    Gamepad2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Role = "admin" | "organizer" | "organiser" | "viewer" | "scanner" | string;

type EventModuleKey =
    | "overview"
    | "guests"
    | "tickets"
    | "tables"
    | "floor_plan"
    | "speakers"
    | "agenda"
    | "scanner"
    | "lucky_draw"
    | "glitter_games"
    | "glitter_games_qr_codes"
    | "analytics"
    | "registration"
    | "website"
    | "branding"
    | "emails"
    | "settings"
    | "lucky_draw_settings";

type ModuleCardItem = {
    moduleKey: EventModuleKey;
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    highlight?: boolean;
    allowed: boolean;
};

type EventInfoIcon =
    | LucideIcon
    | ComponentType<{ size?: number; className?: string }>;

const defaultEnabledModules: Record<EventModuleKey, boolean> = {
    overview: true,
    guests: true,
    tickets: true,
    tables: true,
    floor_plan: true,
    speakers: true,
    agenda: true,
    scanner: true,
    lucky_draw: true,
    glitter_games: true,
    glitter_games_qr_codes: true,
    analytics: true,
    registration: true,
    website: true,
    branding: true,
    emails: true,
    settings: true,
    lucky_draw_settings: true,
};

function cleanEnabledModules(input: unknown): Record<EventModuleKey, boolean> {
    const output = { ...defaultEnabledModules };

    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return output;
    }

    const record = input as Record<string, unknown>;

    for (const key of Object.keys(defaultEnabledModules) as EventModuleKey[]) {
        if (typeof record[key] === "boolean") {
            output[key] = record[key];
        }
    }

    output.overview = true;
    output.settings = true;

    return output;
}

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
        redirect("/auth/login");
    }

    const [
        profileResult,
        eventResult,
        settingsResult,
        totalGuestsResult,
        checkedInGuestsResult,
        ticketTypesResult,
        assignedTablesResult,
    ] = await Promise.all([
        supabaseServer
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", user.id)
            .maybeSingle(),

        supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        supabaseServer
            .from("event_settings")
            .select("enabled_modules")
            .eq("event_id", eventId)
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

        supabaseServer
            .from("ticket_types")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId),

        supabaseServer
            .from("table_assignments")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId),
    ]);

    const profile = profileResult.data;
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

    const role: Role = profile?.role || "viewer";

    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer" || role === "organiser";
    const isViewer = role === "viewer";
    const isScanner = role === "scanner";

    const canManageEvent = isAdmin || isOrganizer;
    const canScan = isAdmin || isOrganizer || isScanner;
    const canViewReports = isAdmin || isOrganizer || isViewer;

    const enabledModules = cleanEnabledModules(
        settingsResult.data?.enabled_modules
    );

    function canAccessModule(moduleKey: EventModuleKey, allowedByRole: boolean) {
        if (!allowedByRole) return false;

        // These two toggles must also apply to admins.
        if (
            moduleKey === "glitter_games" ||
            moduleKey === "glitter_games_qr_codes"
        ) {
            return enabledModules[moduleKey] !== false;
        }

        if (isAdmin) return true;

        return enabledModules[moduleKey] !== false;
    }

    const total = totalGuestsResult.count || 0;
    const checkedIn = checkedInGuestsResult.count || 0;
    const pending = Math.max(total - checkedIn, 0);
    const checkedInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    const ticketTypes = ticketTypesResult.count || 0;
    const assignedTables = assignedTablesResult.count || 0;

    const managementCards = (
        [
            {
                moduleKey: "guests",
                title: "Guest List",
                description: "View, search and manage registered guests.",
                href: `/dashboard/events/${eventId}/guests`,
                icon: Users,
                allowed: canAccessModule("guests", canManageEvent),
            },
            {
                moduleKey: "tickets",
                title: "Ticket Types",
                description: "Set up ticket categories, limits and pricing rules.",
                href: `/dashboard/events/${eventId}/tickets`,
                icon: Ticket,
                allowed: canAccessModule("tickets", canManageEvent),
            },
            {
                moduleKey: "tables",
                title: "Tables",
                description: "Create event tables and assign guests to seats.",
                href: `/dashboard/events/${eventId}/tables`,
                icon: Utensils,
                allowed: canAccessModule("tables", canManageEvent),
            },
            {
                moduleKey: "floor_plan",
                title: "Floor Plan",
                description: "Arrange table layout and seating flow visually.",
                href: `/dashboard/events/${eventId}/floor-plan`,
                icon: Map,
                allowed: canAccessModule("floor_plan", canManageEvent),
            },
            {
                moduleKey: "speakers",
                title: "Speakers",
                description: "Manage event speakers and speaker details.",
                href: `/dashboard/events/${eventId}/speakers`,
                icon: Mic2,
                allowed: canAccessModule("speakers", canManageEvent),
            },
            {
                moduleKey: "agenda",
                title: "Agenda",
                description: "Build the event programme and timeline.",
                href: `/dashboard/events/${eventId}/agenda`,
                icon: ListTodo,
                allowed: canAccessModule("agenda", canManageEvent),
            },
        ] satisfies ModuleCardItem[]
    ).filter((item) => item.allowed);

    const eventDayCards = (
        [
            {
                moduleKey: "scanner",
                title: "QR Scanner",
                description: "Scan guest QR codes and record check-ins.",
                href: `/dashboard/events/${eventId}/scanner`,
                icon: QrCode,
                highlight: true,
                allowed: canAccessModule("scanner", canScan),
            },
            {
                moduleKey: "scanner",
                title: "Manual Check-In",
                description: "Search guests manually if QR scanning is unavailable.",
                href: `/dashboard/events/${eventId}/scanner`,
                icon: UserRoundCheck,
                allowed: canAccessModule("scanner", canScan),
            },
            {
                moduleKey: "lucky_draw",
                title: "Lucky Draw",
                description: "Spin a Wheel of Fortune using checked-in guests only.",
                href: `/dashboard/events/${eventId}/lucky-draw`,
                icon: Gift,
                allowed: canAccessModule("lucky_draw", canScan),
            },
            {
                moduleKey: "glitter_games",
                title: "Games",
                description: "Run pre-dinner mini games, points and the live leaderboard.",
                href: `/dashboard/events/${eventId}/games`,
                icon: Gamepad2,
                allowed: canAccessModule("glitter_games", isAdmin),
            },
        ] satisfies ModuleCardItem[]
    ).filter((item) => item.allowed);

    const reportCards = (
        [
            {
                moduleKey: "analytics",
                title: "Analytics",
                description: "View attendance, registration and table assignment insights.",
                href: `/dashboard/events/${eventId}/analytics`,
                icon: BarChart3,
                allowed: canAccessModule("analytics", canViewReports),
            },
        ] satisfies ModuleCardItem[]
    ).filter((item) => item.allowed);

    const administrationCards = (
        [
            {
                moduleKey: "registration",
                title: "Registration Builder",
                description: "Create and manage the event registration form fields.",
                href: `/dashboard/events/${eventId}/registration`,
                icon: ClipboardList,
                allowed: canAccessModule("registration", canManageEvent),
            },
            {
                moduleKey: "website",
                title: "Website Builder",
                description: "Customise the public event registration website.",
                href: `/dashboard/events/${eventId}/website`,
                icon: Globe2,
                allowed: canAccessModule("website", canManageEvent),
            },
            {
                moduleKey: "branding",
                title: "Branding",
                description: "Manage event colours, logo and visual identity.",
                href: `/dashboard/events/${eventId}/branding`,
                icon: Palette,
                allowed: canAccessModule("branding", canManageEvent),
            },
            {
                moduleKey: "emails",
                title: "Email Centre",
                description: "Create and manage event email templates.",
                href: `/dashboard/events/${eventId}/emails`,
                icon: Mail,
                allowed: canAccessModule("emails", canManageEvent),
            },
            {
                moduleKey: "settings",
                title: "Event Settings",
                description: "Control registration page status and event module visibility.",
                href: `/dashboard/events/${eventId}/settings`,
                icon: Settings,
                allowed: canAccessModule("settings", canManageEvent),
            },
            {
                moduleKey: "lucky_draw_settings",
                title: "Lucky Draw Settings",
                description: "Control lucky draw configurations and rules.",
                href: `/dashboard/events/${eventId}/lucky-draw/settings`,
                icon: Settings,
                allowed: canAccessModule("lucky_draw_settings", canManageEvent),
            },
        ] satisfies ModuleCardItem[]
    ).filter((item) => item.allowed);

    const hasAnyModuleAccess =
        managementCards.length > 0 ||
        eventDayCards.length > 0 ||
        reportCards.length > 0 ||
        administrationCards.length > 0;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <Link
                    href="/dashboard/events"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to My Events
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-64 md:w-64" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-40 md:h-64 md:w-64" />

                    <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center lg:gap-8">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <LayoutDashboard size={15} />
                                Event Workspace
                            </div>

                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                                {event.event_name || event.title || event.name || "Event"}
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:mt-4 md:text-lg md:leading-7">
                                Manage registrations, guests, check-in operations and event-day
                                reporting from one control centre.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2 md:mt-6 md:gap-3">
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
                                        Your Access
                                    </p>

                                    <p className="text-2xl font-black capitalize text-slate-950 md:text-3xl">
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

                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                                    {checkedIn} of {total} guests checked in.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <StatCard title="Guests" value={total} text="Registered" icon={Users} />
                    <StatCard
                        title="Checked In"
                        value={checkedIn}
                        text="Verified arrivals"
                        icon={CheckCircle2}
                    />
                    <StatCard title="Pending" value={pending} text="Awaiting" icon={QrCode} />
                    <StatCard
                        title="Tables"
                        value={assignedTables}
                        text={`${ticketTypes} ticket type${ticketTypes === 1 ? "" : "s"}`}
                        icon={Utensils}
                    />
                </section>

                {managementCards.length > 0 && (
                    <WorkspaceSection
                        eyebrow="Operations"
                        title="Event Management"
                        description="Tools for managing guests, tickets, seating and event content."
                    >
                        {managementCards.map(({ moduleKey, allowed, ...item }) => (
                            <ModuleCard key={`${moduleKey}-${item.title}`} {...item} />
                        ))}
                    </WorkspaceSection>
                )}

                {eventDayCards.length > 0 && (
                    <WorkspaceSection
                        eyebrow="Event Day"
                        title="Event-Day Tools"
                        description="Manage guest arrivals, engagement activities and live event interactions."
                    >
                        {eventDayCards.map(({ moduleKey, allowed, ...item }) => (
                            <ModuleCard key={`${moduleKey}-${item.title}`} {...item} />
                        ))}
                    </WorkspaceSection>
                )}

                {reportCards.length > 0 && (
                    <WorkspaceSection
                        eyebrow="Insights"
                        title="Reports & Analytics"
                        description="Monitor registration performance, attendance and guest data."
                    >
                        {reportCards.map(({ moduleKey, allowed, ...item }) => (
                            <ModuleCard key={`${moduleKey}-${item.title}`} {...item} />
                        ))}
                    </WorkspaceSection>
                )}

                {administrationCards.length > 0 && (
                    <WorkspaceSection
                        eyebrow={isAdmin ? "Administration" : "Event Setup"}
                        title="Administration"
                        description={
                            isAdmin
                                ? "Admin accounts can access all event setup and configuration tools."
                                : "Access event setup tools enabled for this event by the admin."
                        }
                    >
                        {administrationCards.map(({ moduleKey, allowed, ...item }) => (
                            <ModuleCard key={`${moduleKey}-${item.title}`} {...item} />
                        ))}
                    </WorkspaceSection>
                )}

                {!hasAnyModuleAccess && (
                    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm md:rounded-[2rem] md:p-8">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F7F5FF] text-[#4F46E5]">
                            <ShieldCheck size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-black text-slate-950">
                            Limited Access
                        </h2>

                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Your current role does not have access to management tools for this
                            event. Please contact an admin if you need additional access.
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
    children: ReactNode;
}) {
    return (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
            <div className="mb-5 md:mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                    <Sparkles size={15} />
                    {eyebrow}
                </div>

                <h2 className="mt-4 text-xl font-black text-slate-950 md:text-2xl">
                    {title}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {children}
            </div>
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
    icon: LucideIcon;
    highlight?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:rounded-[2rem] md:p-6 ${
                highlight
                    ? "border-[#4F46E5]/20 bg-gradient-to-br from-[#4F46E5] to-[#EC4899] text-white"
                    : "border-slate-200 bg-white text-slate-950"
            }`}
        >
            <div
                className={`w-fit rounded-2xl p-3 transition ${
                    highlight
                        ? "bg-white/20 text-white"
                        : "bg-[#F7F5FF] text-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white"
                }`}
            >
                <Icon size={22} />
            </div>

            <h3
                className={`mt-5 text-base font-black md:mt-6 md:text-lg ${
                    highlight ? "text-white" : "text-slate-950"
                }`}
            >
                {title}
            </h3>

            <p
                className={`mt-2 text-sm leading-6 ${
                    highlight ? "text-white/80" : "text-slate-500"
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
    icon: LucideIcon;
}) {
    return (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="w-fit rounded-2xl bg-[#F7F5FF] p-2.5 text-[#4F46E5] md:p-3">
                <Icon size={20} />
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
    icon: EventInfoIcon;
    label: string;
}) {
    return (
        <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm md:px-4 md:py-3 md:text-sm">
            <Icon size={15} className="shrink-0 text-[#4F46E5]" />
            <span className="truncate">{label}</span>
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
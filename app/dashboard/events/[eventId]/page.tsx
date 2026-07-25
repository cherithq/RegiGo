import Link from "next/link";
import DeleteEventButton from "@/components/events/DeleteEventButton";
import {
    ArrowLeft,
    BadgeCheck,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    CreditCard,
    Gift,
    Globe2,
    LayoutDashboard,
    ListTodo,
    Mail,
    MailCheck,
    Map,
    MapPin,
    Mic2,
    Palette,
    Printer,
    QrCode,
    ScanLine,
    Settings,
    ShieldCheck,
    Sparkles,
    TableProperties,
    Ticket,
    Trophy,
    UserRoundCheck,
    Users,
    Utensils,
} from "lucide-react";
import type {
    LucideIcon,
} from "lucide-react";
import type {
    ReactNode,
} from "react";
import { redirect } from "next/navigation";
import {
    type CompanyModuleKey,
    type CompanyUserRole,
} from "@/lib/company-modules";
import {
    getCompanyAdminClient,
    loadEffectiveModules,
} from "@/lib/company-module-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModuleCardItem = {
    moduleKey: CompanyModuleKey;
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    highlight?: boolean;
    allowed: boolean;
};

function normalizeRole(
    value: unknown,
): CompanyUserRole {
    if (
        value === "admin" ||
        value === "organizer" ||
        value === "organiser" ||
        value === "viewer" ||
        value === "scanner"
    ) {
        return value;
    }

    return "viewer";
}

export default async function EventOverviewPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const { eventId } = await params;
    const supabaseServer =
        await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const db = supabaseServer;
    const admin =
        getCompanyAdminClient();

    const {
        data: profile,
        error: profileError,
    } = await db
        .from("profiles")
        .select(
            "id, full_name, email, role, company_id, platform_role",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (
        profileError ||
        !profile
    ) {
        redirect("/auth/login");
    }

    const {
        data: event,
        error: eventError,
    } = await admin
        .from("events")
        .select(
            "id, company_id, event_name, event_slug, event_date, event_time, venue, status",
        )
        .eq("id", eventId)
        .maybeSingle();

    if (
        eventError ||
        !event
    ) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">
                        Event not found.
                    </p>
                </div>
            </main>
        );
    }

    const role =
        normalizeRole(
            profile.role,
        );
    const isPlatformAdmin =
        profile.platform_role ===
        "super_admin";
    const isCompanyAdmin =
        role === "admin";

    if (
        !isPlatformAdmin &&
        String(
            profile.company_id || "",
        ) !==
            String(event.company_id)
    ) {
        redirect(
            "/dashboard/events",
        );
    }

    if (
        !isPlatformAdmin &&
        !isCompanyAdmin
    ) {
        const {
            data: assignment,
            error: assignmentError,
        } = await admin
            .from("event_members")
            .select("id")
            .eq("event_id", eventId)
            .eq(
                "profile_id",
                profile.id,
            )
            .maybeSingle();

        if (
            assignmentError ||
            !assignment
        ) {
            redirect(
                "/dashboard/events",
            );
        }
    }

    const effectiveModules =
        await loadEffectiveModules({
            admin,
            companyId:
                event.company_id,
            role,
            eventId,
            platformAdmin:
                isPlatformAdmin,
        });

    const isOrganizer =
        role === "organizer" ||
        role === "organiser";
    const isViewer =
        role === "viewer";
    const isScanner =
        role === "scanner";

    const canManageEvent =
        isPlatformAdmin ||
        isCompanyAdmin ||
        isOrganizer;
    const canScan =
        canManageEvent ||
        isScanner;
    const canViewReports =
        canManageEvent ||
        isViewer;

    function canAccessModule(
        moduleKey:
            CompanyModuleKey,
        allowedByRole: boolean,
    ) {
        return (
            allowedByRole &&
            effectiveModules[
                moduleKey
            ] !== false
        );
    }

    const [
        guestResult,
        checkedInResult,
        ticketResult,
        tableResult,
    ] = await Promise.all([
        admin
            .from("registrations")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq(
                "event_id",
                eventId,
            ),

        admin
            .from("check_ins")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq(
                "event_id",
                eventId,
            ),

        admin
            .from("ticket_types")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq(
                "event_id",
                eventId,
            ),

        admin
            .from(
                "table_assignments",
            )
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq(
                "event_id",
                eventId,
            ),
    ]);

    const total =
        guestResult.count || 0;
    const checkedIn =
        checkedInResult.count ||
        0;
    const pending =
        Math.max(
            total - checkedIn,
            0,
        );
    const checkedInRate =
        total > 0
            ? Math.round(
                  (
                      checkedIn /
                      total
                  ) * 100,
              )
            : 0;

    const managementCards = (
        [
            {
                moduleKey:
                    "guests",
                title: "Guest List",
                description:
                    "View, search and manage registered guests.",
                href:
                    `/dashboard/events/${eventId}/guests`,
                icon: Users,
                allowed:
                    canAccessModule(
                        "guests",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "invitations",
                title:
                    "Invitations & RSVP",
                description:
                    "Send personalised invitations and track responses.",
                href:
                    `/dashboard/events/${eventId}/invitations`,
                icon: MailCheck,
                allowed:
                    canAccessModule(
                        "invitations",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "tickets",
                title:
                    "Ticket Types",
                description:
                    "Set up ticket categories, limits and pricing rules.",
                href:
                    `/dashboard/events/${eventId}/tickets`,
                icon: Ticket,
                allowed:
                    canAccessModule(
                        "tickets",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "payments",
                title:
                    "Tickets & Payments",
                description:
                    "Review ticket orders, payments and company payouts.",
                href:
                    `/dashboard/events/${eventId}/payments`,
                icon: CreditCard,
                allowed:
                    canAccessModule(
                        "payments",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "tables",
                title: "Tables",
                description:
                    "Create event tables and assign guests.",
                href:
                    `/dashboard/events/${eventId}/tables`,
                icon: Utensils,
                allowed:
                    canAccessModule(
                        "tables",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "table_selection",
                title:
                    "Guest Table Selection",
                description:
                    "Let eligible guests choose an available table.",
                href:
                    `/dashboard/events/${eventId}/table-selection`,
                icon:
                    TableProperties,
                allowed:
                    canAccessModule(
                        "table_selection",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "floor_plan",
                title: "Floor Plan",
                description:
                    "Arrange table layout and seating flow visually.",
                href:
                    `/dashboard/events/${eventId}/floor-plan`,
                icon: Map,
                allowed:
                    canAccessModule(
                        "floor_plan",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "speakers",
                title: "Speakers",
                description:
                    "Manage event speakers and speaker details.",
                href:
                    `/dashboard/events/${eventId}/speakers`,
                icon: Mic2,
                allowed:
                    canAccessModule(
                        "speakers",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "agenda",
                title: "Agenda",
                description:
                    "Build the programme and event timeline.",
                href:
                    `/dashboard/events/${eventId}/agenda`,
                icon: ListTodo,
                allowed:
                    canAccessModule(
                        "agenda",
                        canManageEvent,
                    ),
            },
        ] satisfies ModuleCardItem[]
    ).filter(
        (item) => item.allowed,
    );

    const eventDayCards = (
        [
            {
                moduleKey:
                    "scanner",
                title: "QR Scanner",
                description:
                    "Scan guest QR codes and record check-ins.",
                href:
                    `/dashboard/events/${eventId}/scanner`,
                icon: QrCode,
                highlight: true,
                allowed:
                    canAccessModule(
                        "scanner",
                        canScan,
                    ),
            },
            {
                moduleKey:
                    "scanner",
                title:
                    "Manual Check-In",
                description:
                    "Search and check in guests when QR scanning is unavailable.",
                href:
                    `/dashboard/events/${eventId}/scanner`,
                icon:
                    UserRoundCheck,
                allowed:
                    canAccessModule(
                        "scanner",
                        canScan,
                    ),
            },
            {
                moduleKey:
                    "checkin_printing",
                title:
                    "Check-in Printing",
                description:
                    "Run the browser print station and print badges after check-in.",
                href:
                    `/dashboard/events/${eventId}/check-in-printing`,
                icon: ScanLine,
                allowed:
                    canAccessModule(
                        "checkin_printing",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "lucky_draw",
                title: "Lucky Draw",
                description:
                    "Run live prize draws using eligible checked-in guests.",
                href:
                    `/dashboard/events/${eventId}/lucky-draw`,
                icon: Gift,
                allowed:
                    canAccessModule(
                        "lucky_draw",
                        canScan,
                    ),
            },
            {
                moduleKey:
                    "tournament",
                title: "Tournament",
                description:
                    "Manage tournament rounds, players and live progression.",
                href:
                    `/dashboard/events/${eventId}/games/tournament`,
                icon: Trophy,
                allowed:
                    canAccessModule(
                        "tournament",
                        canManageEvent,
                    ),
            },
        ] satisfies ModuleCardItem[]
    ).filter(
        (item) => item.allowed,
    );

    const reportCards = (
        [
            {
                moduleKey:
                    "analytics",
                title: "Analytics",
                description:
                    "View attendance, registration and table insights.",
                href:
                    `/dashboard/events/${eventId}/analytics`,
                icon: BarChart3,
                allowed:
                    canAccessModule(
                        "analytics",
                        canViewReports,
                    ),
            },
        ] satisfies ModuleCardItem[]
    ).filter(
        (item) => item.allowed,
    );

    const administrationCards = (
        [
            {
                moduleKey:
                    "registration",
                title:
                    "Registration Builder",
                description:
                    "Create and manage registration form fields.",
                href:
                    `/dashboard/events/${eventId}/registration`,
                icon:
                    ClipboardList,
                allowed:
                    canAccessModule(
                        "registration",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "website",
                title:
                    "Website Builder",
                description:
                    "Customise the public event website.",
                href:
                    `/dashboard/events/${eventId}/website`,
                icon: Globe2,
                allowed:
                    canAccessModule(
                        "website",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "branding",
                title: "Branding",
                description:
                    "Manage event colours, logo and visual identity.",
                href:
                    `/dashboard/events/${eventId}/branding`,
                icon: Palette,
                allowed:
                    canAccessModule(
                        "branding",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "emails",
                title:
                    "Email Centre",
                description:
                    "Create templates, reminders and event messages.",
                href:
                    `/dashboard/events/${eventId}/emails`,
                icon: Mail,
                allowed:
                    canAccessModule(
                        "emails",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "badges",
                title:
                    "Badge Designer",
                description:
                    "Design and print badges using guest and QR data.",
                href:
                    `/dashboard/events/${eventId}/badges`,
                icon:
                    BadgeCheck,
                allowed:
                    canAccessModule(
                        "badges",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "direct_printing",
                title:
                    "Direct Badge Printing",
                description:
                    "Manage direct printer delivery when the add-on is enabled.",
                href:
                    `/dashboard/events/${eventId}/direct-printing`,
                icon: Printer,
                allowed:
                    canAccessModule(
                        "direct_printing",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "addons",
                title:
                    "Settings & Add-ons",
                description:
                    "Manage event details, registration, modules and optional features in one place.",
                href:
                    `/dashboard/events/${eventId}/settings`,
                icon: Settings,
                allowed:
                    isPlatformAdmin ||
                    isCompanyAdmin ||
                    canAccessModule(
                        "addons",
                        canManageEvent,
                    ),
            },
            {
                moduleKey:
                    "lucky_draw_settings",
                title:
                    "Lucky Draw Settings",
                description:
                    "Manage prize and eligibility configuration.",
                href:
                    `/dashboard/events/${eventId}/lucky-draw/settings`,
                icon: Settings,
                allowed:
                    canAccessModule(
                        "lucky_draw_settings",
                        canManageEvent,
                    ),
            },
        ] satisfies ModuleCardItem[]
    ).filter(
        (item) => item.allowed,
    );

    const hasAnyModuleAccess =
        managementCards.length >
            0 ||
        eventDayCards.length >
            0 ||
        reportCards.length >
            0 ||
        administrationCards.length >
            0;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href="/dashboard/events"
                        className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5]"
                    >
                        <ArrowLeft
                            size={16}
                        />
                        Back to Events
                    </Link>

                    {(isPlatformAdmin ||
                        isCompanyAdmin) && (
                        <DeleteEventButton
                            eventId={eventId}
                            eventName={
                                event.event_name
                            }
                            redirectAfterDelete="/dashboard/events"
                        />
                    )}
                </div>

                <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <LayoutDashboard
                                    size={16}
                                />
                                Event Workspace
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                                {event.event_name}
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                                Modules shown below use the same company,
                                role, event and add-on visibility rules as
                                the sidebar.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <EventInfo
                                    icon={
                                        BadgeCheck
                                    }
                                    label={
                                        formatStatus(
                                            event.status,
                                        )
                                    }
                                />

                                {event.event_date && (
                                    <EventInfo
                                        icon={
                                            CalendarDays
                                        }
                                        label={
                                            formatDate(
                                                event.event_date,
                                            )
                                        }
                                    />
                                )}

                                {event.event_time && (
                                    <EventInfo
                                        icon={
                                            Clock3
                                        }
                                        label={
                                            event.event_time
                                        }
                                    />
                                )}

                                {event.venue && (
                                    <EventInfo
                                        icon={
                                            MapPin
                                        }
                                        label={
                                            event.venue
                                        }
                                    />
                                )}
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                    <ShieldCheck
                                        size={24}
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-500">
                                        Your Access
                                    </p>
                                    <p className="text-3xl font-black capitalize">
                                        {isPlatformAdmin
                                            ? "Platform Admin"
                                            : role}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl bg-white p-4">
                                <p className="text-sm font-black">
                                    Check-in Progress
                                </p>
                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                        style={{
                                            width:
                                                `${checkedInRate}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-500">
                                    {checkedIn} of{" "}
                                    {total} guests
                                    checked in.
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
                        text="Recorded arrivals"
                        icon={
                            CheckCircle2
                        }
                    />
                    <StatCard
                        title="Pending"
                        value={pending}
                        text="Awaiting check-in"
                        icon={QrCode}
                    />
                    <StatCard
                        title="Table Assigned"
                        value={
                            tableResult.count ||
                            0
                        }
                        text={`${ticketResult.count || 0} ticket types`}
                        icon={Utensils}
                    />
                </section>

                {managementCards.length >
                    0 && (
                    <WorkspaceSection
                        eyebrow="Operations"
                        title="Event Management"
                        description="Guest, invitation, ticket, payment, seating and programme tools."
                    >
                        {managementCards.map(
                            ({
                                moduleKey,
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                allowed,
                                ...item
                            }) => (
                                <ModuleCard
                                    key={`${moduleKey}-${item.title}`}
                                    {...item}
                                />
                            ),
                        )}
                    </WorkspaceSection>
                )}

                {eventDayCards.length >
                    0 && (
                    <WorkspaceSection
                        eyebrow="Event Day"
                        title="Live Event Tools"
                        description="Check-in, badge printing, lucky draw and tournament operations."
                    >
                        {eventDayCards.map(
                            ({
                                moduleKey,
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                allowed,
                                ...item
                            }) => (
                                <ModuleCard
                                    key={`${moduleKey}-${item.title}`}
                                    {...item}
                                />
                            ),
                        )}
                    </WorkspaceSection>
                )}

                {reportCards.length >
                    0 && (
                    <WorkspaceSection
                        eyebrow="Insights"
                        title="Reports & Analytics"
                        description="Monitor registration and attendance performance."
                    >
                        {reportCards.map(
                            ({
                                moduleKey,
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                allowed,
                                ...item
                            }) => (
                                <ModuleCard
                                    key={`${moduleKey}-${item.title}`}
                                    {...item}
                                />
                            ),
                        )}
                    </WorkspaceSection>
                )}

                {administrationCards.length >
                    0 && (
                    <WorkspaceSection
                        eyebrow="Administration"
                        title="Event Setup"
                        description="Website, branding, email, badges, add-ons and settings."
                    >
                        {administrationCards.map(
                            ({
                                moduleKey,
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                allowed,
                                ...item
                            }) => (
                                <ModuleCard
                                    key={`${moduleKey}-${item.title}`}
                                    {...item}
                                />
                            ),
                        )}
                    </WorkspaceSection>
                )}

                {!hasAnyModuleAccess && (
                    <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <ShieldCheck
                            className="mx-auto text-[#4F46E5]"
                            size={32}
                        />
                        <h2 className="mt-4 text-2xl font-black">
                            Limited Access
                        </h2>
                        <p className="mt-2 text-slate-500">
                            No event modules are enabled for your current
                            company, role and event combination.
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
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                    <Sparkles
                        size={16}
                    />
                    {eyebrow}
                </div>
                <h2 className="mt-4 text-2xl font-black">
                    {title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            className={`group rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                highlight
                    ? "border-[#4F46E5]/20 bg-gradient-to-br from-[#4F46E5] to-[#EC4899] text-white"
                    : "border-slate-200 bg-white text-slate-950"
            }`}
        >
            <div
                className={`w-fit rounded-2xl p-3 ${
                    highlight
                        ? "bg-white/20 text-white"
                        : "bg-[#F7F5FF] text-[#4F46E5]"
                }`}
            >
                <Icon size={24} />
            </div>
            <h3 className="mt-6 text-lg font-black">
                {title}
            </h3>
            <p
                className={`mt-2 text-sm leading-6 ${
                    highlight
                        ? "text-white/80"
                        : "text-slate-500"
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
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Icon className="text-[#4F46E5]" />
            <p className="mt-4 text-sm font-bold text-slate-500">
                {title}
            </p>
            <p className="mt-2 text-3xl font-black">
                {value}
            </p>
            <p className="mt-1 text-sm text-slate-500">
                {text}
            </p>
        </div>
    );
}

function EventInfo({
    icon: Icon,
    label,
}: {
    icon: LucideIcon;
    label: string;
}) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
            <Icon size={15} />
            {label}
        </span>
    );
}

function formatStatus(
    value: unknown,
) {
    const status =
        String(value || "draft")
            .replace(/_/g, " ")
            .trim();

    return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
    );
}

function formatDate(
    value: string,
) {
    const date = new Date(
        `${value}T00:00:00`,
    );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-SG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    ).format(date);
}

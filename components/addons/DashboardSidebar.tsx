"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/layout/Logo";
import { useSidebar } from "@/components/layout/SidebarContext";
import {
    BadgeCheck,
    BarChart3,
    Building2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    CreditCard,
    Gift,
    Globe2,
    Home,
    ListTodo,
    LogOut,
    Mail,
    Map,
    Mic2,
    Palette,
    Printer,
    PlusCircle,
    Puzzle,
    QrCode,
    ScanLine,
    Settings,
    ShieldCheck,
    Table2,
    TableProperties,
    Ticket,
    Trophy,
    UserCircle,
    Users,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
    CompanyModuleKey,
    CompanyUserRole,
} from "@/lib/company-modules";


type Profile = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: CompanyUserRole;
    company_id: string | null;
    platform_role: string | null;
};

type SidebarPayload = {
    profile: Profile;
    isPlatformAdmin: boolean;
    company: {
        id: string;
        company_name: string;
    } | null;
    event: {
        id: string;
        event_name: string;
        company_id: string;
    } | null;
    effectiveModules: Partial<Record<CompanyModuleKey, boolean>>;
};

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
    roles?: CompanyUserRole[];
    moduleKey?: CompanyModuleKey;
    adminControl?: boolean;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

const allRoles: CompanyUserRole[] = [
    "admin",
    "organizer",
    "organiser",
    "viewer",
    "scanner",
];

const companyManagers: CompanyUserRole[] = ["admin"];
const eventManagers: CompanyUserRole[] = [
    "admin",
    "organizer",
    "organiser",
];
const scanners: CompanyUserRole[] = [
    "admin",
    "organizer",
    "organiser",
    "scanner",
];
const reportViewers: CompanyUserRole[] = [
    "admin",
    "organizer",
    "organiser",
    "viewer",
];

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: text || "Invalid server response." };
    }
}

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
    const [payload, setPayload] = useState<SidebarPayload | null>(null);
    const [loading, setLoading] = useState(true);

    const eventId = useMemo(() => {
        const match = pathname.match(/^\/dashboard\/events\/([^/]+)/);
        const value = match?.[1];
        return !value || value === "new" || value === "create" ? null : value;
    }, [pathname]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const query = eventId
                    ? `?eventId=${encodeURIComponent(eventId)}`
                    : "";
                const response = await fetch(`/api/access/sidebar${query}`, {
                    cache: "no-store",
                });
                const result = await readJson(response);
                if (!response.ok) throw new Error(result.error || "Unable to load menu.");
                if (!cancelled) setPayload(result as SidebarPayload);
            } catch (error) {
                console.error("Failed to load sidebar:", error);
                if (!cancelled) setPayload(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();

        const handleModuleChange =
            (
                event: Event,
            ) => {
                const detail =
                    (
                        event as CustomEvent<{
                            eventId?: string;
                        }>
                    ).detail;

                if (
                    !detail?.eventId ||
                    detail.eventId === eventId
                ) {
                    void load();
                }
            };

        window.addEventListener(
            "regigo:modules-changed",
            handleModuleChange,
        );

        return () => {
            cancelled = true;
            window.removeEventListener(
                "regigo:modules-changed",
                handleModuleChange,
            );
        };
    }, [eventId, pathname]);

    async function logout() {
        await supabase.auth.signOut();
        window.location.href = "/auth/login";
    }

    const profile = payload?.profile || null;
    const isPlatformAdmin = payload?.isPlatformAdmin === true;
    const companyName =
        payload?.company?.company_name ||
        (isPlatformAdmin ? "RegiGo Platform" : "No company assigned");

    const eventGroups: NavGroup[] = eventId
        ? [
              {
                  title: payload?.event?.event_name || "Event Workspace",
                  items: [
                      {
                          href: `/dashboard/events/${eventId}`,
                          label: "Event Overview",
                          icon: ClipboardList,
                          exact: true,
                          roles: allRoles,
                          moduleKey: "overview",
                      },
                      {
                          href: `/dashboard/events/${eventId}/guests`,
                          label: "Guest List",
                          icon: Users,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "guests",
                      },
                      {
                          href: `/dashboard/events/${eventId}/invitations`,
                          label: "Invitations & RSVP",
                          icon: Mail,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "invitations",
                      },
                      {
                          href: `/dashboard/events/${eventId}/tickets`,
                          label: "Ticket Types",
                          icon: Ticket,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "tickets",
                      },
                      {
                          href: `/dashboard/events/${eventId}/payments`,
                          label: "Tickets & Payments",
                          icon: CreditCard,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "payments",
                      },
                      {
                          href: `/dashboard/events/${eventId}/tables`,
                          label: "Tables",
                          icon: Table2,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "tables",
                      },
                      {
                          href: `/dashboard/events/${eventId}/table-selection`,
                          label: "Guest Table Selection",
                          icon: TableProperties,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "table_selection",
                      },
                      {
                          href: `/dashboard/events/${eventId}/floor-plan`,
                          label: "Floor Plan",
                          icon: Map,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "floor_plan",
                      },
                      {
                          href: `/dashboard/events/${eventId}/speakers`,
                          label: "Speakers",
                          icon: Mic2,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "speakers",
                      },
                      {
                          href: `/dashboard/events/${eventId}/agenda`,
                          label: "Agenda",
                          icon: ListTodo,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "agenda",
                      },
                  ],
              },
              {
                  title: "Event Day",
                  items: [
                      {
                          href: `/dashboard/events/${eventId}/scanner`,
                          label: "QR Scanner",
                          icon: QrCode,
                          exact: true,
                          roles: scanners,
                          moduleKey: "scanner",
                      },
                      {
                          href: `/dashboard/events/${eventId}/check-in-printing`,
                          label: "Check-in Printing",
                          icon: ScanLine,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "checkin_printing",
                      },
                      {
                          href: `/dashboard/events/${eventId}/lucky-draw`,
                          label: "Lucky Draw",
                          icon: Gift,
                          exact: true,
                          roles: scanners,
                          moduleKey: "lucky_draw",
                      },
                      {
                          href: `/dashboard/events/${eventId}/games/tournament`,
                          label: "Tournament",
                          icon: Trophy,
                          roles: eventManagers,
                          moduleKey: "tournament",
                      },
                      {
                          href: `/dashboard/events/${eventId}/analytics`,
                          label: "Analytics",
                          icon: BarChart3,
                          exact: true,
                          roles: reportViewers,
                          moduleKey: "analytics",
                      },
                  ],
              },
              {
                  title: "Event Setup",
                  items: [
                      {
                          href: `/dashboard/events/${eventId}/registration`,
                          label: "Registration Builder",
                          icon: ClipboardList,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "registration",
                      },
                      {
                          href: `/dashboard/events/${eventId}/website`,
                          label: "Website Builder",
                          icon: Globe2,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "website",
                      },
                      {
                          href: `/dashboard/events/${eventId}/branding`,
                          label: "Branding",
                          icon: Palette,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "branding",
                      },
                      {
                          href: `/dashboard/events/${eventId}/emails`,
                          label: "Email Centre",
                          icon: Mail,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "emails",
                      },
                      {
                          href: `/dashboard/events/${eventId}/badges`,
                          label: "Badges",
                          icon: BadgeCheck,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "badges",
                      },
                      {
                          href: `/dashboard/events/${eventId}/direct-printing`,
                          label: "Direct Badge Printing",
                          icon: Printer,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "direct_printing",
                      },
                      {
                          href: `/dashboard/events/${eventId}/addons`,
                          label: "Add-ons",
                          icon: Puzzle,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "addons",
                          adminControl: true,
                      },
                      {
                          href: `/dashboard/events/${eventId}/settings`,
                          label: "Event Settings",
                          icon: Settings,
                          exact: true,
                          roles: companyManagers,
                          moduleKey: "settings",
                          adminControl: true,
                      },
                      {
                          href: `/dashboard/events/${eventId}/lucky-draw/settings`,
                          label: "Lucky Draw Settings",
                          icon: Settings,
                          exact: true,
                          roles: eventManagers,
                          moduleKey: "lucky_draw_settings",
                      },
                  ],
              },
          ]
        : [];

    const groups: NavGroup[] = [
        {
            title: "Main",
            items: [
                {
                    href: "/dashboard",
                    label: "Dashboard",
                    icon: Home,
                    exact: true,
                    roles: allRoles,
                },
                {
                    href: "/dashboard/events",
                    label: isPlatformAdmin ? "All Events" : "My Events",
                    icon: CalendarDays,
                    exact: true,
                    roles: allRoles,
                },
                {
                    href: "/dashboard/events/new",
                    label: "Create Event",
                    icon: PlusCircle,
                    exact: true,
                    roles: companyManagers,
                },
            ],
        },
        {
            title: "Management",
            items: [
                {
                    href: "/dashboard/companies",
                    label: "Companies & Modules",
                    icon: Building2,
                    exact: true,
                    roles: companyManagers,
                },
                {
                    href: "/dashboard/users",
                    label: "Users & Permissions",
                    icon: Users,
                    exact: true,
                    roles: companyManagers,
                },
                {
                    href: "/dashboard/roles",
                    label: "Roles & Permissions",
                    icon: ShieldCheck,
                    exact: true,
                    roles: companyManagers,
                },
            ],
        },
        ...eventGroups,
        {
            title: "Account",
            items: [
                {
                    href: "/dashboard/profile",
                    label: "My Profile",
                    icon: UserCircle,
                    exact: true,
                    roles: allRoles,
                },
                {
                    href: "/dashboard/settings",
                    label: "Settings",
                    icon: Settings,
                    exact: true,
                    roles: companyManagers,
                },
            ],
        },
    ];

    function visible(item: NavItem) {
        if (!profile) return false;
        if (item.roles && !item.roles.includes(profile.role)) return false;
        if (isPlatformAdmin) return true;
        if (!item.moduleKey) return true;
        if (item.adminControl && profile.role === "admin") return true;
        return payload?.effectiveModules?.[item.moduleKey] !== false;
    }

    return (
        <>
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-200 bg-white p-5 transition-all duration-300 ${
                    collapsed ? "lg:w-24" : "lg:w-80"
                } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} w-80`}
            >
                <div className="flex items-center justify-between">
                    {!collapsed && <Logo />}
                    {collapsed && (
                        <Link
                            href="/dashboard/events"
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] font-black text-white"
                        >
                            R
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden rounded-xl bg-[#F7F5FF] p-2 text-[#4F46E5] lg:block"
                    >
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl bg-[#F7F5FF] p-2 text-[#4F46E5] lg:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                {!collapsed && (
                    <div className="mt-6 rounded-2xl border border-indigo-100 bg-[#F7F5FF] px-4 py-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {eventId ? "Event Company" : "Current Company"}
                        </p>
                        <p className="mt-1 truncate text-base font-black text-slate-900">
                            {companyName}
                        </p>
                        {payload?.event?.event_name && (
                            <p className="mt-1 truncate text-xs font-semibold text-[#4F46E5]">
                                {payload.event.event_name}
                            </p>
                        )}
                    </div>
                )}

                <nav className="mt-7 max-h-[calc(100vh-240px)] space-y-7 overflow-y-auto pb-28">
                    {loading ? (
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                            {!collapsed && "Loading menu..."}
                        </div>
                    ) : (
                        groups.map((group) => {
                            const items = group.items.filter(visible);
                            if (!items.length) return null;
                            return (
                                <div key={group.title}>
                                    {!collapsed && (
                                        <p className="mb-2 px-4 text-xs font-black uppercase tracking-widest text-slate-400">
                                            {group.title}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {items.map((item) => (
                                            <SideLink
                                                key={item.href}
                                                item={item}
                                                collapsed={collapsed}
                                                onClick={() => setMobileOpen(false)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </nav>

                <div className="absolute bottom-5 left-0 w-full px-5">
                    {!collapsed && profile && (
                        <div className="mb-3 rounded-2xl bg-[#F7F5FF] px-4 py-3">
                            <p className="truncate text-sm font-black text-slate-800">
                                {profile.full_name || "User"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {profile.email}
                            </p>
                            <p className="mt-1 text-xs font-bold capitalize text-[#4F46E5]">
                                {isPlatformAdmin ? "Platform Admin" : profile.role}
                            </p>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={logout}
                        className={`flex w-full items-center rounded-2xl px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 ${collapsed ? "justify-center" : "gap-3"}`}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}

function SideLink({
    item,
    collapsed,
    onClick,
}: {
    item: NavItem;
    collapsed: boolean;
    onClick: () => void;
}) {
    const pathname = usePathname();
    const active = item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            title={item.label}
            onClick={onClick}
            className={`flex items-center rounded-2xl px-4 py-3 font-semibold transition ${
                collapsed ? "justify-center" : "gap-3"
            } ${
                active
                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-lg"
                    : "text-slate-700 hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
            }`}
        >
            <Icon size={20} />
            {!collapsed && <span>{item.label}</span>}
        </Link>
    );
}

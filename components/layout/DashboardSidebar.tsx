"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "./Logo";
import { useSidebar } from "./SidebarContext";
import {
    Home,
    CalendarDays,
    PlusCircle,
    Building2,
    Users,
    UserCircle,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    X,
    ShieldCheck,
    QrCode,
    ClipboardList,
    Table2,
    Mic2,
    Mail,
    BarChart3,
    Ticket,
    Map,
    ListTodo,
    Globe2,
    Palette,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type UserRole = "admin" | "organizer" | "viewer" | "scanner";

type Profile = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
};

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
    roles: UserRole[];
};

type NavGroupType = {
    title: string;
    items: NavItem[];
};

const allRoles: UserRole[] = ["admin", "organizer", "viewer", "scanner"];
const adminOnly: UserRole[] = ["admin"];
const organizerOnly: UserRole[] = ["organizer"];
const eventManagers: UserRole[] = ["admin", "organizer"];
const scanners: UserRole[] = ["admin", "organizer", "scanner"];
const reportViewers: UserRole[] = ["admin", "organizer", "viewer"];

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setProfile(null);
                setLoadingProfile(false);
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email, role")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Failed to load profile:", error);
                setProfile(null);
            } else if (
                data?.role === "admin" ||
                data?.role === "organizer" ||
                data?.role === "viewer" ||
                data?.role === "scanner"
            ) {
                setProfile(data as Profile);
            } else {
                setProfile({
                    id: user.id,
                    full_name: data?.full_name || null,
                    email: data?.email || user.email || null,
                    role: "viewer",
                });
            }

            setLoadingProfile(false);
        }

        loadProfile();
    }, []);

    const eventId = useMemo(() => {
        const match = pathname.match(/^\/dashboard\/events\/([^/]+)/);
        const id = match?.[1];

        if (!id || id === "new" || id === "create") {
            return null;
        }

        return id;
    }, [pathname]);

    async function logout() {
        await supabase.auth.signOut();
        window.location.href = "/auth/login";
    }

    const navGroups: NavGroupType[] = [
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
                    label: "My Events",
                    icon: CalendarDays,
                    exact: true,
                    roles: allRoles,
                },
                {
                    href: "/dashboard/events/new",
                    label: "Create Event",
                    icon: PlusCircle,
                    exact: true,
                    roles: adminOnly,
                },
            ],
        },
        {
            title: "Management",
            items: [

                {
                    href: "/dashboard/users",
                    label: "Users & Permissions",
                    icon: Users,
                    exact: true,
                    roles: adminOnly,
                },
                {
                    href: "/dashboard/roles",
                    label: "Roles & Permissions",
                    icon: ShieldCheck,
                    exact: true,
                    roles: adminOnly,
                },
            ],
        },
        ...(eventId
            ? [
                {
                    title: "Event Workspace",
                    items: [
                        {
                            href: `/dashboard/events/${eventId}`,
                            label: "Event Overview",
                            icon: ClipboardList,
                            exact: true,
                            roles: allRoles,
                        },
                        {
                            href: `/dashboard/events/${eventId}/guests`,
                            label: "Guest List",
                            icon: Users,
                            exact: true,
                            roles: eventManagers,
                        },
                        {
                            href: `/dashboard/events/${eventId}/tickets`,
                            label: "Ticket Types",
                            icon: Ticket,
                            exact: true,
                            roles: eventManagers,
                        },
                        {
                            href: `/dashboard/events/${eventId}/tables`,
                            label: "Tables",
                            icon: Table2,
                            exact: true,
                            roles: eventManagers,
                        },
                        {
                            href: `/dashboard/events/${eventId}/floor-plan`,
                            label: "Floor Plan",
                            icon: Map,
                            exact: true,
                            roles: eventManagers,
                        },
                        {
                            href: `/dashboard/events/${eventId}/speakers`,
                            label: "Speakers",
                            icon: Mic2,
                            exact: true,
                            roles: eventManagers,
                        },
                        {
                            href: `/dashboard/events/${eventId}/agenda`,
                            label: "Agenda",
                            icon: ListTodo,
                            exact: true,
                            roles: eventManagers,
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
                        },
                        {
                            href: `/dashboard/events/${eventId}/analytics`,
                            label: "Analytics",
                            icon: BarChart3,
                            exact: true,
                            roles: reportViewers,
                        },
                    ],
                },
                {
                    title: "Administration",
                    items: [
                        {
                            href: `/dashboard/events/${eventId}/registration`,
                            label: "Registration Builder",
                            icon: ClipboardList,
                            exact: true,
                            roles: adminOnly,
                        },
                        {
                            href: `/dashboard/events/${eventId}/website`,
                            label: "Website Builder",
                            icon: Globe2,
                            exact: true,
                            roles: adminOnly,
                        },
                        {
                            href: `/dashboard/events/${eventId}/branding`,
                            label: "Branding",
                            icon: Palette,
                            exact: true,
                            roles: adminOnly,
                        },
                        {
                            href: `/dashboard/events/${eventId}/emails`,
                            label: "Email Templates",
                            icon: Mail,
                            exact: true,
                            roles: adminOnly,
                        },
                        {
                            href: `/dashboard/events/${eventId}/settings`,
                            label: "Event Settings",
                            icon: Settings,
                            exact: true,
                            roles: adminOnly,
                        },
                    ],
                },
            ]
            : []),
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
                    roles: adminOnly,
                },
            ],
        },
    ];

    function canShowItem(item: NavItem) {
        if (loadingProfile) return false;
        if (!profile) return false;

        return item.roles.includes(profile.role);
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
                className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-200 bg-white p-5 transition-all duration-300 ${collapsed ? "lg:w-24" : "lg:w-72"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    } w-72`}
            >
                <div className="flex items-center justify-between">
                    {!collapsed && <Logo />}

                    {collapsed && (
                        <Link
                            href="/dashboard/events"
                            onClick={() => setMobileOpen(false)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] font-black text-white"
                        >
                            R
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden rounded-xl bg-[#F7F5FF] p-2 text-[#4F46E5] hover:bg-indigo-100 lg:block"
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

                <nav className="mt-10 max-h-[calc(100vh-180px)] space-y-7 overflow-y-auto pb-24">
                    {loadingProfile ? (
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                            {!collapsed && "Loading menu..."}
                        </div>
                    ) : (
                        navGroups.map((group) => {
                            const visibleItems = group.items.filter(canShowItem);

                            if (visibleItems.length === 0) {
                                return null;
                            }

                            return (
                                <NavGroup
                                    key={group.title}
                                    title={group.title}
                                    collapsed={collapsed}
                                >
                                    {visibleItems.map((item) => (
                                        <SideLink
                                            key={item.href}
                                            href={item.href}
                                            label={item.label}
                                            Icon={item.icon}
                                            exact={item.exact}
                                            collapsed={collapsed}
                                            onClick={() => setMobileOpen(false)}
                                        />
                                    ))}
                                </NavGroup>
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
                                {profile.role}
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={logout}
                        className={`flex w-full items-center rounded-2xl px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 ${collapsed ? "justify-center" : "gap-3"
                            }`}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}

function NavGroup({
    title,
    collapsed,
    children,
}: {
    title: string;
    collapsed: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            {!collapsed && (
                <p className="mb-2 px-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    {title}
                </p>
            )}

            <div className="space-y-1">{children}</div>
        </div>
    );
}

function SideLink({
    href,
    label,
    Icon,
    exact,
    collapsed,
    onClick,
}: {
    href: string;
    label: string;
    Icon: LucideIcon;
    exact?: boolean;
    collapsed: boolean;
    onClick: () => void;
}) {
    const pathname = usePathname();

    const active = exact
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);

    return (
        <Link
            href={href}
            title={label}
            onClick={onClick}
            className={`flex items-center rounded-2xl px-4 py-3 font-semibold transition ${collapsed ? "justify-center" : "gap-3"
                } ${active
                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-lg"
                    : "text-slate-700 hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                }`}
        >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
        </Link>
    );
}
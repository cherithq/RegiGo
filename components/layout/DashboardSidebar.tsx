"use client";

import Link from "next/link";
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
} from "lucide-react";

type PermissionKey =
    | "can_manage_events"
    | "can_manage_company"
    | "can_manage_team"
    | "can_manage_settings";

type NavItem = {
    href: string;
    label: string;
    icon: any;
    permission?: PermissionKey;
    exact?: boolean;
};

const navGroups: { title: string; items: NavItem[] }[] = [
    {
        title: "Main",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: Home, exact: true },
            {
                href: "/dashboard/events",
                label: "My Events",
                icon: CalendarDays,
                permission: "can_manage_events",
            },
            {
                href: "/dashboard/events/new",
                label: "Create Event",
                icon: PlusCircle,
                permission: "can_manage_events",
                exact: true,
            },
        ],
    },
    {
        title: "Management",
        items: [
            {
                href: "/dashboard/company",
                label: "Company",
                icon: Building2,
                permission: "can_manage_company",
            },
            {
                href: "/dashboard/team",
                label: "Team Members",
                icon: Users,
                permission: "can_manage_team",
            },
            {
                href: "/dashboard/roles",
                label: "Roles & Permissions",
                icon: ShieldCheck,
                permission: "can_manage_settings",
            },
        ],
    },
    {
        title: "Account",
        items: [
            { href: "/dashboard/profile", label: "My Profile", icon: UserCircle },
            {
                href: "/dashboard/settings",
                label: "Settings",
                icon: Settings,
                permission: "can_manage_settings",
            },
        ],
    },
];

export default function DashboardSidebar() {
    const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

    async function logout() {
        await supabase.auth.signOut();
        window.location.href = "/auth/login";
    }

    return (
        <>
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-50 bg-black/40 lg:hidden"
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-200 bg-white p-5 transition-all duration-300 ${
                    collapsed ? "lg:w-24" : "lg:w-72"
                } ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                } w-72`}
            >
                <div className="flex items-center justify-between">
                    {!collapsed && <Logo />}

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
                        className="rounded-xl bg-[#F7F5FF] p-2 lg:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="mt-10 max-h-[calc(100vh-180px)] space-y-7 overflow-y-auto pb-24">
                    {navGroups.map((group) => (
                        <NavGroup key={group.title} title={group.title} collapsed={collapsed}>
                            {group.items.map((item) => (
                                <SideLink
                                    key={item.href}
                                    item={item}
                                    collapsed={collapsed}
                                    onClick={() => setMobileOpen(false)}
                                />
                            ))}
                        </NavGroup>
                    ))}
                </nav>

                <div className="absolute bottom-5 left-0 w-full px-5">
                    <button
                        type="button"
                        onClick={logout}
                        className={`flex w-full items-center rounded-2xl px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 ${
                            collapsed ? "justify-center" : "gap-3"
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
    item,
    collapsed,
    onClick,
}: {
    item: NavItem;
    collapsed: boolean;
    onClick: () => void;
}) {
    const pathname = usePathname();
    const Icon = item.icon;

    const active = isActivePath(pathname, item.href, item.exact);

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

function isActivePath(pathname: string, href: string, exact?: boolean) {
    if (exact) return pathname === href;

    if (href === "/dashboard/events") {
        if (pathname === "/dashboard/events") return true;
        if (pathname === "/dashboard/events/new") return false;
        return pathname.startsWith("/dashboard/events/");
    }

    if (href === "/dashboard") return pathname === "/dashboard";

    return pathname === href || pathname.startsWith(`${href}/`);
}

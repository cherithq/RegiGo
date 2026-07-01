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

const navGroups = [
    {
        title: "Main",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: Home, exact: true },
            { href: "/dashboard/events", label: "My Events", icon: CalendarDays, exact: true },
            { href: "/dashboard/events/new", label: "Create Event", icon: PlusCircle, exact: true },
        ],
    },
    {
        title: "Management",
        items: [
            { href: "/dashboard/company", label: "Company", icon: Building2, exact: true },
            { href: "/dashboard/team", label: "Team Members", icon: Users, exact: true },
            { href: "/dashboard/roles", label: "Roles & Permissions", icon: ShieldCheck, exact: true },
        ],
    },
    {
        title: "Account",
        items: [
            { href: "/dashboard/profile", label: "My Profile", icon: UserCircle, exact: true },
            { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: true },
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
                className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-200 bg-white p-5 transition-all duration-300 ${collapsed ? "lg:w-24" : "lg:w-72"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
                                    href={item.href}
                                    label={item.label}
                                    Icon={item.icon}
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
    collapsed,
    onClick,
}: {
    href: string;
    label: string;
    Icon: any;
    collapsed: boolean;
    onClick: () => void;
}) {
    const pathname = usePathname();

    let active = false;

    if (href === "/dashboard") {
        active = pathname === "/dashboard";
    } else if (href === "/dashboard/events") {
        active = pathname === "/dashboard/events";
    } else if (href === "/dashboard/events/new") {
        active = pathname === "/dashboard/events/new";
    } else {
        active = pathname === href;
    }

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
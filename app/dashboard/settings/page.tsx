import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarDays,
    LockKeyhole,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

export default async function DashboardSettingsPage() {
    const supabaseServer = await createSupabaseServerClient();

    await requirePermission("can_manage_settings");

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    const { data: profile } = user
        ? await supabaseServer
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", user.id)
            .single()
        : { data: null };

    const { count: totalEvents } = await supabaseServer
        .from("events")
        .select("*", { count: "exact", head: true });

    const { count: totalUsers } = await supabaseServer
        .from("profiles")
        .select("*", { count: "exact", head: true });

    const { count: totalCompanies } = await supabaseServer
        .from("companies")
        .select("*", { count: "exact", head: true });

    const { count: totalRoles } = await supabaseServer
        .from("role_permissions")
        .select("*", { count: "exact", head: true });

    return (
        <div className="space-y-8">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] hover:text-[#EC4899]"
            >
                <ArrowLeft size={16} />
                Back to Dashboard
            </Link>

            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <SlidersHorizontal size={16} />
                            Workspace Configuration
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Settings
                        </h1>

                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            Manage your RegiGo workspace settings, access control, and administrative setup.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                                Signed in as {profile?.full_name || profile?.email || "Admin"}
                            </span>

                            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold capitalize text-emerald-700">
                                {profile?.role || "admin"}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                <LockKeyhole size={22} />
                            </div>

                            <div>
                                <p className="font-black text-slate-950">Admin-only area</p>
                                <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                                    Settings are restricted to accounts with system management
                                    permission.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Events"
                    value={totalEvents || 0}
                    text="Total events in workspace"
                    icon={CalendarDays}
                />

                <StatCard
                    title="Users"
                    value={totalUsers || 0}
                    text="Registered dashboard accounts"
                    icon={Users}
                />

                <StatCard
                    title="Companies"
                    value={totalCompanies || 0}
                    text="Company profiles configured"
                    icon={Building2}
                />

                <StatCard
                    title="Roles"
                    value={totalRoles || 0}
                    text="Permission groups available"
                    icon={ShieldCheck}
                />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">
                            Workspace Management
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Access key administrative areas for managing the RegiGo workspace.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-[#4F46E5]">
                        RegiGo Admin
                    </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

                    <SettingsCard
                        href="/dashboard/users"
                        title="Users & Permissions"
                        text="Create user accounts and assign each user to specific events."
                        icon={Users}
                    />

                    <SettingsCard
                        href="/dashboard/roles"
                        title="Roles & Access"
                        text="Review role permissions for admins, organizers, viewers, and scanners."
                        icon={ShieldCheck}
                    />

                    <SettingsCard
                        href="/dashboard/events"
                        title="Event Workspace"
                        text="Open your event list and manage event-level setup and operations."
                        icon={CalendarDays}
                    />
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                            <Sparkles size={24} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-slate-950">
                                Workspace Status
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Your RegiGo workspace is active and ready for event operations.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <StatusRow label="Authentication" value="Enabled" />
                        <StatusRow label="Role-based access" value="Enabled" />
                        <StatusRow label="Event assignment control" value="Enabled" />
                        <StatusRow label="Admin user creation" value="Enabled" />
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                            <Settings size={24} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-black text-slate-950">
                                Recommended Setup
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Complete these areas to keep the workspace clean and secure.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3">
                        <ChecklistItem text="Keep only trusted users as admin accounts." />
                        <ChecklistItem text="Assign normal users to only the events they need." />
                        <ChecklistItem text="Use organizer accounts for event managers." />
                        <ChecklistItem text="Use scanner accounts for event-day check-in staff." />
                        <ChecklistItem text="Review roles whenever permission rules are updated." />
                    </div>
                </div>
            </section>
        </div>
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
        <div className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5] w-fit transition group-hover:bg-[#4F46E5] group-hover:text-white">
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

function SettingsCard({
    href,
    title,
    text,
    icon: Icon,
}: {
    href: string;
    title: string;
    text: string;
    icon: LucideIcon;
}) {
    return (
        <Link
            href={href}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-indigo-100 hover:bg-[#F7F5FF] hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm transition group-hover:bg-[#4F46E5] group-hover:text-white">
                    <Icon size={23} />
                </div>

                <ArrowRight
                    size={17}
                    className="text-[#4F46E5] opacity-0 transition group-hover:opacity-100"
                />
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
        </Link>
    );
}

function StatusRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-slate-600">{label}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {value}
            </span>
        </div>
    );
}

function ChecklistItem({ text }: { text: string }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
            {text}
        </div>
    );
}
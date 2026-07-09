import {
    ShieldCheck,
    Settings,
    Users,
    ArrowLeft,
    AlertCircle,
    LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import RolePermissionsManager from "@/components/forms/RolePermissionsManager";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

type RolePermission = {
    id: string;
    role: string;
    can_manage_events: boolean;
    can_manage_guests: boolean;
    can_scan_qr: boolean;
    can_manage_reports: boolean;
    can_manage_settings: boolean;
    created_at?: string;
};

const roleOrder = ["admin", "organizer", "viewer", "scanner"];

export default async function RolesPage() {
    const supabaseServer = await createSupabaseServerClient();

    await requirePermission("can_manage_settings");

    const { data, error } = await supabaseServer
        .from("role_permissions")
        .select("*");

    const roles = ((data ?? []) as RolePermission[]).sort((a, b) => {
        const aIndex = roleOrder.indexOf(a.role);
        const bIndex = roleOrder.indexOf(b.role);

        if (aIndex === -1 && bIndex === -1) {
            return a.role.localeCompare(b.role);
        }

        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
    });

    const totalRoles = roles.length;
    const editableRoles = roles.filter((role) => role.role !== "admin").length;

    const fullAccessRoles = roles.filter(
        (role) =>
            role.can_manage_events &&
            role.can_manage_guests &&
            role.can_scan_qr &&
            role.can_manage_reports &&
            role.can_manage_settings
    ).length;

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
                            <LockKeyhole size={16} />
                            Access Control
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Roles & Permissions
                        </h1>

                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                            Control what each role can access across RegiGo. Use this page to
                            review and update permission levels for dashboard users.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                <Settings size={22} />
                            </div>

                            <div>
                                <p className="font-black text-slate-950">Admin area</p>
                                <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                                    Changes here affect dashboard access and should only be edited
                                    by trusted administrators.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5" size={18} />
                        <div>
                            <p className="font-black">Failed to load role permissions.</p>
                            <p className="mt-1">{error.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <section className="grid gap-5 md:grid-cols-3">
                <SummaryCard
                    title="Total Roles"
                    value={totalRoles}
                    text="Active permission groups"
                    icon={Users}
                />

                <SummaryCard
                    title="Editable Roles"
                    value={editableRoles}
                    text="Non-admin role groups"
                    icon={Settings}
                />

                <SummaryCard
                    title="Full Access"
                    value={fullAccessRoles}
                    text="Roles with all permissions enabled"
                    icon={ShieldCheck}
                />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">
                            Permission Matrix
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Review and update what each role can access. The database policies
                            still enforce actual data access, while these permissions help
                            control the dashboard interface.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-[#4F46E5]">
                        {roles.length} role{roles.length === 1 ? "" : "s"} loaded
                    </div>
                </div>

                <RolePermissionsManager roles={roles} />
            </section>
        </div>
    );
}

function SummaryCard({
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
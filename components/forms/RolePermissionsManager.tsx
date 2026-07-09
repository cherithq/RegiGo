"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type RolePermission = {
    id: string;
    role: string;
    can_manage_events: boolean;
    can_manage_guests: boolean;
    can_scan_qr: boolean;
    can_manage_reports: boolean;
    can_manage_settings: boolean;
};

const permissionLabels = [
    { key: "can_manage_events", label: "Events" },
    { key: "can_manage_guests", label: "Guests" },
    { key: "can_scan_qr", label: "QR Scan" },
    { key: "can_manage_reports", label: "Reports" },
    { key: "can_manage_settings", label: "Settings" },
] as const;

export default function RolePermissionsManager({
    roles,
}: {
    roles: RolePermission[];
}) {
    const [items, setItems] = useState<RolePermission[]>(roles);
    const [message, setMessage] = useState("");

    async function togglePermission(
        roleId: string,
        key: keyof Omit<RolePermission, "id" | "role">
    ) {
        setMessage("");

        const current = items.find((item) => item.id === roleId);
        if (!current) return;

        const updatedValue = !current[key];

        const { error } = await supabase
            .from("role_permissions")
            .update({ [key]: updatedValue })
            .eq("id", roleId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setItems(
            items.map((item) =>
                item.id === roleId ? { ...item, [key]: updatedValue } : item
            )
        );
    }

    async function setAll(roleId: string, value: boolean) {
        setMessage("");

        const updates = {
            can_manage_events: value,
            can_manage_guests: value,
            can_scan_qr: value,
            can_manage_reports: value,
            can_manage_settings: value,
        };

        const { error } = await supabase
            .from("role_permissions")
            .update(updates)
            .eq("id", roleId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setItems(
            items.map((item) =>
                item.id === roleId ? { ...item, ...updates } : item
            )
        );

        setMessage("Permissions updated.");
    }

    return (
        <div className="space-y-6">
            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <div className="overflow-x-auto rounded-[2rem] border border-slate-200">
                <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="bg-[#F7F5FF] text-slate-600">
                        <tr>
                            <th className="p-4">Role</th>
                            {permissionLabels.map((permission) => (
                                <th key={permission.key} className="p-4 text-center">
                                    {permission.label}
                                </th>
                            ))}
                            <th className="p-4 text-center">Quick Action</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white">
                        {items.map((role) => (
                            <tr key={role.id} className="border-t border-slate-100">
                                <td className="p-4">
                                    <p className="font-black">{role.role}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {getRoleDescription(role.role)}
                                    </p>
                                </td>

                                {permissionLabels.map((permission) => (
                                    <td key={permission.key} className="p-4 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                togglePermission(role.id, permission.key)
                                            }
                                            className={`mx-auto flex h-8 w-14 items-center rounded-full p-1 transition ${role[permission.key]
                                                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899]"
                                                    : "bg-slate-200"
                                                }`}
                                        >
                                            <span
                                                className={`h-6 w-6 rounded-full bg-white shadow transition ${role[permission.key]
                                                        ? "translate-x-6"
                                                        : "translate-x-0"
                                                    }`}
                                            />
                                        </button>
                                    </td>
                                ))}

                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => setAll(role.id, true)}
                                            className="rounded-xl bg-green-50 px-3 py-2 text-xs font-black text-green-700"
                                        >
                                            Allow All
                                        </button>

                                        <button
                                            onClick={() => setAll(role.id, false)}
                                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                                        >
                                            Block All
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {items.length === 0 && (
                            <tr>
                                <td
                                    colSpan={permissionLabels.length + 2}
                                    className="p-8 text-center text-slate-500"
                                >
                                    No roles found. Please run the role permissions SQL first.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <InfoCard
                    title="Super Admin"
                    text="Full access to all workspace and event features."
                />
                <InfoCard
                    title="Event Manager"
                    text="Can manage events, guests, scanner, reports and event settings."
                />
                <InfoCard
                    title="Registration Staff"
                    text="Can manage guest registrations and support QR scanning."
                />
                <InfoCard
                    title="Check-in Staff"
                    text="Only has access to event-day QR scanning."
                />
                <InfoCard
                    title="Viewer"
                    text="Can only view reports and information without making changes."
                />
            </div>
        </div>
    );
}

function InfoCard({ title, text }: { title: string; text: string }) {
    return (
        <div className="rounded-2xl bg-[#F7F5FF] p-5">
            <h3 className="font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </div>
    );
}

function getRoleDescription(role: string) {
    const lower = role.toLowerCase();

    if (lower.includes("super")) return "Full platform access";
    if (lower.includes("event")) return "Manages event operations";
    if (lower.includes("registration")) return "Handles registrations";
    if (lower.includes("check")) return "Event-day check-in access";
    if (lower.includes("viewer")) return "Read-only access";

    return "Custom role";
}
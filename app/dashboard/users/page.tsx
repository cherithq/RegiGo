"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Users,
    ShieldCheck,
    Mail,
    Lock,
    UserPlus,
    CalendarDays,
} from "lucide-react";

type Role = "admin" | "organizer" | "viewer" | "scanner";

type Profile = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: Role;
};

type Event = {
    id: string;
    event_name: string;
    event_date: string | null;
};

export default function UsersPermissionsPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState("");

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<Role>("organizer");
    const [eventId, setEventId] = useState("");
    const [eventRole, setEventRole] = useState<Exclude<Role, "admin">>(
        "organizer"
    );

    useEffect(() => {
        loadPageData();
    }, []);

    async function loadPageData() {
        setLoading(true);
        setMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            window.location.href = "/auth/login";
            return;
        }

        const { data: currentProfile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", user.id)
            .single();

        if (profileError || !currentProfile) {
            setMessage("Unable to load your profile.");
            setLoading(false);
            return;
        }

        setProfile(currentProfile as Profile);

        if (currentProfile.role !== "admin") {
            setLoading(false);
            return;
        }

        const { data: eventData, error: eventError } = await supabase
            .from("events")
            .select("id, event_name, event_date")
            .order("created_at", { ascending: false });

        if (eventError) {
            console.error("Failed to load events:", eventError);
            setMessage(`Failed to load events: ${eventError.message}`);
        }

        const { data: userData, error: usersError } = await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .order("created_at", { ascending: false });

        if (usersError) {
            console.error("Failed to load users:", usersError);
            setMessage(`Failed to load users: ${usersError.message}`);
        }

        setEvents((eventData || []) as Event[]);
        setUsers((userData || []) as Profile[]);
        setLoading(false);
    }

    async function createUser(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const cleanFullName = fullName.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanFullName || !cleanEmail || !password || !role) {
            setMessage("Please fill in all required fields.");
            return;
        }

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters.");
            return;
        }

        if (role !== "admin" && !eventId) {
            setMessage("Please assign this user to an event.");
            return;
        }

        setCreating(true);

        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session?.access_token) {
                setMessage("Login session not found. Please log out and log in again.");
                return;
            }

            const res = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    fullName: cleanFullName,
                    email: cleanEmail,
                    password,
                    role,
                    eventId: role === "admin" ? null : eventId,
                    eventRole: role === "admin" ? null : eventRole,
                }),
            });

            const responseText = await res.text();

            let result: { error?: string; message?: string; success?: boolean } = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                result = {
                    error: responseText || "API did not return JSON.",
                };
            }

            if (!res.ok) {
                setMessage(result.error || "Failed to create user.");
                return;
            }

            setMessage(result.message || "User created successfully.");

            setFullName("");
            setEmail("");
            setPassword("");
            setRole("organizer");
            setEventId("");
            setEventRole("organizer");

            await loadPageData();
        } catch (error) {
            console.error("Create user frontend error:", error);
            setMessage("Something went wrong while creating the user.");
        } finally {
            setCreating(false);
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <p className="text-slate-500">Loading users and permissions...</p>
            </div>
        );
    }

    if (profile?.role !== "admin") {
        return (
            <div className="p-8">
                <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
                    <h1 className="text-2xl font-black text-red-700">Access denied</h1>
                    <p className="mt-2 text-red-600">
                        Only admin accounts can access Users & Permissions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8">
            <div>
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">
                            Users & Permissions
                        </h1>
                        <p className="mt-1 text-slate-500">
                            Create accounts and assign users to specific events.
                        </p>
                    </div>
                </div>
            </div>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
                    {message}
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
                <form
                    onSubmit={createUser}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-2xl bg-indigo-50 p-3 text-[#4F46E5]">
                            <UserPlus size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">
                                Create New User
                            </h2>
                            <p className="text-sm text-slate-500">
                                Admin can create users for each event.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-700">
                                Full Name
                            </label>
                            <input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                placeholder="Client User"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-700">
                                Email
                            </label>
                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-[#4F46E5]"
                                    placeholder="user@email.com"
                                    type="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-700">
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-[#4F46E5]"
                                    placeholder="Temporary password"
                                    type="password"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-slate-700">
                                System Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as Role)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                            >
                                <option value="admin">Admin - full access</option>
                                <option value="organizer">
                                    Organizer - manage assigned event
                                </option>
                                <option value="viewer">Viewer - read-only event access</option>
                                <option value="scanner">Scanner - QR check-in only</option>
                            </select>
                        </div>

                        {role !== "admin" && (
                            <>
                                <div>
                                    <label className="mb-1 block text-sm font-bold text-slate-700">
                                        Assign Event
                                    </label>
                                    <select
                                        value={eventId}
                                        onChange={(e) => setEventId(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                    >
                                        <option value="">Select an event</option>
                                        {events.map((event) => (
                                            <option key={event.id} value={event.id}>
                                                {event.event_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-bold text-slate-700">
                                        Event Permission
                                    </label>
                                    <select
                                        value={eventRole}
                                        onChange={(e) =>
                                            setEventRole(e.target.value as Exclude<Role, "admin">)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                    >
                                        <option value="organizer">Organizer</option>
                                        <option value="viewer">Viewer</option>
                                        <option value="scanner">Scanner</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {creating ? "Creating..." : "Create User"}
                        </button>
                    </div>
                </form>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-2xl bg-pink-50 p-3 text-[#EC4899]">
                            <Users size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">
                                Existing Users
                            </h2>
                            <p className="text-sm text-slate-500">
                                Current registered accounts in the system.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        {users.length === 0 ? (
                            <div className="p-6 text-sm text-slate-500">No users found.</div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0"
                                >
                                    <div>
                                        <p className="font-black text-slate-900">
                                            {user.full_name || "Unnamed User"}
                                        </p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>

                                    <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-black capitalize text-[#4F46E5]">
                                        {user.role}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                        <div className="flex gap-3">
                            <CalendarDays className="mt-1 text-slate-400" size={18} />
                            <p className="text-sm text-slate-500">
                                Normal users must be assigned to an event. Admin users can
                                access every event and all dashboard features.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
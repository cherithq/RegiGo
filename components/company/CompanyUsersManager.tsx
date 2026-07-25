"use client";

import {
    Building2,
    CalendarDays,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import CreateCompanyModal from "@/components/company/CreateCompanyModal";

type UserRole = "admin" | "organizer" | "viewer" | "scanner";

type EventRow = {
    id: string;
    event_name: string;
    event_date: string | null;
};

type UserRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    company_id: string;
    platform_role: string | null;
    membershipStatus: "active" | "invited" | "suspended";
    companyRole: string;
    eventIds: string[];
};

type Company = {
    id: string;
    company_name: string;
    company_slug: string | null;
    status: string | null;
    events: EventRow[];
    users: UserRow[];
};

type Payload = {
    isPlatformAdmin: boolean;
    currentUserId: string;
    companies: Company[];
};

type EditState = {
    fullName: string;
    role: UserRole;
    status:
        | "active"
        | "invited"
        | "suspended";
    eventIds: string[];
    newPassword: string;
};

const roles: {
    value: UserRole;
    label: string;
}[] = [
    {
        value: "admin",
        label:
            "Company Admin",
    },
    {
        value:
            "organizer",
        label:
            "Organizer",
    },
    {
        value: "viewer",
        label: "Viewer",
    },
    {
        value: "scanner",
        label: "Scanner",
    },
];

function generatePassword() {
    const lowercase =
        "abcdefghijkmnopqrstuvwxyz";
    const uppercase =
        "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const numbers =
        "23456789";
    const symbols =
        "!@#$%&*?";
    const all =
        lowercase +
        uppercase +
        numbers +
        symbols;

    const randomIndex = (
        length: number,
    ) => {
        const values =
            new Uint32Array(1);

        window.crypto
            .getRandomValues(
                values,
            );

        return (
            values[0] %
            length
        );
    };

    const output = [
        lowercase[
            randomIndex(
                lowercase.length,
            )
        ],
        uppercase[
            randomIndex(
                uppercase.length,
            )
        ],
        numbers[
            randomIndex(
                numbers.length,
            )
        ],
        symbols[
            randomIndex(
                symbols.length,
            )
        ],
    ];

    while (
        output.length <
        14
    ) {
        output.push(
            all[
                randomIndex(
                    all.length,
                )
            ],
        );
    }

    for (
        let index =
            output.length - 1;
        index > 0;
        index -= 1
    ) {
        const target =
            randomIndex(
                index + 1,
            );

        [
            output[index],
            output[target],
        ] = [
            output[target],
            output[index],
        ];
    }

    return output.join("");
}

async function readJson(response: Response) {
    const text = await response.text();

    if (!text.trim()) {
        return {};
    }

    const contentType =
        response.headers.get(
            "content-type",
        ) || "";

    if (
        contentType.includes(
            "application/json",
        )
    ) {
        try {
            return JSON.parse(text);
        } catch {
            return {
                error:
                    "The server returned invalid JSON.",
            };
        }
    }

    const looksLikeHtml =
        contentType.includes("text/html") ||
        /^\s*<!doctype html/i.test(text) ||
        /^\s*<html/i.test(text) ||
        text.includes(
            "/_next/static/",
        );

    if (looksLikeHtml) {
        return {
            error:
                response.status === 404
                    ? "A required RegiGo API route is missing. Copy the complete Users & Roles recovery patch and restart Next.js."
                    : `The server returned an HTML error page (HTTP ${response.status}). Check the terminal for the original server error.`,
        };
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            error:
                text.length > 500
                    ? `${text.slice(0, 500)}…`
                    : text ||
                      "Invalid server response.",
        };
    }
}

export default function CompanyUsersManager() {
    const [data, setData] = useState<Payload | null>(null);
    const [companyId, setCompanyId] = useState("");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState("");
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [edit, setEdit] = useState<EditState | null>(null);
    const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

    const [
        fullName,
        setFullName,
    ] = useState("");
    const [email, setEmail] =
        useState("");
    const [
        password,
        setPassword,
    ] = useState("");
    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState("");
    const [
        showPassword,
        setShowPassword,
    ] = useState(false);
    const [
        showEditPassword,
        setShowEditPassword,
    ] = useState(false);
    const [role, setRole] =
        useState<UserRole>(
            "organizer",
        );
    const [eventIds, setEventIds] =
        useState<string[]>([]);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/company/users", { cache: "no-store" });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to load company users.");
            const payload = result as Payload;
            setData(payload);
            setCompanyId((current) =>
                payload.companies.some((company) => company.id === current)
                    ? current
                    : payload.companies[0]?.id || "",
            );
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to load company users.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    async function handleCompanyCreated(
        createdCompany: {
            id: string;
            company_name: string;
            company_slug: string;
        },
        successMessage: string,
    ) {
        await reload();
        setCompanyId(
            createdCompany.id,
        );
        setMessage(
            successMessage,
        );
        setEventIds([]);
        setEditingUserId(null);
        setEdit(null);

        window.dispatchEvent(
            new CustomEvent(
                "regigo:companies-changed",
                {
                    detail: {
                        companyId:
                            createdCompany.id,
                    },
                },
            ),
        );
    }

    const company = data?.companies.find((item) => item.id === companyId) || null;
    const filteredUsers = useMemo(() => {
        const clean = query.trim().toLowerCase();
        return (company?.users || []).filter((user) =>
            !clean
                ? true
                : [user.full_name, user.email, user.role]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase()
                      .includes(clean),
        );
    }, [company, query]);

    function toggleEvent(id: string, current: string[], setter: (ids: string[]) => void) {
        setter(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    }

    async function createAccount(
        event: FormEvent,
    ) {
        event.preventDefault();

        if (!company) {
            return;
        }

        if (
            password !==
            confirmPassword
        ) {
            setMessage(
                "The passwords do not match.",
            );
            return;
        }

        if (
            password.length < 8
        ) {
            setMessage(
                "Password must be at least 8 characters.",
            );
            return;
        }

        setWorking("create");
        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/company/users",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                companyId:
                                    company.id,
                                fullName,
                                email,
                                password,
                                role,
                                eventIds:
                                    role ===
                                    "admin"
                                        ? []
                                        : eventIds,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to create the user account.",
                );
            }

            setFullName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setShowPassword(false);
            setRole(
                "organizer",
            );
            setEventIds([]);
            setMessage(
                result.message ||
                    "User account created.",
            );

            await reload();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to create the user account.",
            );
        } finally {
            setWorking("");
        }
    }

    function startEdit(user: UserRow) {
        setEditingUserId(user.id);
        setEdit({
            fullName: user.full_name || "",
            role: user.role,
            status: user.membershipStatus,
            eventIds: [
                ...user.eventIds,
            ],
            newPassword: "",
        });
        setShowEditPassword(
            false,
        );
        setMessage("");
    }

    async function saveEdit(user: UserRow) {
        if (!company || !edit) return;
        setWorking(`save:${user.id}`);
        setMessage("");
        try {
            const response = await fetch("/api/company/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    companyId: company.id,
                    fullName: edit.fullName,
                    role: edit.role,
                    status:
                        edit.status,
                    newPassword:
                        edit.newPassword,
                    eventIds:
                        edit.role ===
                        "admin"
                            ? []
                            : edit.eventIds,
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to update user.");
            setEditingUserId(null);
            setEdit(null);
            setMessage(result.message || "User updated.");
            await reload();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to update user.");
        } finally {
            setWorking("");
        }
    }

    async function remove(user: UserRow) {
        if (!company || !window.confirm(`Remove ${user.full_name || user.email} from ${company.company_name}?`)) {
            return;
        }
        setWorking(`remove:${user.id}`);
        setMessage("");
        try {
            const response = await fetch("/api/company/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, companyId: company.id }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to remove user.");
            setMessage(result.message || "User removed.");
            await reload();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to remove user.");
        } finally {
            setWorking("");
        }
    }

    if (loading && !data) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] bg-red-50 p-7 text-red-700">
                {message ||
                    "Unable to load companies."}
            </div>
        );
    }

    if (!company) {
        return (
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Users size={16} />
                            Users & Permissions
                        </div>

                        <h1 className="mt-5 text-4xl font-black md:text-5xl">
                            Company Users
                        </h1>

                        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                            No company exists yet.
                            Create the first company
                            together with its Company
                            Admin login.
                        </p>

                        {data.isPlatformAdmin && (
                            <button
                                type="button"
                                onClick={() =>
                                    setCreateCompanyOpen(
                                        true,
                                    )
                                }
                                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white"
                            >
                                <Plus size={18} />
                                Create Company
                            </button>
                        )}
                    </div>
                </section>

                {message && (
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">
                        {message}
                    </div>
                )}

                <CreateCompanyModal
                    open={
                        createCompanyOpen
                    }
                    onClose={() =>
                        setCreateCompanyOpen(
                            false,
                        )
                    }
                    onCreated={
                        handleCompanyCreated
                    }
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        <Users size={16} />
                        Users & Permissions
                    </div>
                    <h1 className="mt-5 text-4xl font-black md:text-5xl">Company Users</h1>
                    <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                        Every company is shown by name with the users and event assignments belonging to it.
                    </p>
                </div>
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">{message}</div>
            )}

            <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <aside className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-black">
                                Companies
                            </h2>

                            <div className="flex items-center gap-2">
                                {data.isPlatformAdmin && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCreateCompanyOpen(
                                                true,
                                            )
                                        }
                                        className="rounded-xl bg-[#4F46E5] p-3 text-white"
                                        title="Create company"
                                        aria-label="Create company"
                                    >
                                        <Plus
                                            size={16}
                                        />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        void reload()
                                    }
                                    className="rounded-xl bg-slate-100 p-3"
                                    title="Refresh companies"
                                >
                                    <RefreshCw
                                        size={16}
                                        className={
                                            loading
                                                ? "animate-spin"
                                                : ""
                                        }
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            {data.companies.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setCompanyId(
                                            item.id,
                                        );
                                        setFullName(
                                            "",
                                        );
                                        setEmail(
                                            "",
                                        );
                                        setPassword(
                                            "",
                                        );
                                        setConfirmPassword(
                                            "",
                                        );
                                        setShowPassword(
                                            false,
                                        );
                                        setEventIds([]);
                                        setEditingUserId(null);
                                        setEdit(null);
                                    }}
                                    className={`w-full rounded-2xl p-4 text-left ${item.id === company.id ? "bg-[#4F46E5] text-white" : "bg-slate-50"}`}
                                >
                                    <p className="font-black">{item.company_name}</p>
                                    <p className={`mt-1 text-xs font-bold ${item.id === company.id ? "text-white/75" : "text-slate-400"}`}>
                                        {item.users.length} users · {item.events.length} events
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form
                        onSubmit={
                            createAccount
                        }
                        className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <UserPlus className="text-[#4F46E5]" />
                            <div>
                                <h2 className="text-xl font-black">
                                    Create User Account
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {
                                        company.company_name
                                    }
                                </p>
                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                    The administrator creates the email and password.
                                    The account becomes active immediately and no
                                    invitation email is sent.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 space-y-4">
                            <Field
                                label="Full name"
                                value={
                                    fullName
                                }
                                onChange={
                                    setFullName
                                }
                                placeholder="Staff member"
                            />

                            <Field
                                label="Email"
                                value={
                                    email
                                }
                                onChange={
                                    setEmail
                                }
                                placeholder="staff@company.com"
                                type="email"
                            />

                            <label className="block">
                                <span className="mb-2 block text-sm font-black text-slate-700">
                                    Password
                                </span>

                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <KeyRound
                                            size={17}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={
                                                password
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setPassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                            placeholder="At least 8 characters"
                                            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-12"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (
                                                        current,
                                                    ) =>
                                                        !current,
                                                )
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400"
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff
                                                    size={
                                                        17
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        17
                                                    }
                                                />
                                            )}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const generated =
                                                generatePassword();

                                            setPassword(
                                                generated,
                                            );
                                            setConfirmPassword(
                                                generated,
                                            );
                                            setShowPassword(
                                                true,
                                            );
                                        }}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700"
                                    >
                                        <RefreshCw
                                            size={
                                                15
                                            }
                                        />
                                        Generate password
                                    </button>
                                </div>
                            </label>

                            <Field
                                label="Confirm password"
                                value={
                                    confirmPassword
                                }
                                onChange={
                                    setConfirmPassword
                                }
                                placeholder="Enter the same password again"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                            />

                            <div>
                                <label className="mb-2 block text-sm font-black text-slate-700">Role</label>
                                <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                                    {roles.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                            {role !== "admin" && (
                                <EventPicker events={company.events} selected={eventIds} onToggle={(id) => toggleEvent(id, eventIds, setEventIds)} />
                            )}
                            <button
                                type="submit"
                                disabled={
                                    working ===
                                        "create" ||
                                    !fullName.trim() ||
                                    !email.trim() ||
                                    password.length <
                                        8 ||
                                    password !==
                                        confirmPassword
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white disabled:opacity-50"
                            >
                                {working ===
                                "create" ? (
                                    <Loader2
                                        size={
                                            17
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <UserPlus
                                        size={
                                            17
                                        }
                                    />
                                )}
                                Create User Account
                            </button>
                        </div>
                    </form>
                </aside>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-[#4F46E5]">{company.company_name}</p>
                            <h2 className="mt-1 text-2xl font-black">{company.users.length} Users</h2>
                        </div>
                        <label className="relative block sm:w-80">
                            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4" />
                        </label>
                    </div>

                    <div className="mt-6 space-y-4">
                        {filteredUsers.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">No users found for this company.</div>
                        ) : (
                            filteredUsers.map((user) => {
                                const isEditing = editingUserId === user.id && edit;
                                return (
                                    <article key={user.id} className="rounded-3xl border border-slate-200 p-5">
                                        {!isEditing ? (
                                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg font-black">{user.full_name || "Unnamed user"}</h3>
                                                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black capitalize text-[#4F46E5]">{user.role}</span>
                                                        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${user.membershipStatus === "active" ? "bg-emerald-50 text-emerald-700" : user.membershipStatus === "suspended" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                                                            {user.membershipStatus}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                                                    <p className="mt-3 text-xs font-bold text-slate-400">
                                                        {user.role === "admin"
                                                            ? "All company events"
                                                            : user.eventIds.length
                                                              ? company.events.filter((event) => user.eventIds.includes(event.id)).map((event) => event.event_name).join(", ")
                                                              : "No event assignments"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => startEdit(user)} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black">
                                                        <Pencil size={15} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={user.id === data.currentUserId || working === `remove:${user.id}`}
                                                        onClick={() => void remove(user)}
                                                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 disabled:opacity-40"
                                                    >
                                                        {working === `remove:${user.id}` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-3">
                                                    <Field label="Full name" value={edit.fullName} onChange={(value) => setEdit({ ...edit, fullName: value })} placeholder="Name" />
                                                    <div>
                                                        <label className="mb-2 block text-sm font-black text-slate-700">Role</label>
                                                        <select value={edit.role} onChange={(event) => setEdit({ ...edit, role: event.target.value as UserRole, eventIds: event.target.value === "admin" ? [] : edit.eventIds })} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                                                            {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-sm font-black text-slate-700">Status</label>
                                                        <select value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as EditState["status"] })} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                                                            <option value="active">Active</option>
                                                            <option value="suspended">Suspended</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <label className="block">
                                                    <span className="mb-2 block text-sm font-black text-slate-700">
                                                        Set new password
                                                        <span className="ml-1 font-medium text-slate-400">
                                                            (optional)
                                                        </span>
                                                    </span>

                                                    <div className="relative">
                                                        <KeyRound
                                                            size={17}
                                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                        />

                                                        <input
                                                            type={
                                                                showEditPassword
                                                                    ? "text"
                                                                    : "password"
                                                            }
                                                            value={
                                                                edit.newPassword
                                                            }
                                                            onChange={(event) =>
                                                                setEdit({
                                                                    ...edit,
                                                                    newPassword:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                })
                                                            }
                                                            minLength={8}
                                                            autoComplete="new-password"
                                                            placeholder="Leave blank to keep the current password"
                                                            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-12"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setShowEditPassword(
                                                                    (
                                                                        current,
                                                                    ) =>
                                                                        !current,
                                                                )
                                                            }
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400"
                                                        >
                                                            {showEditPassword ? (
                                                                <EyeOff
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            ) : (
                                                                <Eye
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            )}
                                                        </button>
                                                    </div>
                                                </label>

                                                {edit.role !== "admin" && (
                                                    <EventPicker events={company.events} selected={edit.eventIds} onToggle={(id) => toggleEvent(id, edit.eventIds, (next) => setEdit({ ...edit, eventIds: next }))} />
                                                )}
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" onClick={() => { setEditingUserId(null); setEdit(null); }} className="rounded-xl bg-slate-100 p-3"><X size={17} /></button>
                                                    <button type="button" onClick={() => void saveEdit(user)} disabled={working === `save:${user.id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-3 font-black text-white disabled:opacity-50">
                                                        {working === `save:${user.id}` ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })
                        )}
                    </div>
                </section>
            </section>

            <CreateCompanyModal
                open={
                    createCompanyOpen
                }
                onClose={() =>
                    setCreateCompanyOpen(
                        false,
                    )
                }
                onCreated={
                    handleCompanyCreated
                }
            />
        </div>
    );
}

function EventPicker({ events, selected, onToggle }: { events: EventRow[]; selected: string[]; onToggle: (id: string) => void }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">Assigned events</label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                {events.length === 0 ? (
                    <p className="p-3 text-sm font-bold text-slate-400">No events exist for this company.</p>
                ) : (
                    events.map((event) => (
                        <label key={event.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                            <input type="checkbox" checked={selected.includes(event.id)} onChange={() => onToggle(event.id)} className="mt-1 accent-[#4F46E5]" />
                            <span>
                                <strong className="block">{event.event_name}</strong>
                                <span className="text-xs text-slate-400">{event.event_date || "No date"}</span>
                            </span>
                        </label>
                    ))
                )}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]" />
        </div>
    );
}

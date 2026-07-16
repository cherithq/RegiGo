"use client";

import { useMemo, useState } from "react";
import {
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Globe2,
    Loader2,
    LockKeyhole,
    Mail,
    QrCode,
    Settings2,
    Table2,
    UsersRound,
    Mic2,
    Gift,
    Gamepad2,
    Map,
    ListTodo,
    Palette,
    Ticket,
} from "lucide-react";
import {
    defaultOrganizerEnabledModules,
    type EventModuleKey,
} from "@/lib/event-modules";

type EventRecord = {
    id: string;
    event_name?: string;
    title?: string;
    name?: string;
    [key: string]: any;
};

type EventSettings = {
    id?: string;
    event_id?: string;
    enabled_modules?: Record<string, boolean> | null;
    registration_is_open?: boolean | null;
    registration_closed_message?: string | null;
    [key: string]: any;
};

type ModuleConfig = {
    key: EventModuleKey;
    title: string;
    description: string;
    icon: React.ReactNode;
    locked?: boolean;
};

const modules: ModuleConfig[] = [
    {
        key: "overview",
        title: "Event Overview",
        description: "Main event dashboard and event summary.",
        icon: <CalendarDays size={20} />,
        locked: true,
    },
    {
        key: "guests",
        title: "Guest List",
        description: "Allow organisers to view, add, edit, and manage guests.",
        icon: <UsersRound size={20} />,
    },
    {
        key: "tickets",
        title: "Ticket Types",
        description: "Allow organisers to manage ticket types.",
        icon: <Ticket size={20} />,
    },
    {
        key: "tables",
        title: "Tables",
        description: "Allow organisers to manage event tables.",
        icon: <Table2 size={20} />,
    },
    {
        key: "floor_plan",
        title: "Floor Plan",
        description: "Allow organisers to manage the event floor plan.",
        icon: <Map size={20} />,
    },
    {
        key: "speakers",
        title: "Speakers",
        description: "Allow organisers to manage speakers.",
        icon: <Mic2 size={20} />,
    },
    {
        key: "agenda",
        title: "Agenda",
        description: "Allow organisers to manage the event agenda.",
        icon: <ListTodo size={20} />,
    },
    {
        key: "scanner",
        title: "QR Scanner",
        description: "Allow organisers to scan QR passes and check in guests.",
        icon: <QrCode size={20} />,
    },
    {
        key: "lucky_draw",
        title: "Lucky Draw",
        description: "Allow organisers to run lucky draw features.",
        icon: <Gift size={20} />,
    },
    {
        key: "glitter_games",
        title: "Games Dashboard",
        description: "Enable the admin-only Games management dashboard.",
        icon: <Gamepad2 size={20} />,
    },
    {
        key: "analytics",
        title: "Analytics",
        description: "Allow organisers to view event analytics.",
        icon: <BarChart3 size={20} />,
    },
    {
        key: "registration",
        title: "Registration Builder",
        description: "Allow organisers to build and edit the registration form.",
        icon: <ClipboardList size={20} />,
    },
    {
        key: "website",
        title: "Website Builder",
        description: "Allow organisers to edit the public event website.",
        icon: <Globe2 size={20} />,
    },
    {
        key: "branding",
        title: "Branding",
        description: "Allow organisers to edit event branding.",
        icon: <Palette size={20} />,
    },
    {
        key: "emails",
        title: "Email Centre",
        description: "Allow organisers to manage email templates and event emails.",
        icon: <Mail size={20} />,
    },
    {
        key: "settings",
        title: "Event Settings / Registration Status",
        description: "Allow organisers to open or close the registration page.",
        icon: <Settings2 size={20} />,
        locked: true,
    },
    {
        key: "lucky_draw_settings",
        title: "Lucky Draw Settings",
        description: "Allow organisers to configure lucky draw settings.",
        icon: <Settings2 size={20} />,
    },
];

const defaultClosedMessage = "Registration for this event is currently closed.";

export default function EventSettingsForm({
    event,
    settings,
    canManageModules,
}: {
    event: EventRecord;
    settings: EventSettings | null;
    canManageModules: boolean;
}) {
    const initialModules = useMemo(() => {
        return {
            ...defaultOrganizerEnabledModules,
            ...(settings?.enabled_modules ?? {}),
            overview: true,
            settings: true,
        };
    }, [settings]);

    const [enabledModules, setEnabledModules] =
        useState<Record<EventModuleKey, boolean>>(initialModules);

    const [registrationIsOpen, setRegistrationIsOpen] = useState(
        settings?.registration_is_open !== false,
    );

    const [registrationClosedMessage, setRegistrationClosedMessage] = useState(
        settings?.registration_closed_message || defaultClosedMessage,
    );

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    async function saveSettings(nextValues?: {
        enabled_modules?: Record<EventModuleKey, boolean>;
        registration_is_open?: boolean;
        registration_closed_message?: string;
    }) {
        setSaving(true);
        setSaved(false);
        setError("");

        const payload = {
            enabled_modules: nextValues?.enabled_modules ?? enabledModules,
            registration_is_open:
                nextValues?.registration_is_open ?? registrationIsOpen,
            registration_closed_message:
                nextValues?.registration_closed_message ??
                registrationClosedMessage,
        };

        try {
            const response = await fetch(
                `/api/events/${event.id}/settings/modules`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );

            const responseText = await response.text();
            let result: any = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `Settings route returned ${response.status} instead of JSON. Check app/api/events/[eventId]/settings/modules/route.ts.`,
                );
            }

            if (!response.ok) {
                throw new Error(result.error || "Failed to save settings.");
            }

            if (result.settings?.enabled_modules) {
                setEnabledModules({
                    ...defaultOrganizerEnabledModules,
                    ...result.settings.enabled_modules,
                    overview: true,
                    settings: true,
                });
            }

            if (typeof result.settings?.registration_is_open === "boolean") {
                setRegistrationIsOpen(result.settings.registration_is_open);
            }

            if (typeof result.settings?.registration_closed_message === "string") {
                setRegistrationClosedMessage(
                    result.settings.registration_closed_message,
                );
            }

            setSaved(true);
            return true;
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save event settings.",
            );
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function toggleRegistrationOpen() {
        if (saving) return;

        const previousOpen = registrationIsOpen;
        const nextOpen = !previousOpen;

        setRegistrationIsOpen(nextOpen);

        const savedSuccessfully = await saveSettings({
            registration_is_open: nextOpen,
        });

        if (!savedSuccessfully) {
            setRegistrationIsOpen(previousOpen);
        }
    }

    async function toggleModule(key: EventModuleKey) {
        if (!canManageModules) return;

        const module = modules.find((item) => item.key === key);
        if (module?.locked) return;

        const nextModules = {
            ...enabledModules,
            [key]: !enabledModules[key],
            overview: true,
            settings: true,
        };

        const previousModules = enabledModules;

        setEnabledModules(nextModules);

        const savedSuccessfully = await saveSettings({
            enabled_modules: nextModules,
        });

        if (!savedSuccessfully) {
            setEnabledModules(previousModules);
        }
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-black text-red-700">
                    {error}
                </div>
            )}

            {saved && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
                    Settings saved successfully.
                </div>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-950">
                        Registration Page Status
                    </h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                        Open or close the public registration page for this event.
                        Admins and organisers can still access the dashboard.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void toggleRegistrationOpen()}
                    disabled={saving}
                    className={`mt-6 flex w-full items-center justify-between gap-5 rounded-[1.5rem] border p-5 text-left transition ${registrationIsOpen
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                        }`}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${registrationIsOpen
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                        >
                            <LockKeyhole size={22} />
                        </div>

                        <div>
                            <h3 className="text-lg font-black text-slate-950">
                                {registrationIsOpen
                                    ? "Registration Page Open"
                                    : "Registration Page Closed"}
                            </h3>
                            <p className="mt-1 text-sm font-bold text-slate-500">
                                {registrationIsOpen
                                    ? "Guests can access and submit the public registration form."
                                    : "Guests will see the closed registration message."}
                            </p>
                        </div>
                    </div>

                    <div
                        className={`relative h-8 w-14 shrink-0 rounded-full transition ${registrationIsOpen ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                    >
                        <div
                            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${registrationIsOpen ? "left-7" : "left-1"
                                }`}
                        />
                    </div>
                </button>

                {!registrationIsOpen && (
                    <div className="mt-5">
                        <label className="block text-sm font-black text-slate-700">
                            Closed Registration Message
                        </label>
                        <textarea
                            value={registrationClosedMessage}
                            onChange={(event) => {
                                setRegistrationClosedMessage(event.target.value);
                                setSaved(false);
                            }}
                            rows={3}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                        <button
                            type="button"
                            onClick={() => saveSettings()}
                            disabled={saving}
                            className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] disabled:opacity-60"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            Save Closed Message
                        </button>
                    </div>
                )}
            </section>

            {canManageModules && (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">
                            Event Module Visibility
                        </h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                            Choose which event tools are enabled. The Games dashboard is admin-only.                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {modules.map((module) => {
                            const enabled = enabledModules[module.key];

                            return (
                                <button
                                    key={module.key}
                                    type="button"
                                    role="switch"
                                    aria-checked={enabled}
                                    aria-label={`${module.title}: ${enabled ? "enabled" : "disabled"}`}
                                    onClick={() => void toggleModule(module.key)}
                                    disabled={module.locked || saving}
                                    className="group flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#4F46E5]/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <div className="flex min-w-0 items-start gap-4">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${enabled
                                                    ? "bg-[#EEF2FF] text-[#4F46E5]"
                                                    : "bg-slate-100 text-slate-400"
                                                }`}
                                        >
                                            {module.icon}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-950">
                                                    {module.title}
                                                </h3>
                                                {module.locked && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                        Required
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                                                {module.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-[#4F46E5]" : "bg-slate-300"
                                            }`}
                                    >
                                        <div
                                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"
                                                }`}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => saveSettings()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    Save All Settings
                </button>
            </div>
        </div>
    );
}

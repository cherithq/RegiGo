"use client";

import {
    BadgeCheck,
    CalendarDays,
    Check,
    Clock3,
    CreditCard,
    FileText,
    Globe2,
    Loader2,
    Lock,
    MailCheck,
    MapPin,
    Printer,
    Puzzle,
    RefreshCw,
    Save,
    Send,
    Settings2,
    SlidersHorizontal,
    TableProperties,
    UserPlus,
    Users,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import type {
    CompanyModuleKey,
    ModuleDefinition,
} from "@/lib/company-modules";

type Addon = {
    key: string;
    moduleKey:
        CompanyModuleKey;
    name: string;
    description: string;
    route: string;
    allowed: boolean;
    enabled: boolean;
    updatedAt:
        | string
        | null;
};

type RegistrationMode =
    | "public_registration"
    | "invitation_only";

type Payload = {
    event: {
        id: string;
        company_id: string;
        event_name: string;
        event_slug: string;
        event_date:
            | string
            | null;
        event_time:
            | string
            | null;
        venue:
            | string
            | null;
        description:
            | string
            | null;
        status: string;
        max_guests:
            | number
            | null;
        enable_ticket_types: boolean;
    };
    settings: {
        enabled_modules:
            Record<
                CompanyModuleKey,
                boolean
            >;
        registration_mode:
            RegistrationMode;
        registration_is_open:
            boolean;
        registration_closed_message:
            string;
    };
    companyModules:
        Record<
            CompanyModuleKey,
            boolean
        >;
    moduleCatalog:
        ModuleDefinition[];
    addons: Addon[];
    access: {
        isPlatformAdmin:
            boolean;
        canManageSettings:
            boolean;
        canManageAddons:
            boolean;
    };
};

const addonIcons: Record<
    string,
    typeof Puzzle
> = {
    guest_invitations:
        MailCheck,
    stripe_payments:
        CreditCard,
    guest_table_selection:
        TableProperties,
    badge_designer:
        BadgeCheck,
    direct_printing:
        Printer,
};

const hiddenModuleKeys =
    new Set<
        CompanyModuleKey
    >([
        "addons",
        "settings",
        "invitations",
        "payments",
        "table_selection",
        "badges",
        "direct_printing",
    ]);

async function readJson(
    response: Response,
) {
    const raw =
        await response.text();

    if (!raw.trim()) {
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
            return JSON.parse(raw);
        } catch {
            return {
                error:
                    "The event settings API returned invalid JSON.",
            };
        }
    }

    const html =
        contentType.includes(
            "text/html",
        ) ||
        /^\s*<!doctype html/i.test(
            raw,
        ) ||
        raw.includes(
            "/_next/static/",
        );

    if (html) {
        return {
            error:
                response.status ===
                404
                    ? "The Settings & Add-ons API route is missing. Copy the complete Event Workspace Recovery patch and restart Next.js."
                    : `The server returned an HTML error page (HTTP ${response.status}). Check the Next.js terminal for the original error.`,
        };
    }

    try {
        return JSON.parse(raw);
    } catch {
        return {
            error:
                raw.length > 500
                    ? `${raw.slice(
                          0,
                          500,
                      )}…`
                    : raw ||
                      "Unable to read the event settings response.",
        };
    }
}

function slugify(
    value: string,
) {
    return value
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(
            /[^a-z0-9]+/g,
            "-",
        )
        .replace(
            /^-+|-+$/g,
            "",
        )
        .slice(0, 100);
}

export default function EventConfigurationManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(
            null,
        );
    const [loading, setLoading] =
        useState(true);
    const [saving, setSaving] =
        useState(false);
    const [message, setMessage] =
        useState("");
    const [saved, setSaved] =
        useState(false);

    const [eventName, setEventName] =
        useState("");
    const [eventSlug, setEventSlug] =
        useState("");
    const [eventDate, setEventDate] =
        useState("");
    const [eventTime, setEventTime] =
        useState("");
    const [venue, setVenue] =
        useState("");
    const [description, setDescription] =
        useState("");
    const [status, setStatus] =
        useState<
            "draft" | "published"
        >("draft");
    const [maxGuests, setMaxGuests] =
        useState("");
    const [
        enableTicketTypes,
        setEnableTicketTypes,
    ] = useState(true);
    const [
        registrationMode,
        setRegistrationMode,
    ] = useState<RegistrationMode>(
        "public_registration",
    );
    const [
        registrationOpen,
        setRegistrationOpen,
    ] = useState(true);
    const [
        registrationClosedMessage,
        setRegistrationClosedMessage,
    ] = useState("");
    const [
        enabledModules,
        setEnabledModules,
    ] = useState<
        Record<
            CompanyModuleKey,
            boolean
        > | null
    >(null);
    const [addons, setAddons] =
        useState<
            Record<string, boolean>
        >({});
    const [activeTab, setActiveTab] =
        useState<
            | "event-details"
            | "registration"
            | "modules"
            | "addons"
        >("event-details");

    function hydrate(
        payload: Payload,
    ) {
        setData(payload);
        setEventName(
            payload.event
                .event_name ||
                "",
        );
        setEventSlug(
            payload.event
                .event_slug ||
                "",
        );
        setEventDate(
            payload.event
                .event_date
                ? String(
                      payload.event
                          .event_date,
                  ).slice(
                      0,
                      10,
                  )
                : "",
        );
        setEventTime(
            payload.event
                .event_time
                ? String(
                      payload.event
                          .event_time,
                  ).slice(
                      0,
                      5,
                  )
                : "",
        );
        setVenue(
            payload.event
                .venue ||
                "",
        );
        setDescription(
            payload.event
                .description ||
                "",
        );
        setStatus(
            payload.event
                .status ===
                "published"
                ? "published"
                : "draft",
        );
        setMaxGuests(
            payload.event
                .max_guests ==
            null
                ? ""
                : String(
                      payload.event
                          .max_guests,
                  ),
        );
        setEnableTicketTypes(
            payload.event
                .enable_ticket_types !==
                false,
        );
        setRegistrationMode(
            payload.settings
                .registration_mode ===
                "invitation_only"
                ? "invitation_only"
                : "public_registration",
        );
        setRegistrationOpen(
            payload.settings
                .registration_is_open !==
                false,
        );
        setRegistrationClosedMessage(
            payload.settings
                .registration_closed_message ||
                "Registration for this event is currently closed.",
        );
        setEnabledModules({
            ...payload
                .settings
                .enabled_modules,
        });
        setAddons(
            Object.fromEntries(
                payload.addons.map(
                    (addon) => [
                        addon.key,
                        addon.enabled,
                    ],
                ),
            ),
        );
    }

    const reload =
        useCallback(async () => {
            setLoading(true);
            setSaved(false);

            try {
                const response =
                    await fetch(
                        `/api/events/${eventId}/configuration`,
                        {
                            cache:
                                "no-store",
                        },
                    );
                const result =
                    await readJson(
                        response,
                    );

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                            "Unable to load event settings.",
                    );
                }

                hydrate(
                    result as Payload,
                );
                setMessage("");
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load event settings.",
                );
            } finally {
                setLoading(false);
            }
        }, [eventId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const groupedModules =
        useMemo(() => {
            const groups =
                new Map<
                    string,
                    ModuleDefinition[]
                >();

            for (const moduleItem of
                data?.moduleCatalog ||
                []) {
                if (
                    hiddenModuleKeys.has(
                        moduleItem.key,
                    )
                ) {
                    continue;
                }

                groups.set(
                    moduleItem.group,
                    [
                        ...(groups.get(
                            moduleItem.group,
                        ) || []),
                        moduleItem,
                    ],
                );
            }

            return Array.from(
                groups.entries(),
            );
        }, [data]);

    function markChanged() {
        setSaved(false);
        setMessage("");
    }

    function toggleModule(
        key: CompanyModuleKey,
    ) {
        if (
            !data
                ?.access
                .canManageSettings ||
            data.companyModules[
                key
            ] === false ||
            !enabledModules
        ) {
            return;
        }

        setEnabledModules({
            ...enabledModules,
            [key]:
                enabledModules[
                    key
                ] === false,
        });
        markChanged();
    }

    function toggleAddon(
        addon: Addon,
    ) {
        if (
            addon.key ===
            "guest_invitations"
        ) {
            return;
        }

        if (
            !data
                ?.access
                .canManageAddons ||
            (!addon.allowed &&
                !addon.enabled)
        ) {
            return;
        }

        setAddons(
            (current) => ({
                ...current,
                [addon.key]:
                    !current[
                        addon.key
                    ],
            }),
        );
        markChanged();
    }

    function chooseRegistrationMode(
        mode: RegistrationMode,
    ) {
        if (
            !data?.access
                .canManageSettings ||
            !enabledModules
        ) {
            return;
        }

        const invitationsAddon =
            data.addons.find(
                (addon) =>
                    addon.key ===
                    "guest_invitations",
            );

        if (
            mode ===
                "invitation_only" &&
            invitationsAddon &&
            !invitationsAddon.allowed
        ) {
            setMessage(
                "Guest Invitations & RSVP is disabled for this event company.",
            );
            return;
        }

        setRegistrationMode(
            mode,
        );

        if (
            mode ===
            "invitation_only"
        ) {
            setRegistrationOpen(
                false,
            );
            setAddons(
                (current) => ({
                    ...current,
                    guest_invitations:
                        true,
                }),
            );
            setEnabledModules({
                ...enabledModules,
                invitations:
                    true,
            });
        } else {
            setRegistrationOpen(
                true,
            );
            setAddons(
                (current) => ({
                    ...current,
                    guest_invitations:
                        false,
                }),
            );
            setEnabledModules({
                ...enabledModules,
                invitations:
                    false,
            });
        }

        markChanged();
    }

    async function save() {
        if (
            !data ||
            !enabledModules
        ) {
            return;
        }

        setSaving(true);
        setSaved(false);
        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/configuration`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                event: {
                                    eventName,
                                    eventSlug:
                                        slugify(
                                            eventSlug ||
                                                eventName,
                                        ),
                                    eventDate,
                                    eventTime,
                                    venue,
                                    description,
                                    status,
                                    maxGuests:
                                        maxGuests
                                            ? Number(
                                                  maxGuests,
                                              )
                                            : null,
                                    enableTicketTypes,
                                },
                                registration: {
                                    mode:
                                        registrationMode,
                                    isOpen:
                                        registrationMode ===
                                            "public_registration" &&
                                        registrationOpen,
                                    closedMessage:
                                        registrationClosedMessage,
                                },
                                enabledModules: {
                                    ...enabledModules,
                                    invitations:
                                        registrationMode ===
                                        "invitation_only",
                                },
                                addons: {
                                    ...addons,
                                    guest_invitations:
                                        registrationMode ===
                                        "invitation_only",
                                },
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
                        "Unable to save event settings.",
                );
            }

            hydrate(
                result as Payload,
            );
            setSaved(true);
            setMessage(
                result.message ||
                    "Event settings and add-ons saved.",
            );

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:modules-changed",
                    {
                        detail: {
                            eventId,
                        },
                    },
                ),
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to save event settings.",
            );
        } finally {
            setSaving(false);
        }
    }

    if (
        loading &&
        !data
    ) {
        return (
            <div className="flex min-h-[520px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (
        !data ||
        !enabledModules
    ) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-7">
                <p className="font-black text-red-700">
                    Settings & Add-ons could not be loaded.
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
                    {message}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            {message && (
                <div
                    className={`rounded-2xl border px-5 py-4 text-sm font-bold leading-6 ${
                        saved
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-700"
                    }`}
                >
                    {message}
                </div>
            )}

            <nav className="flex flex-wrap gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
                <TabButton
                    active={
                        activeTab ===
                        "event-details"
                    }
                    label="Event Details"
                    onClick={() =>
                        setActiveTab(
                            "event-details",
                        )
                    }
                />
                <TabButton
                    active={
                        activeTab ===
                        "registration"
                    }
                    label="Registration"
                    onClick={() =>
                        setActiveTab(
                            "registration",
                        )
                    }
                />
                <TabButton
                    active={
                        activeTab ===
                        "modules"
                    }
                    label="Modules"
                    onClick={() =>
                        setActiveTab(
                            "modules",
                        )
                    }
                />
                <TabButton
                    active={
                        activeTab ===
                        "addons"
                    }
                    label="Add-ons"
                    onClick={() =>
                        setActiveTab(
                            "addons",
                        )
                    }
                />
            </nav>

            {activeTab === "event-details" && (
            <section
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <SlidersHorizontal className="text-[#4F46E5]" />
                        <div>
                            <h2 className="text-2xl font-black">
                                Event Details
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Update the event identity and publishing details.
                            </p>
                        </div>
                    </div>

                    {!data.access
                        .canManageSettings && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                            <Lock
                                size={
                                    13
                                }
                            />
                            Admin only
                        </span>
                    )}
                </div>

                <fieldset
                    disabled={
                        !data.access
                            .canManageSettings
                    }
                    className="mt-6 grid gap-5 md:grid-cols-2 disabled:opacity-60"
                >
                    <Field
                        label="Event name"
                        value={eventName}
                        onChange={(
                            value,
                        ) => {
                            setEventName(
                                value,
                            );
                            markChanged();
                        }}
                        placeholder="Event name"
                        icon={
                            CalendarDays
                        }
                        disabled={
                            !data.access
                                .isPlatformAdmin
                        }
                        lockedNote="RegiGo admin only"
                    />

                    <Field
                        label="Event slug"
                        value={eventSlug}
                        onChange={(
                            value,
                        ) => {
                            setEventSlug(
                                slugify(
                                    value,
                                ),
                            );
                            markChanged();
                        }}
                        placeholder="event-slug"
                        icon={
                            FileText
                        }
                    />

                    <Field
                        label="Event date"
                        value={eventDate}
                        onChange={(
                            value,
                        ) => {
                            setEventDate(
                                value,
                            );
                            markChanged();
                        }}
                        placeholder=""
                        icon={
                            CalendarDays
                        }
                        type="date"
                    />

                    <Field
                        label="Event time"
                        value={eventTime}
                        onChange={(
                            value,
                        ) => {
                            setEventTime(
                                value,
                            );
                            markChanged();
                        }}
                        placeholder=""
                        icon={
                            Clock3
                        }
                        type="time"
                    />

                    <Field
                        label="Venue"
                        value={venue}
                        onChange={(
                            value,
                        ) => {
                            setVenue(
                                value,
                            );
                            markChanged();
                        }}
                        placeholder="Event venue"
                        icon={MapPin}
                    />

                    <Field
                        label="Maximum guests"
                        value={maxGuests}
                        onChange={(
                            value,
                        ) => {
                            setMaxGuests(
                                value,
                            );
                            markChanged();
                        }}
                        placeholder="500"
                        icon={Users}
                        type="number"
                    />

                    <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-black text-slate-700">
                            Description
                        </span>
                        <textarea
                            rows={4}
                            value={
                                description
                            }
                            onChange={(
                                event,
                            ) => {
                                setDescription(
                                    event
                                        .target
                                        .value,
                                );
                                markChanged();
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                        />
                    </label>

                    <label>
                        <span className="mb-2 block text-sm font-black text-slate-700">
                            Event status
                        </span>
                        <select
                            value={status}
                            onChange={(
                                event,
                            ) => {
                                setStatus(
                                    event
                                        .target
                                        .value as
                                        | "draft"
                                        | "published",
                                );
                                markChanged();
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold"
                        >
                            <option value="draft">
                                Draft
                            </option>
                            <option value="published">
                                Published
                            </option>
                        </select>
                    </label>
                </fieldset>
            </section>
            )}

            {activeTab === "registration" && (
            <section
                className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8"
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                        <Settings2 className="mt-1 shrink-0 text-[#4F46E5]" />
                        <div>
                            <h2 className="text-2xl font-black">
                                Guest Access Method
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                Choose one way for guests to join this event. Public registration and company invitations cannot be active together.
                            </p>
                        </div>
                    </div>

                    <span
                        className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${
                            registrationMode ===
                            "public_registration"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-indigo-50 text-indigo-700"
                        }`}
                    >
                        {registrationMode ===
                        "public_registration" ? (
                            <Globe2 size={14} />
                        ) : (
                            <Send size={14} />
                        )}
                        {registrationMode ===
                        "public_registration"
                            ? "Public Registration"
                            : "Invitation & RSVP"}
                    </span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <button
                        type="button"
                        disabled={
                            !data.access
                                .canManageSettings
                        }
                        onClick={() =>
                            chooseRegistrationMode(
                                "public_registration",
                            )
                        }
                        className={`group rounded-[1.5rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 sm:p-6 ${
                            registrationMode ===
                            "public_registration"
                                ? "border-emerald-300 bg-emerald-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-emerald-200"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <span
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                    registrationMode ===
                                    "public_registration"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-50 text-emerald-700"
                                }`}
                            >
                                <Globe2 size={22} />
                            </span>

                            <SelectionIndicator
                                selected={
                                    registrationMode ===
                                    "public_registration"
                                }
                            />
                        </div>

                        <h3 className="mt-5 text-xl font-black">
                            Public Registration
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Guests open the public event page and complete the registration form themselves.
                        </p>

                        <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-bold leading-5 text-slate-600">
                            Best for open events, ticket sales, public sign-ups and self-service registration.
                        </div>
                    </button>

                    {(() => {
                        const invitationAddon =
                            data.addons.find(
                                (addon) =>
                                    addon.key ===
                                    "guest_invitations",
                            );
                        const invitationAllowed =
                            invitationAddon
                                ?.allowed !==
                            false;

                        return (
                            <button
                                type="button"
                                disabled={
                                    !data.access
                                        .canManageSettings ||
                                    !invitationAllowed
                                }
                                onClick={() =>
                                    chooseRegistrationMode(
                                        "invitation_only",
                                    )
                                }
                                className={`group rounded-[1.5rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 sm:p-6 ${
                                    registrationMode ===
                                    "invitation_only"
                                        ? "border-indigo-300 bg-[#F7F5FF] shadow-sm"
                                        : "border-slate-200 bg-white hover:border-indigo-200"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <span
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                            registrationMode ===
                                            "invitation_only"
                                                ? "bg-[#4F46E5] text-white"
                                                : "bg-[#F7F5FF] text-[#4F46E5]"
                                        }`}
                                    >
                                        <UserPlus size={22} />
                                    </span>

                                    {invitationAllowed ? (
                                        <SelectionIndicator
                                            selected={
                                                registrationMode ===
                                                "invitation_only"
                                            }
                                        />
                                    ) : (
                                        <Lock
                                            size={18}
                                            className="text-slate-400"
                                        />
                                    )}
                                </div>

                                <h3 className="mt-5 text-xl font-black">
                                    Invitation & RSVP
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The event company adds guests and sends each person a private invitation link to accept or decline.
                                </p>

                                <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-bold leading-5 text-slate-600">
                                    Best for private events, controlled guest lists and personalised RSVP tracking.
                                </div>

                                {!invitationAllowed && (
                                    <p className="mt-3 text-xs font-black text-amber-700">
                                        Guest Invitations is disabled for this company.
                                    </p>
                                )}
                            </button>
                        );
                    })()}
                </div>

                {registrationMode ===
                "public_registration" ? (
                    <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-black text-slate-900">
                                    Public registration page
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    The invitation system is automatically disabled while this method is selected.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    !data.access
                                        .canManageSettings
                                }
                                onClick={() => {
                                    setRegistrationOpen(
                                        (current) =>
                                            !current,
                                    );
                                    markChanged();
                                }}
                                className={`flex min-h-12 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left disabled:opacity-60 ${
                                    registrationOpen
                                        ? "border-emerald-300 bg-white"
                                        : "border-red-200 bg-red-50"
                                }`}
                            >
                                <div>
                                    <p className="text-sm font-black">
                                        {registrationOpen
                                            ? "Registration Open"
                                            : "Registration Closed"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {registrationOpen
                                            ? "Guests can submit the form."
                                            : "The public page shows a closed message."}
                                    </p>
                                </div>
                                <Switch
                                    enabled={
                                        registrationOpen
                                    }
                                />
                            </button>
                        </div>

                        {!registrationOpen && (
                            <label className="mt-5 block">
                                <span className="mb-2 block text-sm font-black text-slate-700">
                                    Closed registration message
                                </span>
                                <textarea
                                    disabled={
                                        !data.access
                                            .canManageSettings
                                    }
                                    rows={3}
                                    value={
                                        registrationClosedMessage
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setRegistrationClosedMessage(
                                            event
                                                .target
                                                .value,
                                        );
                                        markChanged();
                                    }}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 disabled:opacity-60"
                                />
                            </label>
                        )}
                    </div>
                ) : (
                    <div className="mt-6 rounded-[1.5rem] border border-indigo-200 bg-[#F7F5FF] p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-black text-slate-900">
                                    Private invitation flow enabled
                                </p>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                    Public self-registration is automatically closed. Add guests from Guest Invitations, then send their personalised RSVP links.
                                </p>
                            </div>

                            <a
                                href={`/dashboard/events/${eventId}/invitations`}
                                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 font-black text-white"
                            >
                                <MailCheck size={18} />
                                Manage Invitations
                            </a>
                        </div>
                    </div>
                )}

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-black text-slate-900">
                                Ticket Types
                            </p>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                Require guests to choose a ticket type during registration. This can now be changed anytime — it used to be set only once, at event creation.
                            </p>
                            <p className="mt-2 text-xs font-bold text-slate-500">
                                Selling paid tickets also needs the Stripe Ticket Payments add-on, enabled below under Optional Add-ons.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={
                                !data.access
                                    .canManageSettings
                            }
                            onClick={() => {
                                setEnableTicketTypes(
                                    (current) =>
                                        !current,
                                );
                                markChanged();
                            }}
                            className="shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Switch
                                enabled={
                                    enableTicketTypes
                                }
                            />
                        </button>
                    </div>
                </div>

                {!data.access
                    .canManageSettings && (
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
                        <Lock size={13} />
                        Only the Company Admin can change the guest access method.
                    </div>
                )}
            </section>
            )}

            {activeTab === "modules" && (
            <section
                className="space-y-5"
            >
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Settings2 className="text-[#4F46E5]" />
                            <div>
                                <h2 className="text-2xl font-black">
                                    Event Modules
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Company-disabled modules remain locked. Add-on modules are managed below.
                                </p>
                            </div>
                        </div>

                        {!data.access
                            .canManageSettings && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                                <Lock
                                    size={
                                        13
                                    }
                                />
                                Admin only
                            </span>
                        )}
                    </div>
                </div>

                {groupedModules.map(
                    ([
                        group,
                        modules,
                    ]) => (
                        <section
                            key={group}
                            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <h3 className="text-xl font-black">
                                {group}
                            </h3>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {modules.map(
                                    (
                                        module,
                                    ) => {
                                        const companyAllows =
                                            data
                                                .companyModules[
                                                module
                                                    .key
                                            ] !==
                                            false;
                                        const enabled =
                                            companyAllows &&
                                            enabledModules[
                                                module
                                                    .key
                                            ] !==
                                                false;
                                        const canToggle =
                                            data
                                                .access
                                                .canManageSettings &&
                                            companyAllows;

                                        return (
                                            <button
                                                key={
                                                    module.key
                                                }
                                                type="button"
                                                disabled={
                                                    !canToggle
                                                }
                                                onClick={() =>
                                                    toggleModule(
                                                        module.key,
                                                    )
                                                }
                                                className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left ${
                                                    enabled
                                                        ? "border-indigo-200 bg-[#F7F5FF]"
                                                        : "border-slate-200 bg-white"
                                                } disabled:cursor-not-allowed disabled:opacity-60`}
                                            >
                                                <div>
                                                    <p className="font-black">
                                                        {
                                                            module.label
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        {
                                                            module.description
                                                        }
                                                    </p>
                                                </div>

                                                {companyAllows ? (
                                                    <Switch
                                                        enabled={
                                                            enabled
                                                        }
                                                    />
                                                ) : (
                                                    <Lock className="shrink-0 text-slate-400" size={18} />
                                                )}
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </section>
                    ),
                )}
            </section>
            )}

            {activeTab === "addons" && (
            <section
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Puzzle className="text-[#4F46E5]" />
                        <div>
                            <h2 className="text-2xl font-black">
                                Optional Add-ons
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Optional features are managed here. Guest Invitations is controlled by the Guest Access Method above.
                            </p>
                        </div>
                    </div>

                    {!data.access
                        .canManageAddons && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                            <Lock
                                size={
                                    13
                                }
                            />
                            Locked
                        </span>
                    )}
                </div>

                <div className="mt-6 rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4F46E5]">
                            <MailCheck size={18} />
                        </span>
                        <div>
                            <p className="font-black text-slate-900">
                                Guest Invitations & RSVP
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                Controlled by Guest Access Method above. It is currently{" "}
                                <span className="font-black">
                                    {registrationMode ===
                                    "invitation_only"
                                        ? "enabled"
                                        : "disabled"}
                                </span>
                                .
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {data.addons
                        .filter(
                            (addon) =>
                                addon.key !==
                                "guest_invitations",
                        )
                        .map(
                        (addon) => {
                            const Icon =
                                addonIcons[
                                    addon.key
                                ] ||
                                Puzzle;
                            const enabled =
                                addons[
                                    addon.key
                                ] === true;
                            const canToggle =
                                data
                                    .access
                                    .canManageAddons &&
                                (
                                    addon.allowed ||
                                    addon.enabled
                                );

                            return (
                                <button
                                    key={
                                        addon.key
                                    }
                                    type="button"
                                    disabled={
                                        !canToggle
                                    }
                                    onClick={() =>
                                        toggleAddon(
                                            addon,
                                        )
                                    }
                                    className={`rounded-2xl border p-5 text-left ${
                                        enabled
                                            ? "border-indigo-200 bg-[#F7F5FF]"
                                            : "border-slate-200 bg-white"
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                                            enabled
                                                ? "bg-[#4F46E5] text-white"
                                                : "bg-slate-100 text-[#4F46E5]"
                                        }`}>
                                            <Icon size={20} />
                                        </span>

                                        {addon.allowed ? (
                                            <Switch
                                                enabled={
                                                    enabled
                                                }
                                            />
                                        ) : (
                                            <Lock className="text-slate-400" />
                                        )}
                                    </div>

                                    <p className="mt-5 font-black">
                                        {
                                            addon.name
                                        }
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {
                                            addon.description
                                        }
                                    </p>

                                    <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
                                        enabled
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                    }`}>
                                        {enabled && (
                                            <Check
                                                size={
                                                    12
                                                }
                                            />
                                        )}
                                        {enabled
                                            ? "Enabled"
                                            : addon.allowed
                                              ? "Disabled"
                                              : "Disabled for company"}
                                    </span>
                                </button>
                            );
                        },
                    )}
                </div>
            </section>
            )}

            <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={() =>
                        void reload()
                    }
                    disabled={
                        saving ||
                        loading
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 py-4 font-black text-slate-800 disabled:opacity-50"
                >
                    <RefreshCw
                        size={18}
                        className={
                            loading
                                ? "animate-spin"
                                : ""
                        }
                    />
                    Reset
                </button>

                <button
                    type="button"
                    onClick={() =>
                        void save()
                    }
                    disabled={
                        saving ||
                        (!data.access
                            .canManageSettings &&
                            !data.access
                                .canManageAddons)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-7 py-4 font-black text-white disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2
                            size={18}
                            className="animate-spin"
                        />
                    ) : (
                        <Save
                            size={18}
                        />
                    )}
                    {saving
                        ? "Saving…"
                        : "Save All Settings"}
                </button>
            </div>
        </div>
    );
}

function TabButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                active
                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-[#F7F5FF] hover:text-[#4F46E5]"
            }`}
        >
            {label}
        </button>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    icon: Icon,
    type = "text",
    disabled = false,
    lockedNote,
}: {
    label: string;
    value: string;
    onChange:
        (value: string) =>
            void;
    placeholder: string;
    icon:
        typeof CalendarDays;
    type?: string;
    disabled?: boolean;
    lockedNote?: string;
}) {
    return (
        <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                {label}
                {disabled &&
                    lockedNote && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">
                            <Lock
                                size={
                                    11
                                }
                            />
                            {
                                lockedNote
                            }
                        </span>
                    )}
            </span>
            <div className="relative">
                <Icon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    type={type}
                    value={value}
                    disabled={
                        disabled
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value,
                        )
                    }
                    min={
                        type ===
                        "number"
                            ? "1"
                            : undefined
                    }
                    placeholder={
                        placeholder
                    }
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                />
            </div>
        </label>
    );
}

function SelectionIndicator({
    selected,
}: {
    selected: boolean;
}) {
    return (
        <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                selected
                    ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                    : "border-slate-300 bg-white text-transparent"
            }`}
        >
            <Check size={15} />
        </span>
    );
}

function Switch({
    enabled,
}: {
    enabled: boolean;
}) {
    return (
        <span
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                enabled
                    ? "bg-[#4F46E5]"
                    : "bg-slate-200"
            }`}
        >
            <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    enabled
                        ? "left-7"
                        : "left-1"
                }`}
            />
        </span>
    );
}

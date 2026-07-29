"use client";

import {
    Building2,
    CalendarDays,
    Check,
    Clock3,
    FileText,
    Globe2,
    Loader2,
    Lock,
    MapPin,
    Puzzle,
    Save,
    Settings2,
    Sparkles,
    UserPlus,
    Users,
} from "lucide-react";
import BackButton from "@/components/layout/BackButton";
import WorkspaceSection from "@/components/layout/WorkspaceSection";
import {
    useRouter,
} from "next/navigation";
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import type {
    CompanyModuleKey,
    ModuleDefinition,
} from "@/lib/company-modules";
import {
    EVENT_MODULE_GROUPS,
    eventModuleDisplay,
    isEventModuleForcedOn,
} from "@/lib/event-module-overview";

type CompanyOption = {
    id: string;
    companyName: string;
    companySlug: string;
    status: string;
    planName: string;
    rentalType:
        | "annual"
        | "per_event"
        | null;
    eventCount: number;
    eventLimit:
        | number
        | null;
    availableLicenses: number;
    allowed: boolean;
    reason:
        | string
        | null;
    modules: Record<
        CompanyModuleKey,
        boolean
    >;
};

type AddonDefinition = {
    key: string;
    moduleKey:
        CompanyModuleKey;
    name: string;
    description: string;
    route: string;
};

type Payload = {
    isPlatformAdmin: boolean;
    companies:
        CompanyOption[];
    moduleCatalog:
        ModuleDefinition[];
    addonCatalog:
        AddonDefinition[];
};

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
                    "The event API returned invalid JSON.",
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
                    ? "The Create Event API route is missing. Copy the complete Event Workspace Recovery patch and restart Next.js."
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
                      "Unable to read the event response.",
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

const hiddenModuleKeys =
    new Set<
        CompanyModuleKey
    >([
        "addons",
        "settings",
        "payments",
        "table_selection",
        "badges",
        "direct_printing",
        "zoom_broadcast",
    ]);

// Same mode-relevance rules the dashboard sidebar already applies to nav
// items (`hideForInvitationOnly`/`hideForPublicRegistration` in
// components/layout/DashboardSidebar.tsx) and the overview page's
// management cards — guest list management and the public event website
// don't apply to invitation/RSVP events; invitations & RSVP doesn't apply
// to public-registration events.
const invitationOnlyHiddenModuleKeys =
    new Set<
        CompanyModuleKey
    >([
        "guests",
        "website",
    ]);
const publicRegistrationHiddenModuleKeys =
    new Set<
        CompanyModuleKey
    >([
        "invitations",
    ]);

export default function CreateEventManager() {
    const router = useRouter();

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

    const [companyId, setCompanyId] =
        useState("");
    const [eventName, setEventName] =
        useState("");
    const [eventSlug, setEventSlug] =
        useState("");
    const [slugTouched, setSlugTouched] =
        useState(false);
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
        registrationOpen,
        setRegistrationOpen,
    ] = useState(true);
    const [
        registrationMode,
        setRegistrationMode,
    ] = useState<
        | "public_registration"
        | "invitation_only"
    >("public_registration");
    const [
        registrationClosedMessage,
        setRegistrationClosedMessage,
    ] = useState(
        "Registration for this event is currently closed.",
    );
    const [
        enabledModules,
        setEnabledModules,
    ] = useState<
        Partial<
            Record<
                CompanyModuleKey,
                boolean
            >
        >
    >({});
    const [addons, setAddons] =
        useState<
            Record<string, boolean>
        >({});

    const load =
        useCallback(async () => {
            setLoading(true);
            setMessage("");

            try {
                const response =
                    await fetch(
                        "/api/events/create",
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
                            "Unable to load event creation.",
                    );
                }

                const payload =
                    result as Payload;
                setData(payload);

                const first =
                    payload.companies.find(
                        (company) =>
                            company.allowed,
                    ) ||
                    payload.companies[0];

                if (first) {
                    setCompanyId(
                        first.id,
                    );
                    setEnabledModules(
                        {
                            ...first.modules,
                        },
                    );

                    const initialAddons:
                        Record<
                            string,
                            boolean
                        > = {};

                    for (const addon of
                        payload.addonCatalog) {
                        initialAddons[
                            addon.key
                        ] =
                            first.modules[
                                addon
                                    .moduleKey
                            ] !==
                            false;
                    }

                    setAddons(
                        initialAddons,
                    );
                }
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load event creation.",
                );
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!slugTouched) {
            setEventSlug(
                slugify(
                    eventName,
                ),
            );
        }
    }, [
        eventName,
        slugTouched,
    ]);

    const company =
        useMemo(
            () =>
                data?.companies.find(
                    (item) =>
                        item.id ===
                        companyId,
                ) || null,
            [
                companyId,
                data,
            ],
        );

    // Grouped and labelled the same way as the event overview page's module
    // cards (lib/event-module-overview.ts mirrors its three sections), so
    // this picker's layout matches what the admin will see once the event
    // exists, rather than the catalog's own broader category taxonomy.
    const groupedModules =
        useMemo(() => {
            const visibleModules = (
                data?.moduleCatalog ||
                []
            ).filter(
                (moduleItem) =>
                    !hiddenModuleKeys.has(
                        moduleItem.key,
                    ) &&
                    !(
                        registrationMode ===
                            "invitation_only" &&
                        invitationOnlyHiddenModuleKeys.has(
                            moduleItem.key,
                        )
                    ) &&
                    !(
                        registrationMode ===
                            "public_registration" &&
                        publicRegistrationHiddenModuleKeys.has(
                            moduleItem.key,
                        )
                    ),
            );
            const byKey = new Map(
                visibleModules.map(
                    (moduleItem) => [
                        moduleItem.key,
                        moduleItem,
                    ],
                ),
            );
            const used =
                new Set<CompanyModuleKey>();
            const groups: {
                eyebrow: string;
                title: string;
                description: string;
                modules: ModuleDefinition[];
            }[] = [];

            for (const group of EVENT_MODULE_GROUPS) {
                const modules =
                    group.keys
                        .map((key) =>
                            byKey.get(key),
                        )
                        .filter(
                            (
                                moduleItem,
                            ): moduleItem is ModuleDefinition =>
                                Boolean(
                                    moduleItem,
                                ),
                        );

                for (const moduleItem of modules) {
                    used.add(moduleItem.key);
                }

                if (modules.length > 0) {
                    groups.push({
                        ...group,
                        modules,
                    });
                }
            }

            const leftover =
                visibleModules.filter(
                    (moduleItem) =>
                        !used.has(
                            moduleItem.key,
                        ),
                );

            if (leftover.length > 0) {
                groups.push({
                    eyebrow: "More",
                    title: "Other Modules",
                    description:
                        "Additional modules not tied to a specific event area.",
                    modules: leftover,
                });
            }

            return groups;
        }, [
            data,
            registrationMode,
        ]);

    function chooseCompany(
        nextCompanyId: string,
    ) {
        setCompanyId(
            nextCompanyId,
        );

        const selected =
            data?.companies.find(
                (item) =>
                    item.id ===
                    nextCompanyId,
            );

        if (!selected) {
            return;
        }

        setEnabledModules({
            ...selected.modules,
        });

        const nextAddons:
            Record<
                string,
                boolean
            > = {};

        for (const addon of
            data?.addonCatalog ||
            []) {
            nextAddons[
                addon.key
            ] =
                selected.modules[
                    addon.moduleKey
                ] !== false;
        }

        setAddons(
            nextAddons,
        );
    }

    function toggleModule(
        key: CompanyModuleKey,
    ) {
        if (
            company?.modules[
                key
            ] === false
        ) {
            return;
        }

        setEnabledModules(
            (current) => ({
                ...current,
                [key]:
                    current[
                        key
                    ] === false,
            }),
        );
    }

    function moduleDisplay(
        moduleItem: ModuleDefinition,
    ) {
        return eventModuleDisplay(
            moduleItem,
            registrationMode,
        );
    }

    function toggleAddon(
        addon:
            AddonDefinition,
    ) {
        if (
            company?.modules[
                addon.moduleKey
            ] === false
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
    }

    function chooseRegistrationMode(
        mode:
            | "public_registration"
            | "invitation_only",
    ) {
        if (
            mode ===
                "invitation_only" &&
            company?.modules
                .invitations ===
                false
        ) {
            setMessage(
                "Guest Invitations & RSVP is disabled for this company.",
            );
            return;
        }

        setRegistrationMode(mode);

        const invitationsOn =
            mode ===
            "invitation_only";

        setRegistrationOpen(
            !invitationsOn,
        );
        setAddons(
            (current) => ({
                ...current,
                guest_invitations:
                    invitationsOn,
            }),
        );
        setEnabledModules(
            (current) => ({
                ...current,
                invitations:
                    invitationsOn,
            }),
        );
    }

    async function submit(
        event: FormEvent,
    ) {
        event.preventDefault();

        if (
            !company ||
            !company.allowed
        ) {
            setMessage(
                company?.reason ||
                    "Choose a company that can create an event.",
            );
            return;
        }

        if (
            eventName.trim()
                .length < 2
        ) {
            setMessage(
                "Enter an event name.",
            );
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/events/create",
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
                                eventName,
                                eventSlug,
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
                                registrationOpen,
                                registrationMode,
                                registrationClosedMessage,
                                enabledModules,
                                addons,
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
                        "Unable to create the event.",
                );
            }

            setMessage(
                result.message ||
                    "Event created.",
            );

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:events-changed",
                    {
                        detail: {
                            eventId:
                                result.eventId,
                        },
                    },
                ),
            );

            router.push(
                result.redirectTo ||
                    `/dashboard/events/${result.eventId}`,
            );
            router.refresh();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to create the event.",
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading && !data) {
        return (
            <div className="flex min-h-[520px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-7 font-bold leading-7 text-red-700">
                {message ||
                    "Create Event could not be loaded."}
            </div>
        );
    }

    return (
        <form
            onSubmit={submit}
            className="space-y-7"
        >
            <div className="flex items-center justify-between gap-4">
                <BackButton href="/dashboard/events">
                    Back to Events
                </BackButton>
            </div>

            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        <Sparkles
                            size={16}
                        />
                        Create Event
                    </div>

                    <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                        New Event Workspace
                    </h1>

                    <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                        Create the event, choose its modules and enable optional add-ons in one setup flow.
                    </p>
                </div>
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-6 text-slate-700">
                    {message}
                </div>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-center gap-3">
                    <Building2 className="text-[#4F46E5]" />
                    <div>
                        <h2 className="text-2xl font-black">
                            Event Company
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            The company owns the event, its users and payment recipient.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {data.companies.map(
                        (item) => {
                            const selected =
                                item.id ===
                                companyId;

                            return (
                                <button
                                    key={
                                        item.id
                                    }
                                    type="button"
                                    onClick={() =>
                                        chooseCompany(
                                            item.id,
                                        )
                                    }
                                    className={`rounded-2xl border p-5 text-left transition ${
                                        selected
                                            ? "border-[#4F46E5] bg-[#F7F5FF] ring-2 ring-[#4F46E5]/10"
                                            : "border-slate-200 bg-white hover:border-indigo-200"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-black">
                                                {
                                                    item.companyName
                                                }
                                            </p>
                                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                {
                                                    item.planName
                                                }
                                            </p>
                                        </div>

                                        {selected && (
                                            <Check className="text-[#4F46E5]" />
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                                        <span className="rounded-full bg-white px-3 py-1.5 text-slate-600">
                                            {item.eventCount}
                                            {item.eventLimit ==
                                            null
                                                ? ""
                                                : ` / ${item.eventLimit}`}{" "}
                                            events
                                        </span>

                                        {item.rentalType ===
                                            "per_event" && (
                                            <span className="rounded-full bg-white px-3 py-1.5 text-slate-600">
                                                {
                                                    item.availableLicenses
                                                }{" "}
                                                licences
                                            </span>
                                        )}

                                        <span
                                            className={`rounded-full px-3 py-1.5 ${
                                                item.allowed
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                            }`}
                                        >
                                            {item.allowed
                                                ? "Available"
                                                : item.reason ||
                                                  "Unavailable"}
                                        </span>
                                    </div>
                                </button>
                            );
                        },
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-center gap-3">
                    <CalendarDays className="text-[#4F46E5]" />
                    <div>
                        <h2 className="text-2xl font-black">
                            Event Details
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            These details appear throughout the event workspace and public pages.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <Field
                        label="Event name"
                        value={eventName}
                        onChange={
                            setEventName
                        }
                        placeholder="RegiGo Annual Dinner"
                        icon={
                            CalendarDays
                        }
                        required
                    />

                    <Field
                        label="Event slug"
                        value={eventSlug}
                        onChange={(
                            value,
                        ) => {
                            setSlugTouched(
                                true,
                            );
                            setEventSlug(
                                slugify(
                                    value,
                                ),
                            );
                        }}
                        placeholder="regigo-annual-dinner"
                        icon={
                            FileText
                        }
                        required
                    />

                    <Field
                        label="Event date"
                        value={eventDate}
                        onChange={
                            setEventDate
                        }
                        placeholder=""
                        icon={
                            CalendarDays
                        }
                        type="date"
                    />

                    <Field
                        label="Event time"
                        value={eventTime}
                        onChange={
                            setEventTime
                        }
                        placeholder=""
                        icon={
                            Clock3
                        }
                        type="time"
                    />

                    <Field
                        label="Venue"
                        value={venue}
                        onChange={
                            setVenue
                        }
                        placeholder="Marina Bay Sands"
                        icon={MapPin}
                    />

                    <Field
                        label="Maximum guests"
                        value={maxGuests}
                        onChange={
                            setMaxGuests
                        }
                        placeholder="20000"
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
                            ) =>
                                setDescription(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#4F46E5]"
                            placeholder="Describe the event."
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
                            ) =>
                                setStatus(
                                    event
                                        .target
                                        .value as
                                        | "draft"
                                        | "published",
                                )
                            }
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

                    <button
                        type="button"
                        disabled={
                            registrationMode ===
                            "invitation_only"
                        }
                        onClick={() =>
                            setRegistrationOpen(
                                (
                                    current,
                                ) =>
                                    !current,
                            )
                        }
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                            registrationOpen
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-red-200 bg-red-50"
                        }`}
                    >
                        <div>
                            <p className="font-black">
                                Registration{" "}
                                {registrationOpen
                                    ? "Open"
                                    : "Closed"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {registrationMode ===
                                "invitation_only"
                                    ? "Invitation & RSVP events don't use public registration."
                                    : "Control the initial public registration status."}
                            </p>
                        </div>
                        <Switch
                            enabled={
                                registrationOpen
                            }
                        />
                    </button>

                    {!registrationOpen && (
                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Closed registration message
                            </span>
                            <textarea
                                rows={3}
                                value={
                                    registrationClosedMessage
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setRegistrationClosedMessage(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                            />
                        </label>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-center gap-3">
                    <Settings2 className="text-[#4F46E5]" />
                    <div>
                        <h2 className="text-2xl font-black">
                            Guest Access Method
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Choose one way for guests to join this event. Public registration and invitations cannot be active together.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() =>
                            chooseRegistrationMode(
                                "public_registration",
                            )
                        }
                        className={`rounded-[1.5rem] border p-5 text-left transition ${
                            registrationMode ===
                            "public_registration"
                                ? "border-emerald-300 bg-emerald-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-emerald-200"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                    registrationMode ===
                                    "public_registration"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-50 text-emerald-700"
                                }`}
                            >
                                <Globe2 size={20} />
                            </span>

                            {registrationMode ===
                                "public_registration" && (
                                <Check className="text-emerald-600" />
                            )}
                        </div>

                        <h3 className="mt-4 text-lg font-black">
                            Public Registration
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Guests open the public event page and complete the registration form themselves.
                        </p>
                    </button>

                    <button
                        type="button"
                        disabled={
                            company?.modules
                                .invitations ===
                            false
                        }
                        onClick={() =>
                            chooseRegistrationMode(
                                "invitation_only",
                            )
                        }
                        className={`rounded-[1.5rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            registrationMode ===
                            "invitation_only"
                                ? "border-indigo-300 bg-[#F7F5FF] shadow-sm"
                                : "border-slate-200 bg-white hover:border-indigo-200"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                    registrationMode ===
                                    "invitation_only"
                                        ? "bg-[#4F46E5] text-white"
                                        : "bg-[#F7F5FF] text-[#4F46E5]"
                                }`}
                            >
                                <UserPlus size={20} />
                            </span>

                            {company?.modules
                                .invitations ===
                            false ? (
                                <Lock className="text-slate-400" />
                            ) : (
                                registrationMode ===
                                    "invitation_only" && (
                                    <Check className="text-[#4F46E5]" />
                                )
                            )}
                        </div>

                        <h3 className="mt-4 text-lg font-black">
                            Invitation & RSVP
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            The event company adds guests and sends each person a private invitation link to accept or decline.
                        </p>

                        {company?.modules
                            .invitations ===
                            false && (
                            <p className="mt-3 text-xs font-black text-amber-700">
                                Guest Invitations is disabled for this company.
                            </p>
                        )}
                    </button>
                </div>
            </section>

            <section className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Settings2 className="text-[#4F46E5]" />
                        <div>
                            <h2 className="text-2xl font-black">
                                Event Modules
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Company-disabled modules remain locked. Add-on modules are controlled in the next section.
                            </p>
                        </div>
                    </div>
                </div>

                {groupedModules.map(
                    (group) => (
                        <WorkspaceSection
                            key={
                                group.title
                            }
                            eyebrow={
                                group.eyebrow
                            }
                            title={
                                group.title
                            }
                            description={
                                group.description
                            }
                        >
                            {group.modules.map(
                                    (
                                        module,
                                    ) => {
                                        const forcedOn =
                                            isEventModuleForcedOn(
                                                module.key,
                                                registrationMode,
                                            );
                                        const allowed =
                                            company
                                                ?.modules[
                                                module
                                                    .key
                                            ] !==
                                            false;
                                        const enabled =
                                            forcedOn ||
                                            (allowed &&
                                                enabledModules[
                                                    module
                                                        .key
                                                ] !==
                                                    false);

                                        return (
                                            <button
                                                key={
                                                    module.key
                                                }
                                                type="button"
                                                onClick={() =>
                                                    toggleModule(
                                                        module.key,
                                                    )
                                                }
                                                disabled={
                                                    !allowed ||
                                                    forcedOn
                                                }
                                                className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                                                    enabled
                                                        ? "border-indigo-200 bg-[#F7F5FF]"
                                                        : "border-slate-200 bg-white"
                                                } disabled:cursor-not-allowed disabled:opacity-60`}
                                            >
                                                <div>
                                                    <p className="font-black">
                                                        {
                                                            moduleDisplay(
                                                                module,
                                                            )
                                                                .label
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        {
                                                            moduleDisplay(
                                                                module,
                                                            )
                                                                .description
                                                        }
                                                    </p>
                                                </div>

                                                {allowed ? (
                                                    <Switch
                                                        enabled={
                                                            enabled
                                                        }
                                                    />
                                                ) : (
                                                    <Lock
                                                        size={
                                                            18
                                                        }
                                                        className="shrink-0 text-slate-400"
                                                    />
                                                )}
                                            </button>
                                        );
                                    },
                                )}
                        </WorkspaceSection>
                    ),
                )}
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-center gap-3">
                    <Puzzle className="text-[#4F46E5]" />
                    <div>
                        <h2 className="text-2xl font-black">
                            Optional Add-ons
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            These controls also switch on the corresponding event module. Guest Invitations is controlled by the Guest Access Method above.
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {data.addonCatalog
                        .filter(
                            (addon) =>
                                addon.key !==
                                "guest_invitations",
                        )
                        .map(
                        (addon) => {
                            const allowed =
                                company
                                    ?.modules[
                                    addon
                                        .moduleKey
                                ] !==
                                false;
                            const enabled =
                                allowed &&
                                addons[
                                    addon.key
                                ] === true;

                            return (
                                <button
                                    key={
                                        addon.key
                                    }
                                    type="button"
                                    onClick={() =>
                                        toggleAddon(
                                            addon,
                                        )
                                    }
                                    disabled={
                                        !allowed
                                    }
                                    className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left ${
                                        enabled
                                            ? "border-indigo-200 bg-[#F7F5FF]"
                                            : "border-slate-200"
                                    } disabled:opacity-60`}
                                >
                                    <div>
                                        <p className="font-black">
                                            {
                                                addon.name
                                            }
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            {
                                                addon.description
                                            }
                                        </p>
                                    </div>

                                    {allowed ? (
                                        <Switch
                                            enabled={
                                                enabled
                                            }
                                        />
                                    ) : (
                                        <Lock className="shrink-0 text-slate-400" />
                                    )}
                                </button>
                            );
                        },
                    )}
                </div>
            </section>

            <div className="sticky bottom-4 z-20 flex justify-end rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                <button
                    type="submit"
                    disabled={
                        saving ||
                        !company?.allowed
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-7 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                        ? "Creating Event…"
                        : "Create Event"}
                </button>
            </div>
        </form>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    icon: Icon,
    type = "text",
    required = false,
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
    required?: boolean;
}) {
    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>

            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

                <input
                    type={type}
                    required={required}
                    value={value}
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value,
                        )
                    }
                    placeholder={
                        placeholder
                    }
                    min={
                        type ===
                        "number"
                            ? "1"
                            : undefined
                    }
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none transition focus:border-[#4F46E5]"
                />
            </div>
        </label>
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

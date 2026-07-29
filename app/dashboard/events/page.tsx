import Link from "next/link";
import DeleteEventButton from "@/components/events/DeleteEventButton";
import {
    ArrowRight,
    Building2,
    CalendarDays,
    Clock3,
    MapPin,
    PlusCircle,
    Search,
    Sparkles,
} from "lucide-react";
import {
    evaluateEventCreation,
    getCurrentCompanyContext,
    hasAllCompanyEvents,
    isPlatformAdminContext,
} from "@/lib/company-access";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type EventItem = {
    id: string;
    company_id: string | null;
    company_name: string | null;
    event_name: string;
    event_slug: string;
    event_date: string | null;
    event_time: string | null;
    venue: string | null;
    description: string | null;
    status: string | null;
    max_guests: number | null;
    registration_open: boolean | null;
    created_at: string | null;
    isInvitationOnly: boolean;
};

export default async function EventsPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string;
        status?: string;
        company?: string;
    }>;
}) {
    const context = await getCurrentCompanyContext();
    const permission = evaluateEventCreation(context);
    const supabaseServer = await createSupabaseServerClient();
    const db = supabaseServer;
    const query = await searchParams;
    const isPlatformAdmin = isPlatformAdminContext(context);

    let eventQuery = db
        .from("events")
        .select(
            "id, company_id, event_name, event_slug, event_date, event_time, venue, description, status, max_guests, registration_open, created_at",
        );

    if (!isPlatformAdmin) {
        eventQuery = eventQuery.eq(
            "company_id",
            context.company.id,
        );
    }

    if (
        !isPlatformAdmin &&
        !hasAllCompanyEvents(context)
    ) {
        const ids =
            context.accessibleEventIds.length > 0
                ? context.accessibleEventIds
                : [
                      "00000000-0000-0000-0000-000000000000",
                  ];

        eventQuery = eventQuery.in("id", ids);
    }

    const { data, error } = await eventQuery.order(
        "created_at",
        { ascending: false },
    );

    if (error) {
        throw new Error(error.message);
    }

    const eventIds = (data || []).map(
        (event) => event.id,
    );
    const invitationOnlyEventIds = new Set<string>();

    if (eventIds.length > 0) {
        const { data: settingsRows, error: settingsError } = await db
            .from("event_settings")
            .select("event_id, registration_mode")
            .in("event_id", eventIds);

        if (settingsError) {
            throw new Error(settingsError.message);
        }

        for (const row of settingsRows || []) {
            if (row.registration_mode === "invitation_only") {
                invitationOnlyEventIds.add(row.event_id);
            }
        }
    }

    const companyNameById = new Map<string, string>();

    if (isPlatformAdmin) {
        const companyIds = Array.from(
            new Set(
                (data || [])
                    .map((event) => event.company_id)
                    .filter((value): value is string => Boolean(value)),
            ),
        );

        if (companyIds.length > 0) {
            const { data: companies, error: companiesError } = await db
                .from("companies")
                .select("id, company_name")
                .in("id", companyIds);

            if (companiesError) {
                throw new Error(companiesError.message);
            }

            for (const row of companies || []) {
                companyNameById.set(row.id, row.company_name);
            }
        }
    }

    const allEvents = (
        (data || []) as Omit<
            EventItem,
            "company_name" | "isInvitationOnly"
        >[]
    ).map(
        (event) => ({
            ...event,
            company_name:
                (event.company_id &&
                    companyNameById.get(event.company_id)) ||
                null,
            isInvitationOnly:
                invitationOnlyEventIds.has(event.id),
        }),
    );

    const companyOptions = Array.from(
        new Map(
            allEvents
                .filter((event) => event.company_id && event.company_name)
                .map((event) => [
                    event.company_id as string,
                    event.company_name as string,
                ]),
        ),
    ).sort((a, b) => a[1].localeCompare(b[1]));

    const keyword = (query.q || "").trim().toLowerCase();
    const statusFilter = (query.status || "all").trim().toLowerCase();
    const companyFilter = (query.company || "all").trim();

    const events = allEvents.filter((event) => {
        const matchesKeyword =
            !keyword ||
            [
                event.event_name,
                event.event_slug,
                event.venue,
                event.description,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(keyword);

        const matchesStatus =
            statusFilter === "all" ||
            (event.status || "draft").toLowerCase() === statusFilter;

        const matchesCompany =
            !isPlatformAdmin ||
            companyFilter === "all" ||
            event.company_id === companyFilter;

        return matchesKeyword && matchesStatus && matchesCompany;
    });

    const published = events.filter(
        (event) => event.status === "published",
    ).length;
    const drafts = events.filter(
        (event) => (event.status || "draft") === "draft",
    ).length;

    return (
        <div className="space-y-7">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Sparkles size={16} />
                            {context.company.company_name}
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                            {context.isPlatformAdmin
                                ? "All Events"
                                : "My Events"}
                        </h1>

                        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                            {context.isPlatformAdmin
                                ? "Manage events across the RegiGo platform without customer rental-plan limits."
                                : "Create and manage multiple event workspaces while keeping all existing RegiGo modules inside each event."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                                {context.eventCount} total
                            </span>
                            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                                {published} published
                            </span>
                            <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
                                {drafts} drafts
                            </span>
                            <span className="rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                {context.plan?.plan_name || "No rental plan"}
                            </span>
                        </div>
                    </div>

                    {context.profile.role === "admin" && (
                        <Link
                            href={
                                permission.allowed
                                    ? "/dashboard/events/new"
                                    : "/dashboard/rental-plan"
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                        >
                            <PlusCircle size={19} />
                            {permission.allowed
                                ? "Create Event"
                                : "View Rental Plan"}
                        </Link>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <form
                    className={`grid gap-3 ${
                        isPlatformAdmin
                            ? "md:grid-cols-[1fr_180px_180px_auto]"
                            : "md:grid-cols-[1fr_210px_auto]"
                    }`}
                >
                    <label className="relative">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            name="q"
                            defaultValue={query.q || ""}
                            placeholder="Search event name, venue or description"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </label>

                    <select
                        name="status"
                        defaultValue={statusFilter}
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                    >
                        <option value="all">All statuses</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                    </select>

                    {isPlatformAdmin && (
                        <select
                            name="company"
                            defaultValue={companyFilter}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                        >
                            <option value="all">All companies</option>
                            {companyOptions.map(([id, name]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="submit"
                        className="h-12 rounded-2xl bg-[#4F46E5] px-6 text-sm font-black text-white transition hover:bg-[#4338CA]"
                    >
                        Apply
                    </button>
                </form>
            </section>

            {!permission.allowed &&
                context.profile.role === "admin" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
                        {permission.reason}
                    </div>
                )}

            {events.length === 0 ? (
                <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F7F5FF] text-[#4F46E5]">
                        <CalendarDays size={29} />
                    </div>
                    <h2 className="mt-5 text-2xl font-black">
                        No matching events
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Clear the filters, or create a new event when the
                        company rental plan has an available event slot.
                    </p>
                </section>
            ) : (
                <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {events.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            canDelete={
                                context.isPlatformAdmin ||
                                context.profile.role ===
                                    "admin"
                            }
                        />
                    ))}
                </section>
            )}
        </div>
    );
}

function EventCard({
    event,
    canDelete,
}: {
    event: EventItem;
    canDelete: boolean;
}) {
    return (
        <article className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-indigo-100 hover:shadow-lg">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#EC4899]/10 blur-3xl" />

            <Link
                href={`/dashboard/events/${event.id}`}
                className="relative z-10 block p-6"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                        <CalendarDays size={23} />
                    </div>
                    <StatusBadge status={event.status || "draft"} />
                </div>

                <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950">
                    {event.event_name}
                </h2>

                {event.company_name && (
                    <p className="mt-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#4F46E5]">
                        <Building2 size={13} />
                        {event.company_name}
                    </p>
                )}

                <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
                    {event.description ||
                        "Open the event workspace to configure guests, registration, seating, emails and event-day tools."}
                </p>

                <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                    <p className="flex items-center gap-3">
                        <CalendarDays
                            size={17}
                            className="text-[#4F46E5]"
                        />
                        {formatDate(event.event_date)}
                    </p>
                    <p className="flex items-center gap-3">
                        <Clock3
                            size={17}
                            className="text-[#4F46E5]"
                        />
                        {event.event_time || "Time not set"}
                    </p>
                    <p className="flex items-center gap-3">
                        <MapPin
                            size={17}
                            className="text-[#4F46E5]"
                        />
                        {event.venue || "Venue not set"}
                    </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                            event.registration_open
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                    >
                        Registration{" "}
                        {event.registration_open ? "open" : "closed"}
                    </span>

                    <span className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5]">
                        Open
                        <ArrowRight
                            size={16}
                            className="transition group-hover:translate-x-1"
                        />
                    </span>
                </div>
            </Link>

            {canDelete && (
                <div className="relative z-20 flex justify-end border-t border-slate-100 bg-white px-5 py-4">
                    <DeleteEventButton
                        eventId={event.id}
                        eventName={
                            event.event_name
                        }
                        eventSlug={
                            event.event_slug
                        }
                        showWebsiteLink={
                            !event.isInvitationOnly
                        }
                        compact
                    />
                </div>
            )}
        </article>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles =
        status === "published"
            ? "bg-emerald-50 text-emerald-700"
            : status === "draft"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-700";

    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles}`}
        >
            {status}
        </span>
    );
}

function formatDate(date: string | null) {
    if (!date) return "Date not set";

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
}

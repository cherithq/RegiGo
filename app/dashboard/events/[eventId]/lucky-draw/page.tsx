import Link from "next/link";
import {
    ExternalLink,
    Gift,
    Sparkles,
    Trophy,
    CheckCircle2,
} from "lucide-react";
import { requirePermission } from "@/lib/permissions";
import BackButton from "@/components/layout/BackButton";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";
import LuckyDrawWheel from "@/components/lucky-draw/LuckyDrawWheel";

type CheckedInGuest = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    checked_in_at: string | null;
    custom_answers?: Record<string, unknown> | null;
};

type RegistrationField = {
    id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    field_options?: any;
    options?: any;
    sort_order?: number;
};

type RegistrationRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    department: string | null;
    custom_answers: Record<string, unknown> | null;
    created_at: string | null;
    registration_status: string | null;
};

type CheckInRow = {
    registration_id: string | null;
    checked_in_at: string | null;
};

// Supabase caps rows-per-request (and rejects overly long `?id=in.(...)`
// filter URLs), so large events need real pagination rather than a single
// unbounded select or an `.in()` filter built from thousands of ids.
async function fetchAllRows<T>(
    buildQuery: (
        from: number,
        to: number,
    ) => PromiseLike<{
        data: T[] | null;
        error: { message: string } | null;
    }>,
    pageSize = 1000,
): Promise<T[]> {
    let rows: T[] = [];
    let from = 0;

    for (;;) {
        const { data, error } = await buildQuery(
            from,
            from + pageSize - 1,
        );

        if (error) {
            throw new Error(error.message);
        }

        const batch = data || [];
        rows = rows.concat(batch);

        if (batch.length < pageSize) {
            break;
        }

        from += pageSize;

        if (from > 200000) {
            // Safety valve against a runaway loop; no real event should
            // ever have this many rows.
            break;
        }
    }

    return rows;
}

export default async function LuckyDrawPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    await requirePermission("can_scan_qr");
    const { eventId } = await params;

    // Use the service-role client for reads: this dashboard is meant to see
    // every registration/check-in for the event regardless of how those rows
    // were created (scanner, admin UI, or a direct database insert/import),
    // and row-level security on these tables can otherwise hide rows from
    // the signed-in session even though requirePermission already gates
    // access to this page.
    const admin = getSupabaseAdminClient();

    const [
        eventResult,
        registrationFormResult,
        winnersResult,
        prizesResult,
        displaySettingsResult,
    ] = await Promise.all([
        admin
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        admin
            .from("registration_forms")
            .select("id")
            .eq("event_id", eventId)
            .maybeSingle(),

        admin
            .from("lucky_draw_winners")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false }),

        admin
            .from("lucky_draw_prizes")
            .select("*")
            .eq("event_id", eventId)
            .order("prize_order", { ascending: true }),

        admin
            .from("lucky_draw_display_settings")
            .select(
                "primary_color, secondary_color, background_color, background_image_url, background_image_opacity"
            )
            .eq("event_id", eventId)
            .maybeSingle(),
    ]);

    const event = eventResult.data;

    if (eventResult.error) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">
                        Failed to load event: {eventResult.error.message}
                    </p>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const registrationForm = registrationFormResult.data;

    // Fetch every registration and every check-in for the event with real
    // pagination (Supabase caps a single request at 1000 rows), then work
    // out who's checked in entirely in memory. This avoids ever building an
    // `.in("id", [...thousands of ids])` filter, which produces a URL long
    // enough that Supabase's API rejects the request outright — that was
    // silently emptying this list for any event with more than ~1000
    // checked-in guests.
    const [allRegistrations, allCheckIns, fieldRowsResult] =
        await Promise.all([
            fetchAllRows<RegistrationRow>((from, to) =>
                admin
                    .from("registrations")
                    .select(
                        "id, full_name, email, phone, department, custom_answers, created_at, registration_status"
                    )
                    .eq("event_id", eventId)
                    .order("created_at", { ascending: false })
                    .range(from, to)
            ),

            fetchAllRows<CheckInRow>((from, to) =>
                admin
                    .from("check_ins")
                    .select("registration_id, checked_in_at")
                    .eq("event_id", eventId)
                    .eq("scan_result", "checked_in")
                    .order("checked_in_at", { ascending: false })
                    .range(from, to)
            ),

            registrationForm?.id
                ? admin
                      .from("registration_fields")
                      .select(
                          "id, field_label, field_key, field_type, field_options, options, sort_order"
                      )
                      .eq("form_id", registrationForm.id)
                      .order("sort_order", { ascending: true })
                : Promise.resolve({ data: [], error: null }),
        ]);

    const checkInMap = new Map<string, CheckInRow>();

    for (const checkIn of allCheckIns) {
        if (!checkIn.registration_id) continue;

        if (!checkInMap.has(checkIn.registration_id)) {
            checkInMap.set(checkIn.registration_id, checkIn);
        }
    }

    // A guest can be marked checked in either through the QR scanner (a
    // check_ins row) or by directly setting registrations.registration_status
    // (e.g. a manual database edit or bulk import). Treat either signal as
    // checked in so guests aren't invisible to the lucky draw just because
    // they weren't scanned.
    const checkedInGuests: CheckedInGuest[] = allRegistrations
        .filter((guest) => {
            const statusCheckedIn =
                guest.registration_status === "checked_in" ||
                guest.registration_status === "attended";

            return checkInMap.has(guest.id) || statusCheckedIn;
        })
        .map((guest) => {
            const checkIn = checkInMap.get(guest.id);

            return {
                id: guest.id,
                full_name: guest.full_name,
                email: guest.email,
                phone: guest.phone,
                department: guest.department,
                custom_answers: guest.custom_answers || {},
                checked_in_at:
                    checkIn?.checked_in_at ||
                    guest.created_at ||
                    null,
            };
        });

    const registrationFields = (fieldRowsResult.data || []) as RegistrationField[];
    const winners = winnersResult.data || [];
    const prizes = prizesResult.data || [];

    const totalCheckedIn = checkedInGuests.length;
    const totalWinners = winners.length;
    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <BackButton href={`/dashboard/events/${eventId}`}>
                    Back to Event
                </BackButton>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-64 md:w-64" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-40 md:h-64 md:w-64" />

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                                <Gift size={15} />
                                Event Day Lucky Draw
                            </div>

                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                                Lucky Draw
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:mt-4 md:text-lg md:leading-7">
                                Create prizes, choose which checked-in guests are eligible for
                                each prize, then spin the wheel for the selected prize.
                            </p>

                            <p className="mt-3 text-sm font-bold text-slate-500">
                                {eventName}
                            </p>
                        </div>

                        <div className="grid gap-4">
                            <Link
                                href={`/display/events/${eventId}/lucky-draw`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90 sm:w-auto md:px-6 md:py-4 md:text-base"
                            >
                                <ExternalLink size={18} />
                                Open Audience Display
                            </Link>

                            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 md:rounded-[2rem] md:p-6">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                                        <Sparkles size={22} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-500">
                                            Prize Eligibility
                                        </p>
                                        <p className="text-xl font-black text-slate-950 md:text-2xl">
                                            Select by form field
                                        </p>
                                    </div>
                                </div>

                                <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                                    Filter checked-in guests using registration form answers.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-3 gap-3 md:gap-5">
                    <StatCard
                        title="Checked-In"
                        value={totalCheckedIn}
                        text="Available"
                        icon={CheckCircle2}
                    />

                    <StatCard
                        title="Prizes"
                        value={prizes.length}
                        text="Created"
                        icon={Gift}
                    />

                    <StatCard
                        title="Winners"
                        value={totalWinners}
                        text="Drawn"
                        icon={Trophy}
                    />
                </section>

                <section className="overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
                    <LuckyDrawWheel
                        eventId={eventId}
                        eventName={eventName}
                        guests={checkedInGuests}
                        initialWinners={winners}
                        initialPrizes={prizes}
                        registrationFields={registrationFields}
                        displaySettings={
                            displaySettingsResult.data
                        }
                    />
                </section>
            </div>
        </main>
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
    icon: any;
}) {
    return (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="w-fit rounded-2xl bg-[#F7F5FF] p-2.5 text-[#4F46E5] md:p-3">
                <Icon size={20} />
            </div>

            <p className="mt-4 text-xs font-bold text-slate-500 md:mt-6 md:text-sm">
                {title}
            </p>

            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:mt-2 md:text-4xl">
                {value}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 md:mt-3 md:text-sm md:leading-6">
                {text}
            </p>
        </div>
    );
}
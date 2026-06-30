import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import ExportGuestsButton from "@/components/reports/ExportGuestsButton";

export default async function ReportsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <main className="p-8">Event not found.</main>;

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("full_name", { ascending: true });

    const { data: checkIns } = await supabaseServer
        .from("check_ins")
        .select("*")
        .eq("event_id", eventId)
        .eq("scan_result", "checked_in");

    const { data: form } = await supabaseServer
        .from("registration_forms")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    const { data: fields } = await supabaseServer
        .from("registration_fields")
        .select("*")
        .eq("form_id", form?.id)
        .order("sort_order", { ascending: true });

    const checkedInIds = new Set(
        (checkIns || []).map((item) => item.registration_id)
    );

    const checkedInGuests =
        guests?.filter((guest) => checkedInIds.has(guest.id)) || [];

    const notCheckedInGuests =
        guests?.filter((guest) => !checkedInIds.has(guest.id)) || [];

    const total = guests?.length || 0;
    const checkedIn = checkedInGuests.length;
    const pending = notCheckedInGuests.length;

    const exportGuests = [
        ...checkedInGuests.map((g) => ({ ...g, checkin_status: "Checked In" })),
        ...notCheckedInGuests.map((g) => ({ ...g, checkin_status: "Pending" })),
    ];

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="font-bold text-[#4F46E5]"
                >
                    ← Back to Event
                </Link>

                <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-4xl font-black">Reports</h1>
                        <p className="mt-2 text-slate-600">{event.event_name}</p>
                    </div>

                    <ExportGuestsButton
                        guests={exportGuests}
                        fields={fields || []}
                        filename={`${event.event_slug}-guest-report.csv`}
                    />
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <Stat title="Total Registered" value={total} />
                    <Stat title="Checked In" value={checkedIn} />
                    <Stat title="Not Checked In" value={pending} />
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <GuestList
                        title={`Not Checked In (${pending})`}
                        guests={notCheckedInGuests}
                        emptyText="All guests have checked in."
                        type="pending"
                    />

                    <GuestList
                        title={`Checked In (${checkedIn})`}
                        guests={checkedInGuests}
                        emptyText="No guests checked in yet."
                        type="checked"
                    />
                </div>
            </div>
        </main>
    );
}

function Stat({ title, value }: { title: string; value: number }) {
    return (
        <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <p className="font-bold text-slate-500">{title}</p>
            <p className="mt-3 text-5xl font-black">{value}</p>
        </div>
    );
}

function GuestList({
    title,
    guests,
    emptyText,
    type,
}: {
    title: string;
    guests: any[];
    emptyText: string;
    type: "pending" | "checked";
}) {
    return (
        <div className="rounded-[2rem] bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-black">{title}</h2>

            <div className="mt-6 space-y-3">
                {guests.length === 0 ? (
                    <p className="rounded-2xl bg-[#F7F5FF] p-4 font-semibold text-slate-500">
                        {emptyText}
                    </p>
                ) : (
                    guests.map((guest) => (
                        <div
                            key={guest.id}
                            className="flex items-center justify-between rounded-2xl bg-[#F7F5FF] p-4"
                        >
                            <div>
                                <p className="font-black">{guest.full_name}</p>
                                <p className="text-sm text-slate-500">{guest.email}</p>
                                <p className="text-xs text-slate-500">
                                    {guest.department || "-"} · {guest.phone || "-"}
                                </p>
                            </div>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${type === "checked"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                    }`}
                            >
                                {type === "checked" ? "Checked In" : "Pending"}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
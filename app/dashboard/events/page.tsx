import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

export default async function EventsPage() {
    await requirePermission("can_manage_events");
    const { data: events } = await supabaseServer
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-4xl font-black">My Events</h1>
                        <p className="mt-2 text-slate-600">
                            View, manage, and monitor all your RegiGo events.
                        </p>
                    </div>

                    <Link
                        href="/dashboard/events/new"
                        className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 text-center font-black text-white shadow-lg"
                    >
                        + New Event
                    </Link>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {events?.map((event) => (
                        <div
                            key={event.id}
                            className="rounded-[2rem] bg-white p-7 shadow-xl"
                        >
                            <span className="rounded-full bg-[#F7F5FF] px-3 py-1 text-xs font-black text-[#4F46E5]">
                                {(event.status || "draft").toUpperCase()}
                            </span>

                            <h2 className="mt-5 text-2xl font-black">{event.event_name}</h2>

                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <p>📅 {event.event_date || "-"}</p>
                                <p>🕒 {event.event_time || "-"}</p>
                                <p>📍 {event.venue || "-"}</p>
                            </div>

                            <div className="mt-6 grid gap-3">
                                <Link
                                    href={`/dashboard/events/${event.id}`}
                                    className="rounded-xl bg-slate-950 px-4 py-3 text-center font-bold text-white"
                                >
                                    Manage Event
                                </Link>

                                <Link
                                    href={`/event/${event.event_slug}`}
                                    className="rounded-xl border border-slate-200 px-4 py-3 text-center font-bold"
                                >
                                    View Public Page
                                </Link>
                            </div>
                        </div>
                    ))}

                    {(!events || events.length === 0) && (
                        <div className="col-span-full rounded-[2rem] bg-white p-10 text-center shadow-xl">
                            <div className="text-5xl">🎉</div>
                            <h2 className="mt-4 text-2xl font-black">No events yet</h2>
                            <p className="mt-2 text-slate-600">
                                Create your first event and start collecting registrations.
                            </p>

                            <Link
                                href="/dashboard/events/new"
                                className="mt-6 inline-flex rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-bold text-white"
                            >
                                Create Event
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
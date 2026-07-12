import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import TableAssignmentForm from "@/components/forms/TableAssignmentForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AssignTablesPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

    const [eventResult, tablesResult, guestsResult, assignmentsResult] =
        await Promise.all([
            supabaseServer
                .from("events")
                .select("*")
                .eq("id", eventId)
                .maybeSingle(),

            supabaseServer
                .from("event_tables")
                .select("*")
                .eq("event_id", eventId)
                .order("table_name", { ascending: true }),

            supabaseServer
                .from("registrations")
                .select("*")
                .eq("event_id", eventId)
                .order("full_name", { ascending: true }),

            supabaseServer
                .from("table_assignments")
                .select("*")
                .eq("event_id", eventId),
        ]);

    const event = eventResult.data;

    if (eventResult.error || !event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">
                        {eventResult.error?.message || "Event not found."}
                    </p>
                </div>
            </main>
        );
    }

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <Link
                    href={`/dashboard/events/${eventId}/tables`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Tables
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-56 md:w-56" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-32 md:h-56 md:w-56" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                            <Users size={15} />
                            Seating Assignment
                        </div>

                        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                            Assign Guests to Tables
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Assign registered guests to seating tables for{" "}
                            <span className="font-black text-slate-950">
                                {eventName}
                            </span>
                            .
                        </p>
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                    <TableAssignmentForm
                        eventId={eventId}
                        tables={tablesResult.data || []}
                        guests={guestsResult.data || []}
                        assignments={assignmentsResult.data || []}
                    />
                </section>
            </div>
        </main>
    );
}
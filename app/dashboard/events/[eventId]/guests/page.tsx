import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import GuestListTable from "@/components/events/GuestListTable";

export default async function GuestsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    await requirePermission("can_manage_guests");

    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

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

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 font-bold text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={18} />
                    Back to Event
                </Link>

                <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                                Guest Management
                            </p>

                            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                                Guest List
                            </h1>

                            <p className="mt-2 text-slate-600">{event.event_name}</p>
                        </div>

                        <div className="rounded-2xl bg-[#F7F5FF] px-5 py-4 text-sm font-black text-[#4F46E5]">
                            {(guests || []).length} guest
                            {(guests || []).length === 1 ? "" : "s"} registered
                        </div>
                    </div>
                </section>

                <GuestListTable guests={guests || []} fields={fields || []} />
            </div>
        </main>
    );
}
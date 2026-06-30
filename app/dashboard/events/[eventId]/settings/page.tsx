import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import EventSettingsForm from "@/components/forms/EventSettingsForm";

export default async function EventSettingsPage({
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

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-4xl">
                <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                    ← Back to Event
                </Link>

                <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-4xl font-black">Event Settings</h1>
                    <p className="mt-2 text-slate-600">{event.event_name}</p>

                    <div className="mt-8">
                        <EventSettingsForm event={event} />
                    </div>
                </div>
            </div>
        </main>
    );
}
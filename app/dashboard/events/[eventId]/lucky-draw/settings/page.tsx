import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import LuckyDrawDisplaySettingsForm from "@/components/lucky-draw/LuckyDrawDisplaySettingsForm";

export default async function LuckyDrawSettingsPage({
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
            <main className="min-h-screen bg-[#F7F5FF] p-8">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const { data: settings } = await supabaseServer
        .from("lucky_draw_display_settings")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

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

                <div className="mt-6">
                    <LuckyDrawDisplaySettingsForm
                        eventId={eventId}
                        initialSettings={settings}
                    />
                </div>
            </div>
        </main>
    );
}
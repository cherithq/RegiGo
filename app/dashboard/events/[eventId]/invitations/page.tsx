import {
    MailCheck,
} from "lucide-react";
import InvitationManager from "@/components/invitations/InvitationManager";
import InvitationCsvImport from "@/components/invitations/InvitationCsvImport";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";
import BackButton from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InvitationsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    await requirePermission("can_manage_guests");

    const { eventId } = await params;
    const supabaseServer =
        await createSupabaseServerClient();

    const { data: event } =
        await supabaseServer
            .from("events")
            .select(
                "id, event_name, event_slug, event_date, event_time, venue",
            )
            .eq("id", eventId)
            .maybeSingle();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">
                        Event not found.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <BackButton href={`/dashboard/events/${eventId}`}>
                    Back to Event
                </BackButton>

                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                    <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-32 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <MailCheck size={16} />
                            Guest Invitations
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                            Invitations & RSVP
                        </h1>

                        <p className="mt-3 text-base font-semibold text-slate-500">
                            {event.event_name}
                        </p>

                        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
                            Send personalised invitation links,
                            track opens, record acceptance or
                            decline, and remind guests who have
                            not responded.
                        </p>
                    </div>
                </section>

                <InvitationCsvImport
                    eventId={eventId}
                />

                <InvitationManager
                    eventId={eventId}
                />
            </div>
        </main>
    );
}

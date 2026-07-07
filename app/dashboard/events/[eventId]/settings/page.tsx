import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EventSettingsForm from "@/components/forms/EventSettingsForm";

export const dynamic = "force-dynamic";

export default async function EventSettingsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabaseServer
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const role = profile?.role;

    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer" || role === "organiser";

    if (!isAdmin && !isOrganizer) {
        redirect("/dashboard");
    }

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-6xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const { data: settings } = await supabaseServer
        .from("event_settings")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-6xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 font-bold text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={18} />
                    Back to Event
                </Link>

                <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <Settings2 size={23} />
                        </div>

                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                                Event Settings
                            </p>

                            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                                Settings
                            </h1>

                            <p className="mt-1 text-slate-600">
                                Manage settings for {eventName}.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <EventSettingsForm
                            event={event}
                            settings={settings}
                            canManageModules={isAdmin}
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}
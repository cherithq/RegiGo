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
        redirect("/auth/login");
    }

    const [profileResult, eventResult, settingsResult] = await Promise.all([
        supabaseServer
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle(),

        supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        supabaseServer
            .from("event_settings")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle(),
    ]);

    const role = profileResult.data?.role;

    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer" || role === "organiser";

    if (!isAdmin && !isOrganizer) {
        redirect("/dashboard");
    }

    const event = eventResult.data;

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-6xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-6xl space-y-5 md:space-y-8">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-56 md:w-56" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-32 md:h-56 md:w-56" />

                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <Settings2 size={23} />
                        </div>

                        <div className="min-w-0">
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#4F46E5] md:text-sm">
                                Event Settings
                            </div>

                            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                                Settings
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                                Manage settings for{" "}
                                <span className="font-black text-slate-950">
                                    {eventName}
                                </span>
                                .
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                    <EventSettingsForm
                        event={event}
                        settings={settingsResult.data}
                        canManageModules={isAdmin}
                    />
                </section>
            </div>
        </main>
    );
}
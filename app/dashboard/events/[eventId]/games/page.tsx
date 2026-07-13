import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gamepad2, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cleanOrganizerEnabledModules } from "@/lib/event-modules";
import { cleanGlitterGamesConfig } from "@/lib/glitter-games";
import GlitterGamesSettingsForm from "@/components/forms/GlitterGamesSettingsForm";

export const dynamic = "force-dynamic";

type Role = "admin" | "organizer" | "organiser" | "viewer" | "scanner" | string;

export default async function GlitterGamesPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;
    const supabaseServer = await createSupabaseServerClient();

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
            .select("id, event_name")
            .eq("id", eventId)
            .maybeSingle(),
        supabaseServer
            .from("event_settings")
            .select("enabled_modules, glitter_games_config")
            .eq("event_id", eventId)
            .maybeSingle(),
    ]);

    const role: Role = profileResult.data?.role || "viewer";
    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer" || role === "organiser";

    if (!isAdmin && !isOrganizer) {
        redirect(`/dashboard/events/${eventId}`);
    }

    if (eventResult.error) {
        return (
            <ErrorPage
                eventId={eventId}
                message={`Failed to load event: ${eventResult.error.message}`}
            />
        );
    }

    const event = eventResult.data;

    if (!event) {
        return <ErrorPage eventId={eventId} message="Event not found." />;
    }

    if (settingsResult.error) {
        return (
            <ErrorPage
                eventId={eventId}
                message={`Failed to load Glitter Games settings: ${settingsResult.error.message}`}
                hint="Run the Step 3 SQL migration in Supabase, then refresh this page."
            />
        );
    }

    const enabledModules = cleanOrganizerEnabledModules(
        settingsResult.data?.enabled_modules,
    );

    if (!isAdmin && !enabledModules.glitter_games) {
        redirect(`/dashboard/events/${eventId}`);
    }

    const initialConfig = cleanGlitterGamesConfig(
        settingsResult.data?.glitter_games_config,
    );

    return (
        <main className="min-h-screen bg-[#F7F5FF] px-4 py-5 text-slate-950 sm:px-6 md:p-8">
            <div className="mx-auto max-w-5xl space-y-5 md:space-y-8">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                >
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-56 md:w-56" />
                    <div className="absolute bottom-0 right-16 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:h-56 md:w-56" />

                    <div className="relative z-10">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] sm:h-14 sm:w-14">
                            <Gamepad2 size={26} aria-hidden="true" />
                        </div>

                        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] sm:px-4 sm:text-sm">
                            <Sparkles size={15} aria-hidden="true" />
                            Glitter Games · Step 3
                        </div>

                        <h1 className="mt-4 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                            Game setup
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                            Select which games will be available for <span className="font-black text-slate-950">{event.event_name || "this event"}</span>. This step stores configuration only; playable guest games are added next.
                        </p>
                    </div>
                </section>

                <GlitterGamesSettingsForm
                    eventId={eventId}
                    initialConfig={initialConfig}
                />
            </div>
        </main>
    );
}

function ErrorPage({
    eventId,
    message,
    hint,
}: {
    eventId: string;
    message: string;
    hint?: string;
}) {
    return (
        <main className="min-h-screen bg-[#F7F5FF] px-4 py-5 text-slate-950 sm:px-6 md:p-8">
            <div className="mx-auto max-w-5xl space-y-5">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm"
                >
                    <ArrowLeft size={17} aria-hidden="true" />
                    Back to Event
                </Link>

                <section className="rounded-[1.5rem] border border-red-200 bg-white p-5 shadow-sm sm:p-6 md:rounded-[2rem] md:p-8">
                    <p className="break-words font-black text-red-600">{message}</p>
                    {hint && (
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                            {hint}
                        </p>
                    )}
                </section>
            </div>
        </main>
    );
}

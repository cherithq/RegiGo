import { redirect } from "next/navigation";
import TapTournamentControl from "@/components/games/TapTournamentControl";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BackButton from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";

export default async function GamesTournamentPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;
    const supabaseServer =
        await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const [{ data: profile }, { data: event }] =
        await Promise.all([
            supabaseServer
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle(),
            supabaseServer
                .from("events")
                .select(
                    "id,event_name,event_slug"
                )
                .eq("id", eventId)
                .maybeSingle(),
        ]);

    if (
        !profile ||
        ![
            "admin",
            "organizer",
            "organiser",
        ].includes(String(profile.role))
    ) {
        redirect(
            `/dashboard/events/${eventId}`
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-6">
                <p className="font-black text-red-600">
                    Event not found.
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl">
                <BackButton
                    href={`/dashboard/events/${eventId}`}
                    className="mb-5"
                >
                    Back to Event
                </BackButton>

                <TapTournamentControl
                    eventId={String(event.id)}
                    eventName={
                        event.event_name ||
                        "Event"
                    }
                    slug={event.event_slug}
                />
            </div>
        </main>
    );
}

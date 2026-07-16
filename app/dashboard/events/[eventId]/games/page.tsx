import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import TapTournamentControl from "@/components/games/TapTournamentControl";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

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

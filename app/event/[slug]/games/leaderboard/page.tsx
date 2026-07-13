import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import GlitterLeaderboard from "@/components/games/GlitterLeaderboard";

export const dynamic = "force-dynamic";

export default async function GlitterLeaderboardPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const supabaseServer = await createSupabaseServerClient();

    const { data: event, error } = await supabaseServer
        .from("events")
        .select("event_name,event_slug")
        .eq("event_slug", slug)
        .maybeSingle();

    if (error || !event) {
        return (
            <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F5FF] px-4 py-8 text-slate-950">
                <section className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm md:rounded-[2rem] md:p-8">
                    <h1 className="text-2xl font-black">Leaderboard unavailable</h1>
                    <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-600">
                        {error?.message || "This event could not be found."}
                    </p>
                    <Link
                        href={`/event/${slug}/games`}
                        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                    >
                        <ArrowLeft size={17} aria-hidden="true" />
                        Back to Games
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <GlitterLeaderboard
            eventName={event.event_name || "this event"}
            slug={slug}
        />
    );
}

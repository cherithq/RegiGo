import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type LeaderboardGameKey =
    | "overall"
    | "coin_flip"
    | "match_cards"
    | "tic_tac_toe"
    | "grab_coins"
    | "tap_fast";

const allowedGameKeys = new Set<LeaderboardGameKey>([
    "overall",
    "coin_flip",
    "match_cards",
    "tic_tac_toe",
    "grab_coins",
    "tap_fast",
]);

function cleanGameKey(value: string | null): LeaderboardGameKey {
    if (!value) return "overall";
    return allowedGameKeys.has(value as LeaderboardGameKey)
        ? (value as LeaderboardGameKey)
        : "overall";
}

export async function GET(
    request: Request,
    context: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await context.params;
        const url = new URL(request.url);
        const requestedLimit = Number(url.searchParams.get("limit") || 20);
        const limit = Number.isFinite(requestedLimit)
            ? Math.max(1, Math.min(Math.trunc(requestedLimit), 50))
            : 20;
        const gameKey = cleanGameKey(url.searchParams.get("game"));

        const supabaseServer = await createSupabaseServerClient();
        const { data: event, error: eventError } = await supabaseServer
            .from("events")
            .select("id")
            .eq("event_slug", slug)
            .maybeSingle();

        if (eventError || !event) {
            return NextResponse.json(
                { error: eventError?.message || "Event not found." },
                { status: 404 },
            );
        }

        const { data, error } = await supabaseServer.rpc(
            "get_glitter_game_leaderboard_v2",
            {
                p_event_id: String(event.id),
                p_game_key: gameKey,
                p_limit: limit,
            },
        );

        if (error) {
            return NextResponse.json(
                { error: error.message || "Unable to load the leaderboard." },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                game: gameKey,
                leaderboard: Array.isArray(data) ? data : [],
            },
            {
                headers: {
                    "Cache-Control": "no-store, max-age=0",
                },
            },
        );
    } catch (error) {
        console.error("Leaderboard request failed:", error);
        return NextResponse.json(
            { error: "Unable to load the leaderboard." },
            { status: 500 },
        );
    }
}

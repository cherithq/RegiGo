import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { playerToken?: unknown; matchToken?: unknown };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await context.params;
        const body = (await request.json()) as Body;
        const playerToken = typeof body.playerToken === "string" ? body.playerToken.trim() : "";
        const matchToken = typeof body.matchToken === "string" ? body.matchToken.trim() : "";
        if (!UUID_RE.test(playerToken)) return json({ error: "Player session expired." }, 401);
        if (!UUID_RE.test(matchToken)) return json({ error: "Match not found." }, 400);

        const supabase = await createSupabaseServerClient();
        const { data: event } = await supabase.from("events").select("id").eq("event_slug", slug).maybeSingle();
        if (!event) return json({ error: "Event not found." }, 404);

        const { data, error } = await supabase.rpc("get_glitter_match_cards_duel_state_v1", {
            p_event_id: String(event.id), p_player_token: playerToken, p_match_token: matchToken,
        });
        if (error) return json({ error: error.message }, error.message.toLowerCase().includes("player session") ? 401 : 400);
        const match = Array.isArray(data) ? data[0] : data;
        return match ? json({ match }) : json({ error: "Match not found." }, 404);
    } catch (error) {
        console.error("Match Cards state failed:", error);
        return json({ error: "Unable to refresh the challenge." }, 500);
    }
}

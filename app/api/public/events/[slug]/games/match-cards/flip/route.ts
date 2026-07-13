import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { playerToken?: unknown; matchToken?: unknown; cardIndex?: unknown };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(body: Record<string, unknown>, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }); }

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await context.params;
        const body = (await request.json()) as Body;
        const playerToken = typeof body.playerToken === "string" ? body.playerToken.trim() : "";
        const matchToken = typeof body.matchToken === "string" ? body.matchToken.trim() : "";
        const cardIndex = typeof body.cardIndex === "number" && Number.isInteger(body.cardIndex) ? body.cardIndex : -1;
        if (!UUID_RE.test(playerToken)) return json({ error: "Player session expired." }, 401);
        if (!UUID_RE.test(matchToken)) return json({ error: "Match not found." }, 400);
        if (cardIndex < 0 || cardIndex > 11) return json({ error: "Choose a valid card." }, 400);

        const supabase = await createSupabaseServerClient();
        const { data: event } = await supabase.from("events").select("id").eq("event_slug", slug).maybeSingle();
        if (!event) return json({ error: "Event not found." }, 404);
        const { data, error } = await supabase.rpc("submit_glitter_match_cards_flip_v1", {
            p_event_id: String(event.id), p_player_token: playerToken, p_match_token: matchToken, p_card_index: cardIndex,
        });
        if (error) return json({ error: error.message }, error.message.toLowerCase().includes("not active") ? 409 : 400);
        const result = Array.isArray(data) ? data[0] : data;
        return result ? json({ result }) : json({ error: "Unable to flip the card." }, 500);
    } catch (error) {
        console.error("Match Cards flip failed:", error);
        return json({ error: "Unable to flip the card." }, 500);
    }
}

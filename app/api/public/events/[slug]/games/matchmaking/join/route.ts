import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JoinBody = {
    playerToken?: unknown;
    gameKey?: unknown;
};

const GAME_KEYS = new Set([
    "coin_flip",
    "match_cards",
    "tap_fast",
    "grab_coins",
    "tic_tac_toe",
]);

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function jsonNoStore(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}

export async function POST(
    request: Request,
    context: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await context.params;
        const body = (await request.json()) as JoinBody;
        const playerToken =
            typeof body.playerToken === "string" ? body.playerToken.trim() : "";
        const gameKey =
            typeof body.gameKey === "string"
                ? body.gameKey.trim().toLowerCase()
                : "";

        if (!isUuid(playerToken)) {
            return jsonNoStore(
                { error: "Verify your checked-in registration again." },
                401,
            );
        }

        if (!GAME_KEYS.has(gameKey)) {
            return jsonNoStore({ error: "Unsupported Glitter Game." }, 400);
        }

        const supabaseServer = await createSupabaseServerClient();
        const { data: event, error: eventError } = await supabaseServer
            .from("events")
            .select("id")
            .eq("event_slug", slug)
            .maybeSingle();

        if (eventError || !event) {
            return jsonNoStore(
                { error: eventError?.message || "Event not found." },
                404,
            );
        }

        const { data, error } = await supabaseServer.rpc(
            "join_glitter_speed_match_v2",
            {
                p_event_id: String(event.id),
                p_player_token: playerToken,
                p_game_key: gameKey,
            },
        );

        if (error) {
            const text = error.message.toLowerCase();
            return jsonNoStore(
                { error: error.message || "Unable to join matchmaking." },
                text.includes("player session")
                    ? 401
                    : text.includes("check-in")
                      ? 403
                      : 400,
            );
        }

        const match = Array.isArray(data) ? data[0] : data;

        if (!match) {
            return jsonNoStore({ error: "Unable to join matchmaking." }, 500);
        }

        return jsonNoStore({ match });
    } catch (error) {
        console.error("Join random Glitter matchmaking failed:", error);
        return jsonNoStore({ error: "Unable to join matchmaking." }, 500);
    }
}

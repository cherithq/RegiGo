import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GuessBody = {
    playerToken?: unknown;
    matchToken?: unknown;
    choice?: unknown;
};

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
        const body = (await request.json()) as GuessBody;
        const playerToken =
            typeof body.playerToken === "string" ? body.playerToken.trim() : "";
        const matchToken =
            typeof body.matchToken === "string" ? body.matchToken.trim() : "";
        const choice =
            typeof body.choice === "string" ? body.choice.trim().toLowerCase() : "";

        if (!isUuid(playerToken)) {
            return jsonNoStore({ error: "Player session expired." }, 401);
        }
        if (!isUuid(matchToken)) {
            return jsonNoStore({ error: "Match not found." }, 400);
        }
        if (choice !== "heads" && choice !== "tails") {
            return jsonNoStore({ error: "Choose heads or tails." }, 400);
        }

        const supabaseServer = await createSupabaseServerClient();
        const { data: event, error: eventError } = await supabaseServer
            .from("events")
            .select("id")
            .eq("event_slug", slug)
            .maybeSingle();

        if (eventError || !event) {
            return jsonNoStore({ error: "Event not found." }, 404);
        }

        const { data, error } = await supabaseServer.rpc(
            "submit_glitter_coin_duel_guess_v1",
            {
                p_event_id: String(event.id),
                p_player_token: playerToken,
                p_match_token: matchToken,
                p_choice: choice,
            },
        );

        if (error) {
            const text = error.message.toLowerCase();
            return jsonNoStore(
                { error: error.message || "Unable to submit guess." },
                text.includes("player session")
                    ? 401
                    : text.includes("match not found")
                      ? 404
                      : text.includes("time is up")
                        ? 409
                        : 400,
            );
        }

        const round = Array.isArray(data) ? data[0] : data;

        if (!round) {
            return jsonNoStore({ error: "Unable to submit guess." }, 500);
        }

        return jsonNoStore({ round });
    } catch (error) {
        console.error("Coin Flip duel guess failed:", error);
        return jsonNoStore({ error: "Unable to submit guess." }, 500);
    }
}

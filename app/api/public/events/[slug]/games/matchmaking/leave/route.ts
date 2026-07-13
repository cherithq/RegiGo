import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LeaveBody = {
    playerToken?: unknown;
    matchToken?: unknown;
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
        const body = (await request.json()) as LeaveBody;
        const playerToken =
            typeof body.playerToken === "string" ? body.playerToken.trim() : "";
        const matchToken =
            typeof body.matchToken === "string" ? body.matchToken.trim() : "";

        if (!isUuid(playerToken)) {
            return jsonNoStore({ error: "Player session expired." }, 401);
        }
        if (!isUuid(matchToken)) {
            return jsonNoStore({ error: "Match not found." }, 400);
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
            "leave_glitter_speed_match_v2",
            {
                p_event_id: String(event.id),
                p_player_token: playerToken,
                p_match_token: matchToken,
            },
        );

        if (error) {
            return jsonNoStore(
                { error: error.message || "Unable to leave match." },
                400,
            );
        }

        const result = Array.isArray(data) ? data[0] : data;
        return jsonNoStore({ result });
    } catch (error) {
        console.error("Leave Glitter matchmaking failed:", error);
        return jsonNoStore({ error: "Unable to leave match." }, 500);
    }
}

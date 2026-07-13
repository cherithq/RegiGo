import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AccessBody = {
    accessToken?: unknown;
    playerToken?: unknown;
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
        const body = (await request.json()) as AccessBody;

        const accessToken =
            typeof body.accessToken === "string" ? body.accessToken.trim() : "";
        const existingPlayerToken =
            typeof body.playerToken === "string" ? body.playerToken.trim() : "";

        if (!isUuid(accessToken)) {
            return jsonNoStore({ error: "This game QR code is invalid." }, 400);
        }

        if (existingPlayerToken && !isUuid(existingPlayerToken)) {
            return jsonNoStore({ error: "Your saved player session is invalid." }, 400);
        }

        const supabaseServer = await createSupabaseServerClient();
        const { data, error } = await supabaseServer.rpc(
            "redeem_glitter_game_access_v1",
            {
                p_event_slug: slug,
                p_access_token: accessToken,
                p_existing_token: existingPlayerToken || null,
            },
        );

        if (error) {
            const errorText = error.message.toLowerCase();
            const status = errorText.includes("complete event check-in")
                ? 403
                : errorText.includes("invalid") ||
                    errorText.includes("another event")
                  ? 404
                  : 400;

            return jsonNoStore(
                { error: error.message || "Unable to open Glitter Games." },
                status,
            );
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result) {
            return jsonNoStore({ error: "Unable to open Glitter Games." }, 500);
        }

        return jsonNoStore({
            eventId: result.event_id,
            player: {
                player_token: result.player_token,
                display_name: result.display_name,
                total_points: Number(result.total_points || 0),
                total_wins: Number(result.total_wins || 0),
                total_plays: Number(result.total_plays || 0),
                registration_id: result.registration_id,
                checked_in: result.checked_in === true,
            },
            redirectUrl: `/event/${encodeURIComponent(slug)}/games`,
        });
    } catch (error) {
        console.error("Glitter Games QR access failed:", error);
        return jsonNoStore({ error: "Unable to open Glitter Games." }, 500);
    }
}

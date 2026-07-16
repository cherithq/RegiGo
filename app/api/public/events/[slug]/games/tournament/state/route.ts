import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    context: {
        params:
            | Promise<{ slug: string }>
            | { slug: string };
    }
) {
    try {
        const { slug } =
            await context.params;
        const body = await request.json();
        const playerToken = String(
            body.playerToken || ""
        ).trim();

        if (!playerToken) {
            throw new Error(
                "Player token is required."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } =
            await supabaseServer.rpc(
                "get_tap_tournament_player_state_v1",
                {
                    p_event_slug: slug,
                    p_player_token:
                        playerToken,
                }
            );

        if (error) {
            throw new Error(error.message);
        }

        let mergedState = data || {};

        if (data?.gameKey === "tic_tac_toe") {
            const {
                data: tttState,
                error: tttError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_ttt_player_state_v1",
                {
                    p_event_slug: slug,
                    p_player_token: playerToken,
                }
            );

            if (tttError) {
                throw new Error(tttError.message);
            }

            mergedState = {
                ...mergedState,
                ...(tttState || {}),
            };
        }

        return NextResponse.json(
            {
                state: mergedState,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load tournament.",
            },
            {
                status: 400,
            }
        );
    }
}

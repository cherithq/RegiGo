import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
    request: Request,
    context: {
        params:
            | Promise<{ slug: string }>
            | { slug: string };
    }
) {
    try {
        const { slug } = await context.params;
        const body = await request.json();
        const playerToken = String(
            body.playerToken || ""
        ).trim();
        const ready = body.ready !== false;

        if (!playerToken) {
            throw new Error(
                "Player token is required."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "set_tap_tournament_player_ready_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_ready: ready,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        const {
            data: state,
            error: stateError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_ready_player_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
            }
        );

        if (stateError) {
            throw new Error(stateError.message);
        }

        return NextResponse.json({
            success: true,
            result: data,
            state,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to update ready status.",
            },
            { status: 400 }
        );
    }
}

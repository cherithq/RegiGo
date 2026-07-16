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
        const cell = Number(body.cell);

        if (!playerToken) {
            throw new Error(
                "Player token is required."
            );
        }

        if (
            !Number.isInteger(cell) ||
            cell < 0 ||
            cell > 8
        ) {
            throw new Error(
                "Choose a valid Tic-Tac-Toe cell."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_tap_tournament_ttt_move_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_cell: cell,
            }
        );

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 409 }
            );
        }

        const { data: state, error: stateError } =
            await supabaseServer.rpc(
                "get_tap_tournament_ttt_player_state_v1",
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
                        : "Unable to place the mark.",
            },
            { status: 400 }
        );
    }
}

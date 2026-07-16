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
        const choice = String(
            body.choice || ""
        )
            .trim()
            .toLowerCase();

        if (!playerToken) {
            throw new Error(
                "Player token is required."
            );
        }

        if (
            choice !== "heads" &&
            choice !== "tails"
        ) {
            throw new Error(
                "Choose heads or tails."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_coin_flip_tournament_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_choice: choice,
            }
        );

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 409 }
            );
        }

        return NextResponse.json({
            success: true,
            result: data,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to submit Coin Flip guess.",
            },
            { status: 400 }
        );
    }
}

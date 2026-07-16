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
        const cardIndex = Number(body.cardIndex);

        if (!playerToken) {
            throw new Error(
                "Player token is required."
            );
        }

        if (
            !Number.isInteger(cardIndex) ||
            cardIndex < 0 ||
            cardIndex > 11
        ) {
            throw new Error(
                "Choose a valid card."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_match_card_tournament_flip_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_card_index: cardIndex,
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
                        : "Unable to flip the card.",
            },
            { status: 400 }
        );
    }
}

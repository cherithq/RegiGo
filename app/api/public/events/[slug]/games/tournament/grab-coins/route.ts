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
        const coinNonce = String(
            body.coinNonce || ""
        ).trim();

        if (!playerToken || !coinNonce) {
            throw new Error(
                "Player token and coin token are required."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_grab_coin_tournament_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_coin_nonce: coinNonce,
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
                        : "Unable to collect the coin.",
            },
            { status: 400 }
        );
    }
}

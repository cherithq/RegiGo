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
        const taps = Math.max(
            1,
            Math.min(
                10,
                Math.floor(
                    Number(body.taps || 1)
                )
            )
        );

        if (!playerToken) {
            throw new Error(
                "Player token is required."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } =
            await supabaseServer.rpc(
                "submit_tap_tournament_batch_v1",
                {
                    p_event_slug: slug,
                    p_player_token:
                        playerToken,
                    p_taps: taps,
                }
            );

        if (error) {
            return NextResponse.json(
                {
                    error: error.message,
                },
                {
                    status: 409,
                }
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
                        : "Unable to submit taps.",
            },
            {
                status: 400,
            }
        );
    }
}

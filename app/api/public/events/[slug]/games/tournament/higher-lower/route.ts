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
        const promptNonce = String(
            body.promptNonce || ""
        ).trim();
        const selectedDirection = String(
            body.selectedDirection || ""
        ).trim();

        if (!playerToken || !promptNonce) {
            throw new Error(
                "Player and prompt tokens are required."
            );
        }

        if (
            !["higher", "lower"].includes(
                selectedDirection
            )
        ) {
            throw new Error(
                "Choose higher or lower."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_higher_lower_answer_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_prompt_nonce: promptNonce,
                p_selected_direction:
                    selectedDirection,
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
                        : "Unable to submit the prediction.",
            },
            { status: 400 }
        );
    }
}

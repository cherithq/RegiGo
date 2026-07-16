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
        const selectedAnswer = Number(
            body.selectedAnswer
        );

        if (!playerToken || !promptNonce) {
            throw new Error(
                "Player and question tokens are required."
            );
        }

        if (!Number.isInteger(selectedAnswer)) {
            throw new Error(
                "Choose a valid answer."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_quick_math_answer_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_prompt_nonce: promptNonce,
                p_selected_answer: selectedAnswer,
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
                        : "Unable to submit the answer.",
            },
            { status: 400 }
        );
    }
}

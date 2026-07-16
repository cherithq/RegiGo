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
        const selectedColour = String(
            body.selectedColour || ""
        ).trim();

        if (!playerToken || !promptNonce) {
            throw new Error(
                "Player and prompt tokens are required."
            );
        }

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } = await supabaseServer.rpc(
            "submit_color_clash_answer_v1",
            {
                p_event_slug: slug,
                p_player_token: playerToken,
                p_prompt_nonce: promptNonce,
                p_selected_colour: selectedColour,
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
                        : "Unable to submit the colour.",
            },
            { status: 400 }
        );
    }
}

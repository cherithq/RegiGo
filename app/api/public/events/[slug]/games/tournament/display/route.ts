import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    _request: Request,
    context: {
        params:
            | Promise<{ slug: string }>
            | { slug: string };
    }
) {
    try {
        const { slug } =
            await context.params;
        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } =
            await supabaseServer.rpc(
                "get_tap_tournament_public_state_v1",
                {
                    p_event_slug: slug,
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
                "get_tap_tournament_ttt_public_state_v1",
                {
                    p_event_slug: slug,
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
                        "no-store, no-cache, must-revalidate, max-age=0",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load display.",
            },
            {
                status: 400,
            }
        );
    }
}

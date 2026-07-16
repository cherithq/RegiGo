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

        const lookup = String(
            body.lookup || ""
        ).trim();
        const existingToken =
            typeof body.existingToken ===
                "string" &&
            body.existingToken
                ? body.existingToken
                : null;

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } =
            await supabaseServer.rpc(
                "join_tap_tournament_v1",
                {
                    p_event_slug: slug,
                    p_lookup: lookup,
                    p_existing_token:
                        existingToken,
                }
            );

        if (error) {
            throw new Error(error.message);
        }

        const player = Array.isArray(data)
            ? data[0]
            : data;

        return NextResponse.json({
            success: true,
            player,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to join tournament.",
            },
            {
                status: 400,
            }
        );
    }
}

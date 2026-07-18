import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JoinBody = {
    displayName?: unknown;
    lookup?: unknown;
    existingToken?: unknown;
};

function cleanDisplayName(value: unknown) {
    return typeof value === "string"
        ? value.trim().replace(/\s+/g, " ")
        : "";
}

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
        const body =
            (await request.json()) as JoinBody;

        const displayName = cleanDisplayName(
            body.displayName ?? body.lookup
        );

        if (!displayName) {
            return NextResponse.json(
                {
                    error:
                        "Enter a display name.",
                },
                { status: 400 }
            );
        }

        if (displayName.length > 60) {
            return NextResponse.json(
                {
                    error:
                        "Display name must be 60 characters or fewer.",
                },
                { status: 400 }
            );
        }

        const existingToken =
            typeof body.existingToken ===
                "string" &&
            body.existingToken.trim()
                ? body.existingToken.trim()
                : null;

        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } =
            await supabaseServer.rpc(
                "join_tap_tournament_v1",
                {
                    p_event_slug: slug,
                    // The SQL argument keeps its old name so existing
                    // clients remain compatible. It now contains a
                    // public display name, not a registration lookup.
                    p_lookup: displayName,
                    p_existing_token:
                        existingToken,
                }
            );

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 409 }
            );
        }

        const player = Array.isArray(data)
            ? data[0]
            : data;

        if (!player?.player_token) {
            return NextResponse.json(
                {
                    error:
                        "Unable to create the tournament player.",
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                player,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to join the tournament.",
            },
            { status: 400 }
        );
    }
}

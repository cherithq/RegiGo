import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
    request: Request,
    context: {
        params:
            | Promise<{ eventId: string }>
            | { eventId: string };
    }
) {
    try {
        const { eventId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const gameKey = String(
            body.gameKey || "tap_fast"
        ).trim();

        const supabaseServer =
            await createSupabaseServerClient();

        const {
            data: { user },
        } = await supabaseServer.auth.getUser();

        if (!user) {
            throw new Error("Sign in required.");
        }

        const { data: profile } = await supabaseServer
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (
            !profile ||
            !["admin", "organizer", "organiser"].includes(
                String(profile.role)
            )
        ) {
            throw new Error(
                "You cannot start this tournament."
            );
        }

        const { data, error } = await supabaseServer.rpc(
            "start_tap_tournament_round_v3",
            {
                p_event_id: String(eventId),
                p_game_key: gameKey,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        const message =
            gameKey === "tic_tac_toe"
                ? "Tic-Tac-Toe pairings created. Winners advance and draws automatically rematch."
                : gameKey === "coin_flip"
                  ? "Coin Flip countdown started. Each player receives three flips."
                  : "Tap, Tap, Tap countdown started. The round lasts exactly 20 seconds.";

        return NextResponse.json({
            success: true,
            round: data,
            message,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to start the round.",
            },
            { status: 400 }
        );
    }
}

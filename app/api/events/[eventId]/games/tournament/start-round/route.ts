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
            "start_tap_tournament_round_v11",
            {
                p_event_id: String(eventId),
                p_game_key: gameKey,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        const message =
            gameKey === "higher_lower"
                ? "Higher or Lower countdown started. Players have 30 seconds to predict whether each hidden number is higher or lower."
                : gameKey === "sort_it_out"
                ? "Sort It Out countdown started. Players have 30 seconds to arrange shuffled numbers from smallest to largest."
                : gameKey === "quick_math"
                ? "Quick Maths countdown started. Players have 30 seconds to solve as many questions as possible."
                : gameKey === "odd_one_out"
                ? "Odd One Out countdown started. Players have 30 seconds to find the different symbol."
                : gameKey === "color_clash"
                ? "Colour Clash countdown started. Players have 30 seconds to identify the displayed text colour."
                : gameKey === "number_rush"
                ? "Number Rush countdown started. Players have 30 seconds to tap numbers in order."
                : gameKey === "match_cards"
                ? "Match the Cards countdown started. Players have 45 seconds to find six pairs."
                : gameKey === "grab_coins"
                  ? "Grab the Coins countdown started. The round lasts 30 seconds."
                  : gameKey === "tic_tac_toe"
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

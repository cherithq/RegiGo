import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
    _request: Request,
    context: {
        params:
            | Promise<{ eventId: string }>
            | { eventId: string };
    }
) {
    try {
        const { eventId } = await context.params;
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
                "You cannot manage this tournament."
            );
        }

        const { data: tournament } = await supabaseServer
            .from("tap_tournaments")
            .select("id,current_round")
            .eq("event_id", String(eventId))
            .order("created_at", {
                ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (!tournament) {
            throw new Error("Tournament not found.");
        }

        const { data: round } = await supabaseServer
            .from("tap_tournament_rounds")
            .select("id,game_key")
            .eq("tournament_id", tournament.id)
            .eq("round_number", tournament.current_round)
            .maybeSingle();

        if (!round) {
            throw new Error(
                "No current round was found."
            );
        }

        if (round.game_key === "tic_tac_toe") {
            const { count, error: matchError } =
                await supabaseServer
                    .from("tap_tournament_ttt_matches")
                    .select("id", {
                        count: "exact",
                        head: true,
                    })
                    .eq("round_id", round.id)
                    .eq("status", "active");

            if (matchError) {
                throw new Error(matchError.message);
            }

            if ((count || 0) > 0) {
                throw new Error(
                    `${count} Tic-Tac-Toe match${
                        count === 1 ? "" : "es"
                    } still need a winner. Draws automatically rematch.`
                );
            }
        }

        const { error } = await supabaseServer.rpc(
            "finalize_tap_tournament_round_v3",
            {
                p_round_id: round.id,
                p_force:
                    round.game_key === "coin_flip",
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json({
            success: true,
            message:
                round.game_key === "tic_tac_toe"
                    ? "Tic-Tac-Toe results confirmed."
                    : round.game_key === "coin_flip"
                      ? "Coin Flip round finalized."
                      : "Tap round refresh requested. It finalizes only after 20 seconds.",
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to finalize the round.",
            },
            { status: 400 }
        );
    }
}

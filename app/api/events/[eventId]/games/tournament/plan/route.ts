import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALL_GAME_KEYS = [
    "tap_fast",
    "coin_flip",
    "tic_tac_toe",
    "grab_coins",
    "match_cards",
    "number_rush",
    "color_clash",
    "odd_one_out",
    "quick_math",
    "sort_it_out",
    "higher_lower",
] as const;

const FINAL_GAME_KEYS = [
    "tap_fast",
    "coin_flip",
    "grab_coins",
    "match_cards",
    "number_rush",
    "color_clash",
    "odd_one_out",
    "quick_math",
    "sort_it_out",
    "higher_lower",
] as const;

type GameKey = (typeof ALL_GAME_KEYS)[number];
type FinalGameKey = (typeof FINAL_GAME_KEYS)[number];

function json(
    body: Record<string, unknown>,
    status = 200
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function isGameKey(value: unknown): value is GameKey {
    return ALL_GAME_KEYS.includes(
        String(value) as GameKey
    );
}

function isFinalGameKey(
    value: unknown
): value is FinalGameKey {
    return FINAL_GAME_KEYS.includes(
        String(value) as FinalGameKey
    );
}

async function requireManager(eventId: string) {
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
            "You do not have access to the tournament plan."
        );
    }

    const { data: event } = await supabaseServer
        .from("events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();

    if (!event) {
        throw new Error(
            "Event not found or not assigned to you."
        );
    }

    const { data: tournament } = await supabaseServer
        .from("tap_tournaments")
        .select(
            "id,status,current_round,final_size"
        )
        .eq("event_id", String(eventId))
        .order("created_at", {
            ascending: false,
        })
        .limit(1)
        .maybeSingle();

    return {
        supabaseServer,
        user,
        tournament,
    };
}

async function loadPlan(
    supabaseServer: Awaited<
        ReturnType<typeof createSupabaseServerClient>
    >,
    tournament: {
        id: string;
        status: string;
        current_round: number;
        final_size: number;
    } | null
) {
    if (!tournament) {
        return {
            tournamentStatus: "not_created",
            currentRound: 0,
            activePlayers: 0,
            finalSize: 10,
            steps: [
                "tic_tac_toe",
                "coin_flip",
                "match_cards",
                "grab_coins",
                "number_rush",
                "color_clash",
                "odd_one_out",
                "quick_math",
                "sort_it_out",
                "higher_lower",
                "tap_fast",
            ],
            finalGameKey: "tap_fast",
            suggestedGameKey: "tic_tac_toe",
            isFinalNext: false,
        };
    }

    const { error: ensureError } =
        await supabaseServer.rpc(
            "ensure_tap_tournament_default_plan_v1",
            {
                p_tournament_id: tournament.id,
            }
        );

    if (ensureError) {
        throw new Error(ensureError.message);
    }

    const [
        stepsResult,
        settingsResult,
        activePlayersResult,
    ] = await Promise.all([
        supabaseServer
            .from("tap_tournament_plan_steps")
            .select("step_number,game_key")
            .eq("tournament_id", tournament.id)
            .order("step_number", {
                ascending: true,
            }),
        supabaseServer
            .from("tap_tournament_plan_settings")
            .select("final_game_key")
            .eq("tournament_id", tournament.id)
            .maybeSingle(),
        supabaseServer
            .from("tap_tournament_players")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("tournament_id", tournament.id)
            .eq("status", "active"),
    ]);

    if (stepsResult.error) {
        throw new Error(stepsResult.error.message);
    }

    if (settingsResult.error) {
        throw new Error(
            settingsResult.error.message
        );
    }

    if (activePlayersResult.error) {
        throw new Error(
            activePlayersResult.error.message
        );
    }

    const steps = (stepsResult.data || [])
        .map((step) => String(step.game_key))
        .filter(isGameKey);

    const finalGameKey = isFinalGameKey(
        settingsResult.data?.final_game_key
    )
        ? settingsResult.data.final_game_key
        : "tap_fast";

    const activePlayers =
        activePlayersResult.count || 0;
    const isFinalNext =
        activePlayers > 0 &&
        activePlayers <=
            Number(tournament.final_size || 10);

    const plannedIndex = Math.max(
        0,
        Number(tournament.current_round || 0)
    );

    let suggestedGameKey: GameKey =
        steps[plannedIndex] ||
        steps[steps.length - 1] ||
        "tap_fast";

    if (isFinalNext) {
        suggestedGameKey = finalGameKey;
    } else if (
        suggestedGameKey === "tic_tac_toe" &&
        activePlayers > 0 &&
        activePlayers <= 10
    ) {
        suggestedGameKey = "tap_fast";
    }

    return {
        tournamentStatus: tournament.status,
        currentRound:
            Number(tournament.current_round || 0),
        activePlayers,
        finalSize:
            Number(tournament.final_size || 10),
        steps,
        finalGameKey,
        suggestedGameKey,
        isFinalNext,
    };
}

export async function GET(
    _request: Request,
    context: {
        params:
            | Promise<{ eventId: string }>
            | { eventId: string };
    }
) {
    try {
        const { eventId } = await context.params;
        const { supabaseServer, tournament } =
            await requireManager(eventId);

        return json({
            plan: await loadPlan(
                supabaseServer,
                tournament
            ),
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load the round sequence.",
            },
            400
        );
    }
}

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
        const {
            supabaseServer,
            user,
            tournament,
        } = await requireManager(eventId);

        if (!tournament) {
            throw new Error(
                "Create the tournament lobby before saving the sequence."
            );
        }

        if (
            ["countdown", "active"].includes(
                String(tournament.status)
            )
        ) {
            throw new Error(
                "The sequence cannot be changed while a round is running."
            );
        }

        const body = await request.json();
        const rawSteps = Array.isArray(body.steps)
            ? body.steps
            : [];

        const steps = rawSteps
            .map(String)
            .filter(isGameKey)
            .slice(0, 12);

        if (steps.length === 0) {
            throw new Error(
                "Add at least one elimination-round game."
            );
        }

        const finalGameKey = isFinalGameKey(
            body.finalGameKey
        )
            ? body.finalGameKey
            : "tap_fast";

        const { error: deleteError } =
            await supabaseServer
                .from("tap_tournament_plan_steps")
                .delete()
                .eq(
                    "tournament_id",
                    tournament.id
                );

        if (deleteError) {
            throw new Error(deleteError.message);
        }

        const { error: insertError } =
            await supabaseServer
                .from("tap_tournament_plan_steps")
                .insert(
                    steps.map(
                        (
                            gameKey,
                            index
                        ) => ({
                            tournament_id:
                                tournament.id,
                            step_number: index + 1,
                            game_key: gameKey,
                        })
                    )
                );

        if (insertError) {
            throw new Error(insertError.message);
        }

        const { error: settingsError } =
            await supabaseServer
                .from(
                    "tap_tournament_plan_settings"
                )
                .upsert(
                    {
                        tournament_id:
                            tournament.id,
                        final_game_key:
                            finalGameKey,
                        updated_by: user.id,
                        updated_at:
                            new Date().toISOString(),
                    },
                    {
                        onConflict:
                            "tournament_id",
                    }
                );

        if (settingsError) {
            throw new Error(
                settingsError.message
            );
        }

        return json({
            success: true,
            message:
                "Tournament sequence saved.",
            plan: await loadPlan(
                supabaseServer,
                tournament
            ),
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to save the round sequence.",
            },
            400
        );
    }
}

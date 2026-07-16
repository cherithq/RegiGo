import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function requireManager(
    eventId: string
) {
    const supabaseServer =
        await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        throw new Error("Sign in required.");
    }

    const { data: profile } =
        await supabaseServer
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

    if (
        !profile ||
        ![
            "admin",
            "organizer",
            "organiser",
        ].includes(String(profile.role))
    ) {
        throw new Error(
            "You do not have access to this tournament."
        );
    }

    const { data: event } =
        await supabaseServer
            .from("events")
            .select(
                "id,event_slug,event_name"
            )
            .eq("id", eventId)
            .maybeSingle();

    if (!event) {
        throw new Error(
            "Event not found or not assigned to you."
        );
    }

    return {
        supabaseServer,
        user,
        event,
    };
}

async function loadState(
    supabaseServer: Awaited<
        ReturnType<
            typeof createSupabaseServerClient
        >
    >,
    slug: string
) {
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

    if (data?.gameKey === "higher_lower") {
        const {
            data: higherLowerState,
            error: higherLowerError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_higher_lower_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (higherLowerError) {
            throw new Error(
                higherLowerError.message
            );
        }

        return {
            ...(data || {}),
            ...(higherLowerState || {}),
        };
    }

    if (data?.gameKey === "sort_it_out") {
        const {
            data: sortState,
            error: sortError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_sort_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (sortError) {
            throw new Error(sortError.message);
        }

        return {
            ...(data || {}),
            ...(sortState || {}),
        };
    }

    if (data?.gameKey === "quick_math") {
        const {
            data: quickMathState,
            error: quickMathError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_quick_math_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (quickMathError) {
            throw new Error(quickMathError.message);
        }

        return {
            ...(data || {}),
            ...(quickMathState || {}),
        };
    }

    if (data?.gameKey === "odd_one_out") {
        const {
            data: oddState,
            error: oddError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_odd_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (oddError) {
            throw new Error(oddError.message);
        }

        return {
            ...(data || {}),
            ...(oddState || {}),
        };
    }

    if (data?.gameKey === "color_clash") {
        const {
            data: colourState,
            error: colourError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_color_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (colourError) {
            throw new Error(colourError.message);
        }

        return {
            ...(data || {}),
            ...(colourState || {}),
        };
    }

    if (data?.gameKey === "number_rush") {
        const {
            data: numberState,
            error: numberError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_number_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (numberError) {
            throw new Error(numberError.message);
        }

        return {
            ...(data || {}),
            ...(numberState || {}),
        };
    }

    if (data?.gameKey === "match_cards") {
        const {
            data: matchState,
            error: matchError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_match_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (matchError) {
            throw new Error(matchError.message);
        }

        return {
            ...(data || {}),
            ...(matchState || {}),
        };
    }

    if (data?.gameKey === "grab_coins") {
        const {
            data: grabState,
            error: grabError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_grab_public_state_v1",
            {
                p_event_slug: slug,
            }
        );

        if (grabError) {
            throw new Error(grabError.message);
        }

        return {
            ...(data || {}),
            ...(grabState || {}),
        };
    }

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

        return {
            ...(data || {}),
            ...(tttState || {}),
        };
    }

    return data;
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
        const { eventId } =
            await context.params;
        const {
            supabaseServer,
            event,
        } = await requireManager(eventId);

        return json({
            state: await loadState(
                supabaseServer,
                event.event_slug
            ),
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load tournament.",
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
        const { eventId } =
            await context.params;
        const {
            supabaseServer,
            user,
            event,
        } = await requireManager(eventId);
        const body = await request.json();
        const action = String(
            body.action || ""
        );

        const { data: current } =
            await supabaseServer
                .from("tap_tournaments")
                .select("*")
                .eq(
                    "event_id",
                    String(event.id)
                )
                .in("status", [
                    "lobby",
                    "locked",
                    "countdown",
                    "active",
                    "round_complete",
                ])
                .order("created_at", {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle();

        if (action === "create") {
            if (!current) {
                const { error } =
                    await supabaseServer
                        .from(
                            "tap_tournaments"
                        )
                        .insert({
                            event_id: String(
                                event.id
                            ),
                            event_slug:
                                event.event_slug,
                            event_name:
                                event.event_name ||
                                "Event",
                            status: "lobby",
                            round_duration_seconds: 20,
                            countdown_seconds: 5,
                            final_size: 10,
                            created_by: user.id,
                        });

                if (error) {
                    throw new Error(
                        error.message
                    );
                }
            }
        } else if (action === "lock") {
            if (!current) {
                throw new Error(
                    "Create the lobby first."
                );
            }

            const {
                count,
                error: countError,
            } = await supabaseServer
                .from(
                    "tap_tournament_players"
                )
                .select("id", {
                    count: "exact",
                    head: true,
                })
                .eq(
                    "tournament_id",
                    current.id
                )
                .eq("status", "active");

            if (countError) {
                throw new Error(
                    countError.message
                );
            }

            if ((count || 0) < 2) {
                throw new Error(
                    "At least two players must join before locking."
                );
            }

            const { error } =
                await supabaseServer
                    .from("tap_tournaments")
                    .update({
                        status: "locked",
                        updated_at:
                            new Date().toISOString(),
                    })
                    .eq("id", current.id)
                    .eq("status", "lobby");

            if (error) {
                throw new Error(
                    error.message
                );
            }
        } else if (action === "open") {
            if (!current) {
                throw new Error(
                    "Create the lobby first."
                );
            }

            if (
                Number(
                    current.current_round || 0
                ) > 0
            ) {
                throw new Error(
                    "The lobby cannot reopen after Round 1 starts."
                );
            }

            const { error } =
                await supabaseServer
                    .from("tap_tournaments")
                    .update({
                        status: "lobby",
                        updated_at:
                            new Date().toISOString(),
                    })
                    .eq("id", current.id)
                    .eq("status", "locked");

            if (error) {
                throw new Error(
                    error.message
                );
            }
        } else if (action === "reset") {
            const { error: deleteError } =
                await supabaseServer
                    .from("tap_tournaments")
                    .delete()
                    .eq(
                        "event_id",
                        String(event.id)
                    );

            if (deleteError) {
                throw new Error(
                    deleteError.message
                );
            }

            const { error: insertError } =
                await supabaseServer
                    .from("tap_tournaments")
                    .insert({
                        event_id: String(
                            event.id
                        ),
                        event_slug:
                            event.event_slug,
                        event_name:
                            event.event_name ||
                            "Event",
                        status: "lobby",
                        round_duration_seconds: 20,
                        countdown_seconds: 5,
                        final_size: 10,
                        created_by: user.id,
                    });

            if (insertError) {
                throw new Error(
                    insertError.message
                );
            }
        } else {
            throw new Error(
                "Unsupported tournament action."
            );
        }

        return json({
            success: true,
            state: await loadState(
                supabaseServer,
                event.event_slug
            ),
            message:
                action === "lock"
                    ? "Players are locked."
                    : action === "open"
                      ? "The lobby is open again."
                      : action === "reset"
                        ? "A fresh tournament lobby has been created."
                        : "Tournament lobby is ready.",
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Tournament action failed.",
            },
            400
        );
    }
}

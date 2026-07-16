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

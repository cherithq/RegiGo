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
            "You do not have access to tournament management."
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

    return {
        supabaseServer,
        event,
    };
}

async function loadManagementState(
    supabaseServer: Awaited<
        ReturnType<typeof createSupabaseServerClient>
    >,
    eventId: string
) {
    const { data, error } = await supabaseServer.rpc(
        "get_tap_tournament_manager_state_v1",
        {
            p_event_id: String(eventId),
        }
    );

    if (error) {
        throw new Error(error.message);
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
        const { eventId } = await context.params;
        const { supabaseServer } =
            await requireManager(eventId);

        return json({
            management: await loadManagementState(
                supabaseServer,
                eventId
            ),
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load tournament management.",
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
        const { supabaseServer } =
            await requireManager(eventId);
        const body = await request.json();

        const playerId = String(
            body.playerId || ""
        ).trim();
        const action = String(
            body.action || ""
        ).trim();
        const reason = String(
            body.reason || ""
        ).trim();

        if (!playerId) {
            throw new Error(
                "Tournament player ID is required."
            );
        }

        const { data, error } = await supabaseServer.rpc(
            "manage_tap_tournament_player_v1",
            {
                p_event_id: String(eventId),
                p_player_id: playerId,
                p_action: action,
                p_reason: reason || null,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        return json({
            success: true,
            result: data,
            management: await loadManagementState(
                supabaseServer,
                eventId
            ),
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to update player.",
            },
            400
        );
    }
}

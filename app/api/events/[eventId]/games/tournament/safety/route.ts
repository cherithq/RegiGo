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

async function requireManager() {
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
            "You do not have access to tournament safety controls."
        );
    }

    return supabaseServer;
}

async function loadSafety(
    supabaseServer: Awaited<
        ReturnType<typeof createSupabaseServerClient>
    >,
    eventId: string
) {
    const { data, error } = await supabaseServer.rpc(
        "get_tap_tournament_safety_manager_v1",
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
        const supabaseServer =
            await requireManager();

        return json({
            safety: await loadSafety(
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
                        : "Unable to load safety controls.",
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
        const supabaseServer =
            await requireManager();
        const body = await request.json();
        const action = String(
            body.action || ""
        ).trim();
        const reason = String(
            body.reason || ""
        ).trim();

        const { data, error } = await supabaseServer.rpc(
            "control_tap_tournament_safety_v1",
            {
                p_event_id: String(eventId),
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
            safety: await loadSafety(
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
                        : "Unable to update tournament safety state.",
            },
            400
        );
    }
}

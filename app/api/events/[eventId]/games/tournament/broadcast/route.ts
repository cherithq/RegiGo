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
            "You do not have access to host broadcasts."
        );
    }

    return supabaseServer;
}

async function loadBroadcast(
    supabaseServer: Awaited<
        ReturnType<typeof createSupabaseServerClient>
    >,
    eventId: string
) {
    const { data, error } = await supabaseServer.rpc(
        "get_tap_tournament_broadcast_manager_v1",
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
            broadcast: await loadBroadcast(
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
                        : "Unable to load host broadcasts.",
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

        const rawDuration =
            body.durationSeconds;
        const durationSeconds =
            rawDuration === null ||
            rawDuration === undefined ||
            rawDuration === "" ||
            Number(rawDuration) === 0
                ? null
                : Number(rawDuration);

        const { data, error } = await supabaseServer.rpc(
            "control_tap_tournament_broadcast_v1",
            {
                p_event_id: String(eventId),
                p_action: action,
                p_title:
                    action === "publish"
                        ? String(body.title || "")
                        : null,
                p_message:
                    action === "publish"
                        ? String(body.message || "")
                        : null,
                p_tone:
                    action === "publish"
                        ? String(body.tone || "info")
                        : "info",
                p_display_mode:
                    action === "publish"
                        ? String(
                              body.displayMode ||
                                  "banner"
                          )
                        : "banner",
                p_duration_seconds:
                    durationSeconds,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        return json({
            success: true,
            result: data,
            broadcast: await loadBroadcast(
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
                        : "Unable to update host broadcast.",
            },
            400
        );
    }
}

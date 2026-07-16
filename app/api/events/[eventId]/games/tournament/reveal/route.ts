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
            "You do not have access to result controls."
        );
    }

    return supabaseServer;
}

async function loadState(
    supabaseServer: Awaited<
        ReturnType<typeof createSupabaseServerClient>
    >,
    eventId: string
) {
    const { data, error } = await supabaseServer.rpc(
        "get_tap_tournament_result_manager_v1",
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
            await requireManager(eventId);

        return json({
            reveal: await loadState(
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
                        : "Unable to load result controls.",
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
            await requireManager(eventId);
        const body = await request.json();
        const action = String(
            body.action || ""
        ).trim();

        const { data, error } = await supabaseServer.rpc(
            "advance_tap_tournament_presentation_v1",
            {
                p_event_id: String(eventId),
                p_action: action,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        return json({
            success: true,
            result: data,
            reveal: await loadState(
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
                        : "Unable to update result presentation.",
            },
            400
        );
    }
}

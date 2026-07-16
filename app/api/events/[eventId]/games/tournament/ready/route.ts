import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
                "You do not have access to the ready check."
            );
        }

        const { data, error } = await supabaseServer.rpc(
            "get_tap_tournament_ready_manager_v1",
            {
                p_event_id: String(eventId),
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json(
            { ready: data },
            {
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate, max-age=0",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load the ready check.",
            },
            { status: 400 }
        );
    }
}

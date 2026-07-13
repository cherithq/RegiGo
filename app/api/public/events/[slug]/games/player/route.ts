import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlayerRequestBody = {
    displayName?: unknown;
    lookup?: unknown;
    email?: unknown;
    registrationId?: unknown;
    playerToken?: unknown;
};

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function jsonNoStore(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}

export async function POST(
    request: Request,
    context: { params: Promise<{ slug: string }> },
) {
    try {
        const { slug } = await context.params;
        const body = (await request.json()) as PlayerRequestBody;

        // displayName remains accepted temporarily so the existing five game
        // components continue working. It is now treated as a registration
        // lookup, never as a freely-created anonymous name.
        const lookup =
            cleanString(body.lookup) ||
            cleanString(body.email) ||
            cleanString(body.displayName);
        const registrationId = cleanString(body.registrationId);
        const tokenText = cleanString(body.playerToken);
        const playerToken = tokenText && isUuid(tokenText) ? tokenText : null;

        if (!playerToken && !lookup && !registrationId) {
            return jsonNoStore(
                {
                    error:
                        "Enter the email or full name used for event registration.",
                },
                400,
            );
        }

        if (lookup.length > 160) {
            return jsonNoStore({ error: "Registration lookup is too long." }, 400);
        }

        if (registrationId && !isUuid(registrationId)) {
            return jsonNoStore({ error: "Invalid registration ID." }, 400);
        }

        const supabaseServer = await createSupabaseServerClient();
        const { data: event, error: eventError } = await supabaseServer
            .from("events")
            .select("id")
            .eq("event_slug", slug)
            .maybeSingle();

        if (eventError || !event) {
            return jsonNoStore(
                { error: eventError?.message || "Event not found." },
                404,
            );
        }

        const { data, error } = await supabaseServer.rpc(
            "register_checked_in_glitter_player_v1",
            {
                p_event_id: String(event.id),
                p_lookup: lookup || null,
                p_registration_id: registrationId || null,
                p_existing_token: playerToken,
            },
        );

        if (error) {
            const errorText = error.message.toLowerCase();
            const status = errorText.includes("complete event check-in")
                ? 403
                : errorText.includes("registration not found")
                  ? 404
                  : 400;

            return jsonNoStore(
                { error: error.message || "Unable to verify the guest." },
                status,
            );
        }

        const player = Array.isArray(data) ? data[0] : data;

        if (!player) {
            return jsonNoStore({ error: "Unable to verify the guest." }, 500);
        }

        return jsonNoStore({ player });
    } catch (error) {
        console.error("Checked-in Glitter Games player request failed:", error);
        return jsonNoStore(
            { error: "Unable to verify the checked-in guest." },
            500,
        );
    }
}

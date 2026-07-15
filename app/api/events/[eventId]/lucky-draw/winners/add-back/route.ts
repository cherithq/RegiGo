import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
    registrationId?: unknown;
    addAll?: unknown;
};

function jsonNoStore(
    body: Record<string, unknown>,
    status = 200
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
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
        const body = (await request.json()) as RequestBody;

        const registrationId =
            typeof body.registrationId === "string"
                ? body.registrationId.trim()
                : "";
        const addAll = body.addAll === true;

        if (!addAll && !registrationId) {
            return jsonNoStore(
                {
                    error:
                        "A winner registration ID is required.",
                },
                400
            );
        }

        // Use the same permission that grants access to the Lucky Draw page.
        const { supabaseServer } =
            await requirePermission("can_scan_qr");

        const { data: event, error: eventError } =
            await supabaseServer
                .from("events")
                .select("id")
                .eq("id", eventId)
                .maybeSingle();

        if (eventError) {
            return jsonNoStore(
                { error: eventError.message },
                400
            );
        }

        if (!event) {
            return jsonNoStore(
                {
                    error:
                        "You do not have access to this event.",
                },
                403
            );
        }

        const supabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Prefer the server-only service role so RLS cannot block the update.
        // Fall back to the signed-in server client when the service role is
        // not configured.
        const database =
            supabaseUrl && serviceRoleKey
                ? createClient(
                      supabaseUrl,
                      serviceRoleKey,
                      {
                          auth: {
                              persistSession: false,
                              autoRefreshToken: false,
                          },
                      }
                  )
                : supabaseServer;

        let updateQuery = database
            .from("lucky_draw_winners")
            .update({
                is_excluded: false,
            })
            .eq("event_id", eventId);

        if (!addAll) {
            // Update every winner-history row for this registration, including
            // rows whose old is_excluded value is NULL.
            updateQuery = updateQuery.eq(
                "registration_id",
                registrationId
            );
        }

        const {
            data: updatedRows,
            error: updateError,
        } = await updateQuery.select(
            "id,registration_id,is_excluded"
        );

        if (updateError) {
            return jsonNoStore(
                {
                    error: updateError.message,
                    hint:
                        "Confirm that lucky_draw_winners.is_excluded exists and that SUPABASE_SERVICE_ROLE_KEY is configured in Vercel.",
                },
                400
            );
        }

        return jsonNoStore({
            success: true,
            updatedCount: updatedRows?.length || 0,
            registrationIds: Array.from(
                new Set(
                    (updatedRows || [])
                        .map((row) =>
                            String(
                                row.registration_id || ""
                            )
                        )
                        .filter(Boolean)
                )
            ),
        });
    } catch (error) {
        console.error(
            "Lucky draw add-back failed:",
            error
        );

        return jsonNoStore(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to add winner back.",
            },
            500
        );
    }
}

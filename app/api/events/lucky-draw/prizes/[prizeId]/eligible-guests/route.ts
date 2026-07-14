import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
    registrationIds?: unknown;
};

function jsonNoStore(
    body: Record<string, unknown>,
    status = 200,
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

function cleanIds(value: unknown) {
    if (!Array.isArray(value)) return [];

    return Array.from(
        new Set(
            value
                .filter(
                    (item): item is string =>
                        typeof item === "string" &&
                        item.trim().length > 0,
                )
                .map((item) => item.trim()),
        ),
    );
}

export async function PATCH(
    request: Request,
    context: {
        params: Promise<{
            eventId: string;
            prizeId: string;
        }>;
    },
) {
    try {
        const { eventId, prizeId } = await context.params;

        // Match the permission already used by the Lucky Draw pages.
        await requirePermission("can_scan_qr");

        const body = (await request.json()) as RequestBody;
        const requestedIds = cleanIds(body.registrationIds);

        const supabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return jsonNoStore(
                {
                    error:
                        "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.",
                },
                500,
            );
        }

        // This client exists only inside the server route. The service-role
        // key is never sent to the browser.
        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            },
        );

        const { data: prize, error: prizeError } =
            await supabaseAdmin
                .from("lucky_draw_prizes")
                .select("id,event_id")
                .eq("id", prizeId)
                .eq("event_id", eventId)
                .maybeSingle();

        if (prizeError) {
            return jsonNoStore(
                { error: prizeError.message },
                400,
            );
        }

        if (!prize) {
            return jsonNoStore(
                {
                    error:
                        "This prize was not found for the selected event.",
                },
                404,
            );
        }

        let validIds: string[] = [];

        if (requestedIds.length > 0) {
            const { data: registrations, error: registrationError } =
                await supabaseAdmin
                    .from("registrations")
                    .select("id")
                    .eq("event_id", eventId)
                    .in("id", requestedIds);

            if (registrationError) {
                return jsonNoStore(
                    { error: registrationError.message },
                    400,
                );
            }

            validIds = (registrations || []).map((row) =>
                String(row.id),
            );

            if (validIds.length !== requestedIds.length) {
                return jsonNoStore(
                    {
                        error:
                            "Some filtered guests do not belong to this event. Refresh the Lucky Draw page and try again.",
                    },
                    400,
                );
            }
        }

        const { data: updatedPrize, error: updateError } =
            await supabaseAdmin
                .from("lucky_draw_prizes")
                .update({
                    eligible_registration_ids: validIds,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", prizeId)
                .eq("event_id", eventId)
                .select(
                    "id,eligible_registration_ids",
                )
                .single();

        if (updateError) {
            return jsonNoStore(
                { error: updateError.message },
                400,
            );
        }

        const savedIds = Array.isArray(
            updatedPrize.eligible_registration_ids,
        )
            ? updatedPrize.eligible_registration_ids.map(String)
            : validIds;

        return jsonNoStore({
            success: true,
            eligibleRegistrationIds: savedIds,
        });
    } catch (error) {
        console.error(
            "Update lucky draw eligible guests failed:",
            error,
        );

        return jsonNoStore(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to update the prize guest list.",
            },
            500,
        );
    }
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestBody = {
    registrationIds?: unknown;
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

function cleanIds(value: unknown) {
    if (!Array.isArray(value)) return [];

    return Array.from(
        new Set(
            value
                .filter(
                    (item): item is string =>
                        typeof item === "string" &&
                        item.trim().length > 0
                )
                .map((item) => item.trim())
        )
    );
}

export async function PATCH(
    request: Request,
    context: {
        params: Promise<{
            eventId: string;
            prizeId: string;
        }>;
    }
) {
    try {
        const { eventId, prizeId } = await context.params;
        const body = (await request.json()) as RequestBody;
        const requestedIds = cleanIds(body.registrationIds);

        const supabaseServer =
            await createSupabaseServerClient();

        const {
            data: { user },
            error: userError,
        } = await supabaseServer.auth.getUser();

        if (userError || !user) {
            return jsonNoStore(
                {
                    error:
                        "You must be logged in to change lucky draw eligibility.",
                },
                401
            );
        }

        const { data: profile, error: profileError } =
            await supabaseServer
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle();

        if (profileError) {
            return jsonNoStore(
                { error: profileError.message },
                400
            );
        }

        const role = String(profile?.role || "").toLowerCase();

        if (
            role !== "admin" &&
            role !== "organizer" &&
            role !== "organiser"
        ) {
            return jsonNoStore(
                {
                    error:
                        "Only admins and organizers can change lucky draw eligibility.",
                },
                403
            );
        }

        // Confirm the signed-in user can read this event through the normal
        // server client before using the service-role client for the update.
        const { data: accessibleEvent, error: eventError } =
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

        if (!accessibleEvent) {
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

        if (!supabaseUrl || !serviceRoleKey) {
            return jsonNoStore(
                {
                    error:
                        "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.",
                },
                500
            );
        }

        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
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
                400
            );
        }

        if (!prize) {
            return jsonNoStore(
                {
                    error:
                        "This prize was not found for the selected event.",
                },
                404
            );
        }

        let validIds: string[] = [];

        if (requestedIds.length > 0) {
            const { data: registrations, error: registrationsError } =
                await supabaseAdmin
                    .from("registrations")
                    .select("id")
                    .eq("event_id", eventId)
                    .in("id", requestedIds);

            if (registrationsError) {
                return jsonNoStore(
                    { error: registrationsError.message },
                    400
                );
            }

            validIds = (registrations || []).map((row) =>
                String(row.id)
            );

            if (validIds.length !== requestedIds.length) {
                return jsonNoStore(
                    {
                        error:
                            "Some selected guests do not belong to this event. Refresh and try again.",
                    },
                    400
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
                .select("id,eligible_registration_ids")
                .single();

        if (updateError) {
            return jsonNoStore(
                { error: updateError.message },
                400
            );
        }

        const savedIds = Array.isArray(
            updatedPrize.eligible_registration_ids
        )
            ? updatedPrize.eligible_registration_ids.map(String)
            : validIds;

        return jsonNoStore({
            success: true,
            eligibleRegistrationIds: savedIds,
        });
    } catch (error) {
        console.error(
            "Lucky draw eligibility update failed:",
            error
        );

        return jsonNoStore(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to save selected guests.",
            },
            500
        );
    }
}
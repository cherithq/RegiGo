import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function reply(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage the lucky draw audience display.",
        },
        500,
    );
}

function cleanText(value: unknown, max = 500) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanHex(value: unknown, fallback: string) {
    const text = cleanText(value).toUpperCase();
    return /^#[0-9A-F]{6}$/.test(text) ? text : fallback;
}

function cleanOpacity(value: unknown, fallback: number) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.min(Math.max(num, 0), 1) : fallback;
}

// The audience display's "background mode" (solid / gradient / image) is a
// UI-only concept — lucky_draw_display_settings has no column for it. It's
// derived instead: an image URL means "image", identical primary/secondary
// colours means "solid", otherwise "gradient".
function deriveBackgroundMode(row: {
    background_image_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
}) {
    if (row.background_image_url) return "image";
    if (
        row.primary_color &&
        row.secondary_color &&
        row.primary_color === row.secondary_color
    ) {
        return "solid";
    }
    return "gradient";
}

function toApiSettings(row: Record<string, unknown> | null) {
    if (!row) return null;

    return {
        background_mode: deriveBackgroundMode({
            background_image_url: row.background_image_url as
                | string
                | null,
            primary_color: row.primary_color as string | null,
            secondary_color: row.secondary_color as string | null,
        }),
        background_color: row.background_color,
        gradient_start: row.primary_color,
        gradient_end: row.secondary_color,
        background_image_url: row.background_image_url,
        background_image_opacity: row.background_image_opacity,
    };
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        await requirePermission("can_manage_event_setup");
        const { eventId } = await context.params;
        const admin = getSupabaseAdminClient();

        const { data, error } = await admin
            .from("lucky_draw_display_settings")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        return reply({
            success: true,
            settings: toApiSettings(data),
        });
    } catch (error) {
        return fail(error);
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        await requirePermission("can_manage_event_setup");
        const { eventId } = await context.params;
        const admin = getSupabaseAdminClient();
        const body = (await request.json()) as Record<string, unknown>;

        const backgroundMode =
            body.backgroundMode === "solid" ||
            body.backgroundMode === "image"
                ? body.backgroundMode
                : "gradient";

        const backgroundColor = cleanHex(
            body.backgroundColor,
            "#050816",
        );
        const gradientStart = cleanHex(
            body.gradientStart,
            "#4F46E5",
        );
        const gradientEnd = cleanHex(
            body.gradientEnd,
            "#EC4899",
        );
        const backgroundImageUrl =
            cleanText(body.backgroundImageUrl, 2000) || null;

        // "Solid" has no column of its own — encode it as a gradient
        // between two identical colours so deriveBackgroundMode() detects
        // it correctly on the next read.
        const primaryColor =
            backgroundMode === "solid"
                ? backgroundColor
                : gradientStart;
        const secondaryColor =
            backgroundMode === "solid"
                ? backgroundColor
                : gradientEnd;

        const { data, error } = await admin
            .from("lucky_draw_display_settings")
            .upsert(
                {
                    event_id: eventId,
                    primary_color: primaryColor,
                    secondary_color: secondaryColor,
                    background_color: backgroundColor,
                    background_image_url:
                        backgroundMode === "image"
                            ? backgroundImageUrl
                            : null,
                    background_image_opacity: cleanOpacity(
                        body.backgroundImageOpacity,
                        0.35,
                    ),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "event_id" },
            )
            .select("*")
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return reply({
            success: true,
            settings: toApiSettings(data),
            message: "Audience background saved.",
        });
    } catch (error) {
        return fail(error);
    }
}

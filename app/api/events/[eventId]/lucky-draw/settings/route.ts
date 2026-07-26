import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";

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

function cleanNumber(value: unknown, fallback: number) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { supabaseServer } = await requirePermission(
            "can_manage_event_setup",
        );
        const { eventId } = await context.params;

        const { data, error } = await supabaseServer
            .from("lucky_draw_settings")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        return reply({
            success: true,
            settings: data || null,
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
        const { supabaseServer } = await requirePermission(
            "can_manage_event_setup",
        );
        const { eventId } = await context.params;
        const body = (await request.json()) as Record<string, unknown>;

        const backgroundMode =
            body.backgroundMode === "solid" ||
            body.backgroundMode === "image"
                ? body.backgroundMode
                : "gradient";

        const { data, error } = await supabaseServer
            .from("lucky_draw_settings")
            .upsert(
                {
                    event_id: eventId,
                    background_mode: backgroundMode,
                    background_color: cleanHex(
                        body.backgroundColor,
                        "#050816",
                    ),
                    gradient_start: cleanHex(
                        body.gradientStart,
                        "#4F46E5",
                    ),
                    gradient_end: cleanHex(
                        body.gradientEnd,
                        "#EC4899",
                    ),
                    background_image_url:
                        cleanText(body.backgroundImageUrl, 2000) ||
                        null,
                    shuffle_interval_ms: cleanNumber(
                        body.shuffleIntervalMs,
                        90,
                    ),
                    result_hold_ms: cleanNumber(
                        body.resultHoldMs,
                        8000,
                    ),
                    winner_card_style:
                        cleanText(body.winnerCardStyle) || "glass",
                    winner_name_size:
                        cleanText(body.winnerNameSize) || "compact",
                    max_columns: cleanNumber(
                        body.maxColumns,
                        10,
                    ),
                    show_latest_winners_when_idle:
                        body.showLatestWinnersWhenIdle !== false,
                    logo_url:
                        cleanText(body.logoUrl, 2000) || null,
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
            settings: data,
            message: "Audience background saved.",
        });
    } catch (error) {
        return fail(error);
    }
}

import { BADGE_MERGE_FIELDS, BadgeError, BadgeMergeKey, buildBadgePdf, requireBadgeManager } from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function num(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, max = 200) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sampleBadge() {
    const badge = Object.fromEntries(
        BADGE_MERGE_FIELDS.map((field) => [field.key, field.sample]),
    ) as Record<BadgeMergeKey, string>;
    // Not a draggable merge field, so it has no BADGE_MERGE_FIELDS sample —
    // give the ticket-colour chip/text something to render in the preview.
    badge.ticket_colour = "#4F46E5";
    // Give the QR element something to encode so its position is visible.
    badge.qr_code = badge.qr_code || "PREVIEW";
    return badge;
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    try {
        await requireBadgeManager(eventId);
        const body = await request.json() as Record<string, unknown>;
        const template = {
            badge_width_mm: num((body.template as Record<string, unknown>)?.badgeWidthMm, 90),
            badge_height_mm: num((body.template as Record<string, unknown>)?.badgeHeightMm, 55),
            background_color: text((body.template as Record<string, unknown>)?.backgroundColor, 7) || "#FFFFFF",
            elements: (body.template as Record<string, unknown>)?.elements,
        };

        const bytes = await buildBadgePdf({ template, badges: [sampleBadge()] });

        return new Response(Buffer.from(bytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=\"badge-preview.pdf\"",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        return Response.json(
            { error: error instanceof Error ? error.message : "Unable to preview the badge." },
            { status: error instanceof BadgeError ? error.status : 500 },
        );
    }
}

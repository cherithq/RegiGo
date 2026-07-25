import { NextResponse } from "next/server";
import {
    BADGE_MERGE_FIELDS,
    BadgeError,
    cleanBadgeElements,
    requireBadgeManager,
} from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
}

function handle(error: unknown) {
    return json(
        { error: error instanceof Error ? error.message : "Unable to manage badge templates." },
        error instanceof BadgeError ? error.status : 500,
    );
}

function text(value: unknown, max = 200) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

async function payload(eventId: string) {
    const configuration = await requireBadgeManager(eventId);
    const admin = configuration.actor.admin;
    const [templates, guests, jobs] = await Promise.all([
        admin.from("badge_templates")
            .select("id, template_name, badge_width_mm, badge_height_mm, orientation, background_color, elements, is_default, is_active, created_at, updated_at")
            .eq("event_id", eventId)
            .eq("is_active", true)
            .order("is_default", { ascending: false })
            .order("updated_at", { ascending: false }),
        admin.from("registrations")
            .select("id, full_name, email, department, payment_status, rsvp_status, table_selection_status, created_at")
            .eq("event_id", eventId)
            .order("full_name", { ascending: true }),
        admin.from("badge_print_jobs")
            .select("id, template_id, job_name, status, output_format, badge_count, error_message, generated_at, downloaded_at, completed_at, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false })
            .limit(50),
    ]);

    for (const result of [templates, guests, jobs]) {
        if (result.error) throw new BadgeError(result.error.message);
    }

    return {
        configuration,
        templates: templates.data || [],
        guests: guests.data || [],
        jobs: jobs.data || [],
    };
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params;
        const data = await payload(eventId);
        return json({
            success: true,
            event: data.configuration.event,
            mergeFields: BADGE_MERGE_FIELDS,
            templates: data.templates,
            guests: data.guests,
            jobs: data.jobs,
        });
    } catch (error) {
        return handle(error);
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params;
        const configuration = await requireBadgeManager(eventId);
        const body = await request.json() as Record<string, unknown>;
        const templateName = text(body.templateName);
        const width = num(body.badgeWidthMm, 90);
        const height = num(body.badgeHeightMm, 55);

        if (!templateName) throw new BadgeError("Enter a template name.");
        if (width < 20 || width > 300 || height < 20 || height > 300) {
            throw new BadgeError("Badge dimensions must be between 20 mm and 300 mm.");
        }

        const { error } = await configuration.actor.admin.from("badge_templates").insert({
            event_id: eventId,
            template_name: templateName,
            badge_width_mm: width,
            badge_height_mm: height,
            orientation: body.orientation === "portrait" ? "portrait" : "landscape",
            background_color: text(body.backgroundColor, 7) || "#FFFFFF",
            elements: cleanBadgeElements(body.elements),
            is_default: body.isDefault === true,
            is_active: true,
            created_by: configuration.actor.userId,
        });

        if (error) throw new BadgeError(error.message);
        return json({ success: true, message: "Badge template created." });
    } catch (error) {
        return handle(error);
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params;
        const configuration = await requireBadgeManager(eventId);
        const body = await request.json() as Record<string, unknown>;
        const templateId = text(body.templateId);
        const templateName = text(body.templateName);
        if (!templateId) throw new BadgeError("Choose a badge template.");
        if (!templateName) throw new BadgeError("Enter a template name.");

        const { error } = await configuration.actor.admin.from("badge_templates").update({
            template_name: templateName,
            badge_width_mm: num(body.badgeWidthMm, 90),
            badge_height_mm: num(body.badgeHeightMm, 55),
            orientation: body.orientation === "portrait" ? "portrait" : "landscape",
            background_color: text(body.backgroundColor, 7) || "#FFFFFF",
            elements: cleanBadgeElements(body.elements),
            is_default: body.isDefault === true,
        }).eq("id", templateId).eq("event_id", eventId);

        if (error) throw new BadgeError(error.message);
        return json({ success: true, message: "Badge template saved." });
    } catch (error) {
        return handle(error);
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params;
        const configuration = await requireBadgeManager(eventId);
        const body = await request.json() as Record<string, unknown>;
        const templateId = text(body.templateId);
        if (!templateId) throw new BadgeError("Choose a badge template.");

        const { count, error: countError } = await configuration.actor.admin
            .from("badge_print_jobs").select("id", { count: "exact", head: true }).eq("template_id", templateId);
        if (countError) throw new BadgeError(countError.message);

        if ((count || 0) > 0) {
            const { error } = await configuration.actor.admin.from("badge_templates")
                .update({ is_active: false, is_default: false })
                .eq("id", templateId).eq("event_id", eventId);
            if (error) throw new BadgeError(error.message);
            return json({ success: true, message: "Template archived because it has print history." });
        }

        const { error } = await configuration.actor.admin.from("badge_templates")
            .delete().eq("id", templateId).eq("event_id", eventId);
        if (error) throw new BadgeError(error.message);
        return json({ success: true, message: "Badge template deleted." });
    } catch (error) {
        return handle(error);
    }
}

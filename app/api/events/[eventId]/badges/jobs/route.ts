import { NextResponse } from "next/server";
import { BadgeError, requireBadgeManager } from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function ids(value: unknown) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())));
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    try {
        const { eventId } = await params;
        const configuration = await requireBadgeManager(eventId);
        const body = await request.json() as Record<string, unknown>;
        const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
        const registrationIds = ids(body.registrationIds);
        if (!templateId) throw new BadgeError("Choose a badge template.");
        if (registrationIds.length === 0) throw new BadgeError("Select at least one guest.");
        if (registrationIds.length > 1000) throw new BadgeError("A badge job may contain at most 1,000 guests.");

        const admin = configuration.actor.admin;
        const [template, registrations] = await Promise.all([
            admin.from("badge_templates").select("id, template_name").eq("id", templateId).eq("event_id", eventId).eq("is_active", true).maybeSingle(),
            admin.from("registrations").select("id").eq("event_id", eventId).in("id", registrationIds),
        ]);
        if (template.error) throw new BadgeError(template.error.message);
        if (!template.data) throw new BadgeError("The badge template could not be found.", 404);
        if (registrations.error) throw new BadgeError(registrations.error.message);

        const validIds = (registrations.data || []).map((row) => String(row.id));
        if (validIds.length === 0) throw new BadgeError("No matching event guests were found.");

        const { data: job, error } = await admin.from("badge_print_jobs").insert({
            event_id: eventId,
            template_id: templateId,
            job_name: `${template.data.template_name} — ${new Date().toLocaleString("en-SG")}`,
            status: "queued",
            output_format: "pdf",
            badge_count: validIds.length,
            requested_by: configuration.actor.userId,
        }).select("id").single();
        if (error) throw new BadgeError(error.message);

        const { error: itemError } = await admin.from("badge_print_job_items").insert(
            validIds.map((registrationId, index) => ({ job_id: job.id, registration_id: registrationId, item_order: index })),
        );
        if (itemError) {
            await admin.from("badge_print_jobs").delete().eq("id", job.id);
            throw new BadgeError(itemError.message);
        }

        return NextResponse.json({
            success: true,
            jobId: job.id,
            printUrl: `/dashboard/events/${eventId}/badges/jobs/${job.id}/print`,
            pdfUrl: `/api/events/${eventId}/badges/jobs/${job.id}/pdf`,
            message: `${validIds.length} badge${validIds.length === 1 ? "" : "s"} ready to print.`,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unable to create badge job." },
            { status: error instanceof BadgeError ? error.status : 500 },
        );
    }
}

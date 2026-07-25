import { BadgeError, buildBadgePdf, loadBadgeData, requireBadgeManager } from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanFilename(value: string) {
    return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "badges";
}

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string; jobId: string }> }) {
    const { eventId, jobId } = await params;
    try {
        const configuration = await requireBadgeManager(eventId);
        const admin = configuration.actor.admin;
        const { data: job, error } = await admin.from("badge_print_jobs")
            .select("id, job_name, event_id, template_id, status, badge_count, badge_templates(badge_width_mm, badge_height_mm, background_color, elements)")
            .eq("id", jobId).eq("event_id", eventId).maybeSingle();
        if (error) throw new BadgeError(error.message);
        if (!job) throw new BadgeError("The badge job could not be found.", 404);

        const template = Array.isArray(job.badge_templates) ? job.badge_templates[0] : job.badge_templates;
        if (!template) throw new BadgeError("The badge template could not be loaded.", 404);

        const { data: items, error: itemError } = await admin.from("badge_print_job_items")
            .select("registration_id, item_order").eq("job_id", jobId).order("item_order", { ascending: true });
        if (itemError) throw new BadgeError(itemError.message);
        const registrationIds = (items || []).map((item) => String(item.registration_id));
        if (registrationIds.length === 0) throw new BadgeError("The badge job has no guests.");

        await admin.from("badge_print_jobs").update({ status: "generating", error_message: null }).eq("id", jobId);
        const { badges } = await loadBadgeData({ admin, eventId, registrationIds });
        const bytes = await buildBadgePdf({ template, badges });
        const now = new Date().toISOString();
        await admin.from("badge_print_jobs").update({ status: "downloaded", generated_at: now, downloaded_at: now, error_message: null }).eq("id", jobId);

        return new Response(Buffer.from(bytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${cleanFilename(job.job_name)}.pdf"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        try {
            const configuration = await requireBadgeManager(eventId);
            await configuration.actor.admin.from("badge_print_jobs").update({
                status: "failed",
                error_message: error instanceof Error ? error.message : "Badge generation failed.",
            }).eq("id", jobId).eq("event_id", eventId);
        } catch {}

        return Response.json(
            { error: error instanceof Error ? error.message : "Unable to generate badges." },
            { status: error instanceof BadgeError ? error.status : 500 },
        );
    }
}

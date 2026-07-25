import {
    BadgeError,
    buildBadgePdf,
    loadBadgeData,
} from "@/lib/badges";
import {
    DirectPrintingError,
    requirePrinterDevice,
} from "@/lib/direct-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            deliveryId: string;
        }>;
    },
) {
    const { deliveryId } =
        await params;

    try {
        const {
            service,
            device,
        } = await requirePrinterDevice(
            request,
        );

        const {
            data: delivery,
            error,
        } = await service
            .from(
                "printer_deliveries",
            )
            .select(
                "id, event_id, badge_job_id, status, attempt_count, badge_print_jobs(id, job_name, template_id, badge_templates(badge_width_mm, badge_height_mm, background_color, elements))",
            )
            .eq("id", deliveryId)
            .eq(
                "printer_device_id",
                device.id,
            )
            .in("status", [
                "claimed",
                "printing",
            ])
            .maybeSingle();

        if (error) {
            throw new DirectPrintingError(
                error.message,
                500,
            );
        }

        if (!delivery) {
            throw new DirectPrintingError(
                "The print delivery is no longer available.",
                404,
            );
        }

        const badgeJob =
            Array.isArray(
                delivery.badge_print_jobs,
            )
                ? delivery
                      .badge_print_jobs[0]
                : delivery.badge_print_jobs;

        const template =
            Array.isArray(
                badgeJob?.badge_templates,
            )
                ? badgeJob
                      ?.badge_templates[0]
                : badgeJob
                      ?.badge_templates;

        if (!badgeJob || !template) {
            throw new DirectPrintingError(
                "The badge template could not be loaded.",
                404,
            );
        }

        const {
            data: items,
            error: itemError,
        } = await service
            .from(
                "badge_print_job_items",
            )
            .select(
                "registration_id, item_order",
            )
            .eq(
                "job_id",
                badgeJob.id,
            )
            .order("item_order", {
                ascending: true,
            });

        if (itemError) {
            throw new DirectPrintingError(
                itemError.message,
                500,
            );
        }

        const registrationIds = (
            items || []
        ).map((item) =>
            String(
                item.registration_id,
            ),
        );

        if (
            registrationIds.length === 0
        ) {
            throw new DirectPrintingError(
                "The badge job has no guests.",
                409,
            );
        }

        const now =
            new Date().toISOString();
        const lease =
            new Date(
                Date.now() +
                    10 * 60 * 1000,
            ).toISOString();

        await service
            .from(
                "printer_deliveries",
            )
            .update({
                status: "printing",
                printing_at: now,
                lease_expires_at:
                    lease,
            })
            .eq("id", deliveryId)
            .eq(
                "printer_device_id",
                device.id,
            );

        await service
            .from(
                "printer_delivery_attempts",
            )
            .update({
                status: "printing",
            })
            .eq(
                "delivery_id",
                deliveryId,
            )
            .eq(
                "attempt_number",
                delivery.attempt_count,
            );

        await service
            .from(
                "badge_print_jobs",
            )
            .update({
                status: "printing",
            })
            .eq(
                "id",
                badgeJob.id,
            );

        const { badges } =
            await loadBadgeData({
                admin: service,
                eventId:
                    delivery.event_id,
                registrationIds,
            });

        const bytes =
            await buildBadgePdf({
                template,
                badges,
            });

        return new Response(
            Buffer.from(bytes),
            {
                headers: {
                    "Content-Type":
                        "application/pdf",
                    "Content-Disposition":
                        `attachment; filename="regigo-badges-${deliveryId}.pdf"`,
                    "Cache-Control":
                        "private, no-store",
                },
            },
        );
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to prepare the badge PDF.",
            },
            {
                status:
                    error instanceof
                        DirectPrintingError ||
                    error instanceof BadgeError
                        ? error.status
                        : 500,
            },
        );
    }
}

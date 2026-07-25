import { NextResponse } from "next/server";
import {
    DirectPrintingError,
    requirePrinterDevice,
} from "@/lib/direct-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(
    value: unknown,
    max = 2000,
) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

export async function POST(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            deliveryId: string;
        }>;
    },
) {
    try {
        const { deliveryId } =
            await params;
        const {
            service,
            device,
        } = await requirePrinterDevice(
            request,
        );
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const resultStatus =
            body.status === "completed"
                ? "completed"
                : body.status === "failed"
                  ? "failed"
                  : "";

        if (!resultStatus) {
            throw new DirectPrintingError(
                "Acknowledgement status must be completed or failed.",
            );
        }

        const {
            data: delivery,
            error,
        } = await service
            .from(
                "printer_deliveries",
            )
            .select(
                "id, badge_job_id, attempt_count, status",
            )
            .eq("id", deliveryId)
            .eq(
                "printer_device_id",
                device.id,
            )
            .maybeSingle();

        if (error) {
            throw new DirectPrintingError(
                error.message,
                500,
            );
        }

        if (!delivery) {
            throw new DirectPrintingError(
                "The print delivery could not be found.",
                404,
            );
        }

        const now =
            new Date().toISOString();
        const systemJobId = text(
            body.systemJobId,
            500,
        );
        const errorMessage = text(
            body.errorMessage,
            2000,
        );

        const { error: updateError } =
            await service
                .from(
                    "printer_deliveries",
                )
                .update({
                    status:
                        resultStatus,
                    completed_at:
                        resultStatus ===
                        "completed"
                            ? now
                            : null,
                    failed_at:
                        resultStatus ===
                        "failed"
                            ? now
                            : null,
                    lease_expires_at:
                        null,
                    system_job_id:
                        systemJobId ||
                        null,
                    error_message:
                        resultStatus ===
                        "failed"
                            ? errorMessage ||
                              "The local print command failed."
                            : null,
                })
                .eq("id", deliveryId)
                .eq(
                    "printer_device_id",
                    device.id,
                );

        if (updateError) {
            throw new DirectPrintingError(
                updateError.message,
                500,
            );
        }

        await service
            .from(
                "printer_delivery_attempts",
            )
            .update({
                status:
                    resultStatus,
                system_job_id:
                    systemJobId ||
                    null,
                error_message:
                    resultStatus ===
                    "failed"
                        ? errorMessage ||
                          "The local print command failed."
                        : null,
                completed_at: now,
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
                status:
                    resultStatus,
                completed_at:
                    resultStatus ===
                    "completed"
                        ? now
                        : null,
                error_message:
                    resultStatus ===
                    "failed"
                        ? errorMessage ||
                          "Direct printing failed."
                        : null,
            })
            .eq(
                "id",
                delivery.badge_job_id,
            );

        await service
            .from(
                "printer_devices",
            )
            .update({
                status: "online",
                last_seen_at: now,
            })
            .eq("id", device.id);

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to acknowledge the print job.",
            },
            {
                status:
                    error instanceof
                    DirectPrintingError
                        ? error.status
                        : 500,
            },
        );
    }
}

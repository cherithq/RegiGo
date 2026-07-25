import { NextResponse } from "next/server";
import {
    DirectPrintingError,
    requirePrinterDevice,
} from "@/lib/direct-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
) {
    try {
        const {
            service,
            device,
        } = await requirePrinterDevice(
            request,
        );

        const {
            data,
            error,
        } = await service.rpc(
            "regigo_claim_printer_delivery_v1",
            {
                p_device_id:
                    device.id,
                p_lease_minutes: 5,
            },
        );

        if (error) {
            throw new DirectPrintingError(
                error.message,
                500,
            );
        }

        const delivery =
            Array.isArray(data)
                ? data[0]
                : data;

        if (!delivery?.delivery_id) {
            return NextResponse.json({
                success: true,
                job: null,
            });
        }

        return NextResponse.json({
            success: true,
            job: {
                deliveryId:
                    delivery.delivery_id,
                eventId:
                    delivery.event_id,
                badgeJobId:
                    delivery.badge_job_id,
                copies:
                    delivery.copies,
                attemptNumber:
                    delivery.attempt_number,
                printerName:
                    device.printer_name ||
                    null,
                pdfUrl:
                    `/api/printing/bridge/jobs/${delivery.delivery_id}/pdf`,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to claim a print job.",
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

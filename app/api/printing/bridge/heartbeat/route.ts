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

        let body: Record<
            string,
            unknown
        > = {};

        try {
            body =
                await request.json();
        } catch {
            body = {};
        }

        const printerName =
            typeof body.printerName ===
            "string"
                ? body.printerName.trim()
                : device.printer_name;

        const capabilities =
            body.capabilities &&
            typeof body.capabilities ===
                "object"
                ? body.capabilities
                : device.capabilities ||
                  {};

        const { error } =
            await service
                .from("printer_devices")
                .update({
                    status: "online",
                    printer_name:
                        printerName ||
                        null,
                    capabilities,
                    last_seen_at:
                        new Date().toISOString(),
                })
                .eq("id", device.id);

        if (error) {
            throw new DirectPrintingError(
                error.message,
                500,
            );
        }

        return NextResponse.json({
            success: true,
            serverTime:
                new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Heartbeat failed.",
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

import { NextResponse } from "next/server";
import {
    createClient,
} from "@supabase/supabase-js";
import {
    createDeviceToken,
    DirectPrintingError,
    hashPrinterSecret,
} from "@/lib/direct-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store",
        },
    });
}

function text(value: unknown) {
    return typeof value === "string"
        ? value.trim()
        : "";
}

export async function POST(
    request: Request,
) {
    try {
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const pairingCode = text(
            body.pairingCode,
        );

        if (!pairingCode) {
            throw new DirectPrintingError(
                "Enter the RegiGo pairing code.",
            );
        }

        const url =
            process.env
                .NEXT_PUBLIC_SUPABASE_URL;
        const key =
            process.env
                .SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new DirectPrintingError(
                "Supabase service-role configuration is missing.",
                500,
            );
        }

        const service = createClient(
            url,
            key,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken:
                        false,
                },
            },
        );

        const deviceToken =
            createDeviceToken();

        const {
            data,
            error,
        } = await service.rpc(
            "regigo_claim_printer_pairing_v1",
            {
                p_code_hash:
                    hashPrinterSecret(
                        pairingCode.toUpperCase(),
                    ),
                p_token_hash:
                    hashPrinterSecret(
                        deviceToken,
                    ),
                p_device_name:
                    text(
                        body.deviceName,
                    ),
                p_hostname:
                    text(
                        body.hostname,
                    ),
                p_platform:
                    text(
                        body.platform,
                    ),
                p_printer_name:
                    text(
                        body.printerName,
                    ),
                p_capabilities:
                    body.capabilities &&
                    typeof body.capabilities ===
                        "object"
                        ? body.capabilities
                        : {},
            },
        );

        if (error) {
            throw new DirectPrintingError(
                error.message,
                409,
            );
        }

        const device =
            Array.isArray(data)
                ? data[0]
                : data;

        if (!device?.device_id) {
            throw new DirectPrintingError(
                "The printer bridge could not be paired.",
                500,
            );
        }

        return json({
            success: true,
            deviceId:
                device.device_id,
            companyId:
                device.company_id,
            eventId:
                device.event_id,
            deviceToken,
            message:
                "Printer bridge paired successfully.",
        });
    } catch (error) {
        return json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to pair the printer bridge.",
            },
            error instanceof DirectPrintingError
                ? error.status
                : 500,
        );
    }
}

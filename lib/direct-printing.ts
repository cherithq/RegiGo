import "server-only";

import {
    createHash,
    randomBytes,
} from "node:crypto";
import {
    BadgeError,
    requireBadgeManager,
} from "@/lib/badges";

export class DirectPrintingError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "DirectPrintingError";
        this.status = status;
    }
}

export function hashPrinterSecret(
    value: string,
) {
    return createHash("sha256")
        .update(value, "utf8")
        .digest("hex");
}

export function createPairingCode() {
    const raw = randomBytes(5)
        .toString("hex")
        .toUpperCase();

    return `RG-${raw.slice(
        0,
        5,
    )}-${raw.slice(5)}`;
}

export function createDeviceToken() {
    return `rgp_${randomBytes(
        32,
    ).toString("base64url")}`;
}

export async function requireDirectPrintingManager(
    eventId: string,
) {
    try {
        return await requireBadgeManager(
            eventId,
        );
    } catch (error) {
        if (
            error instanceof BadgeError
        ) {
            throw new DirectPrintingError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

export async function requirePrinterDevice(
    _request: Request,
): Promise<{
    token: string;
    service: any;
    device: any;
}> {
    throw new DirectPrintingError(
        "The legacy local printer bridge has been disabled. Use the Browser Print Station instead.",
        410,
    );
}

import "server-only";

import {
    BadgeError,
    requireBadgeManager,
} from "@/lib/badges";

export class CheckInPrintingError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "CheckInPrintingError";
        this.status = status;
    }
}

export async function requireCheckInPrintingManager(
    eventId: string,
) {
    try {
        return await requireBadgeManager(
            eventId,
        );
    } catch (error) {
        if (error instanceof BadgeError) {
            throw new CheckInPrintingError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

import "server-only";

import {
    EventAddonError,
    getAddonActor,
} from "@/lib/event-addons";

export class PaymentAccessError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "PaymentAccessError";
        this.status = status;
    }
}

export async function requirePaymentManager(
    eventId: string,
) {
    try {
        const actor =
            await getAddonActor(
                eventId,
            );

        if (!actor.canManage) {
            throw new PaymentAccessError(
                "You do not have permission to manage ticket payments.",
                403,
            );
        }

        const {
            data: addon,
            error,
        } = await actor.admin
            .from("event_addons")
            .select(
                "enabled",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "addon_key",
                "stripe_payments",
            )
            .maybeSingle();

        const missingTable =
            error?.code ===
                "42P01" ||
            error?.code ===
                "PGRST205";

        if (
            error &&
            !missingTable
        ) {
            throw new PaymentAccessError(
                error.message,
            );
        }

        if (
            addon &&
            addon.enabled ===
                false
        ) {
            throw new PaymentAccessError(
                "Stripe Ticket Payments is disabled for this event.",
                403,
            );
        }

        return {
            actor,
            event: actor.event,
        };
    } catch (error) {
        if (
            error instanceof
            PaymentAccessError
        ) {
            throw error;
        }

        if (
            error instanceof
            EventAddonError
        ) {
            throw new PaymentAccessError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

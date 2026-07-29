import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/guest-invitations";

/**
 * Flips a guest's qr_tickets row to active (and queues their confirmation
 * email) once payment and required table selection are both satisfied.
 * Safe to call repeatedly from any completion point (payment webhook,
 * table-selection confirm) regardless of which requirement finishes first —
 * it only activates once every applicable requirement is met, and is a
 * no-op if the ticket is already active or doesn't exist yet.
 */
export async function activateQrPassIfReady({
    admin,
    registrationId,
}: {
    admin: SupabaseClient;
    registrationId: string;
}): Promise<boolean> {
    const { data: registration } = await admin
        .from("registrations")
        .select(
            "id, event_id, email, payment_status, registration_status",
        )
        .eq("id", registrationId)
        .maybeSingle();

    if (!registration) {
        return false;
    }

    if (registration.payment_status === "pending") {
        return false;
    }

    if (
        registration.registration_status === "checked_in" ||
        registration.registration_status === "attended"
    ) {
        // Already scanned in — is_active was intentionally flipped to
        // false to mark the pass used. Never reactivate it.
        return false;
    }

    const [
        tableAddonResult,
        tableSettingsResult,
        assignmentResult,
    ] = await Promise.all([
        admin
            .from("event_addons")
            .select("enabled")
            .eq("event_id", registration.event_id)
            .eq("addon_key", "guest_table_selection")
            .maybeSingle(),

        admin
            .from("event_table_selection_settings")
            .select("selection_required")
            .eq("event_id", registration.event_id)
            .maybeSingle(),

        admin
            .from("table_assignments")
            .select("table_id")
            .eq("registration_id", registrationId)
            .maybeSingle(),
    ]);

    const tableSelectionRequired =
        tableAddonResult.data?.enabled === true &&
        tableSettingsResult.data?.selection_required === true;

    if (tableSelectionRequired && !assignmentResult.data) {
        return false;
    }

    const { data: activated } = await admin
        .from("qr_tickets")
        .update({ is_active: true })
        .eq("registration_id", registrationId)
        .eq("is_active", false)
        .select("id")
        .maybeSingle();

    if (!activated) {
        // Already active (or no ticket row exists yet) — nothing to do.
        return true;
    }

    await admin.from("email_jobs").insert({
        event_id: registration.event_id,
        registration_id: registrationId,
        recipient_email: registration.email || null,
        email_type: "confirmation",
        status: "pending",
        attempts: 0,
        last_error: null,
        sent_at: null,
    });

    const secret = process.env.EMAIL_WORKER_SECRET;

    if (secret) {
        try {
            await fetch(
                new URL("/api/email-worker", getSiteUrl()),
                {
                    method: "POST",
                    cache: "no-store",
                    headers: {
                        "x-worker-secret": secret,
                    },
                },
            );
        } catch {
            // The email worker's cron safety-net will pick this job up.
        }
    }

    return true;
}

/**
 * Read-only check for whether a guest's pass is actually ready to show —
 * i.e. payment (if required) is complete and table selection (if required)
 * is done. Used as a defense-in-depth gate on the pass page itself, since
 * some registration paths (e.g. invite-flow guest creation) go through
 * database stored procedures this app doesn't fully control.
 */
export async function isQrPassReady({
    admin,
    registration,
}: {
    admin: SupabaseClient;
    registration: {
        id: string;
        event_id: string;
        payment_status?: string | null;
    };
}): Promise<boolean> {
    if (registration.payment_status === "pending") {
        return false;
    }

    const [
        tableAddonResult,
        tableSettingsResult,
        assignmentResult,
    ] = await Promise.all([
        admin
            .from("event_addons")
            .select("enabled")
            .eq("event_id", registration.event_id)
            .eq("addon_key", "guest_table_selection")
            .maybeSingle(),

        admin
            .from("event_table_selection_settings")
            .select("selection_required")
            .eq("event_id", registration.event_id)
            .maybeSingle(),

        admin
            .from("table_assignments")
            .select("table_id")
            .eq("registration_id", registration.id)
            .maybeSingle(),
    ]);

    const tableSelectionRequired =
        tableAddonResult.data?.enabled === true &&
        tableSettingsResult.data?.selection_required === true;

    return !tableSelectionRequired || Boolean(assignmentResult.data);
}

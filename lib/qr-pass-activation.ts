import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { getSiteUrl } from "@/lib/guest-invitations";

/**
 * A raw payment_status of "pending" only actually blocks the pass if the
 * event genuinely sells paid tickets. Registrations created through the
 * invite/RSVP flow default payment_status to "pending" regardless of
 * whether the event has Stripe payments enabled at all, and nothing ever
 * corrects that value for guests who don't need to pay — so trusting the
 * raw string on its own stuck every free/non-payment RSVP guest on "Your
 * pass isn't ready yet" forever.
 */
async function isPaymentGenuinelyPending({
    admin,
    eventId,
    paymentStatus,
}: {
    admin: SupabaseClient;
    eventId: string;
    paymentStatus?: string | null;
}): Promise<boolean> {
    if (paymentStatus !== "pending") {
        return false;
    }

    const [paymentAddonResult, ticketCountResult] =
        await Promise.all([
            admin
                .from("event_addons")
                .select("enabled")
                .eq("event_id", eventId)
                .eq("addon_key", "stripe_payments")
                .maybeSingle(),

            admin
                .from("ticket_types")
                .select("id", {
                    count: "exact",
                    head: true,
                })
                .eq("event_id", eventId),
        ]);

    const paymentEnabled =
        paymentAddonResult.data?.enabled === true;
    const ticketCount =
        ticketCountResult.count || 0;

    return paymentEnabled && ticketCount > 0;
}

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

    if (
        await isPaymentGenuinelyPending({
            admin,
            eventId: registration.event_id,
            paymentStatus:
                registration.payment_status,
        })
    ) {
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

    const { data: existingTicket } = await admin
        .from("qr_tickets")
        .select("id, is_active")
        .eq("registration_id", registrationId)
        .maybeSingle();

    if (existingTicket?.is_active) {
        // Already active — nothing to do.
        return true;
    }

    // Guests added through the invite/RSVP flow (single add or CSV import)
    // never get a qr_tickets row created for them — unlike public
    // self-registration, which inserts one immediately in
    // app/api/register/route.ts. Without this, there was nothing here for
    // `.update(...)` to match, so the pass was silently never generated and
    // no confirmation email was ever queued.
    const activated = existingTicket
        ? await admin
              .from("qr_tickets")
              .update({ is_active: true })
              .eq("id", existingTicket.id)
              .select("id")
              .maybeSingle()
        : await admin
              .from("qr_tickets")
              .insert({
                  registration_id: registrationId,
                  event_id: registration.event_id,
                  qr_token: crypto.randomUUID(),
                  is_active: true,
              })
              .select("id")
              .maybeSingle();

    if (!activated.data) {
        return false;
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
        // Kick the worker off after the response is sent — this used to be
        // awaited inline, which meant every caller (payment confirmation,
        // table-selection confirm, RSVP accept) blocked on a full SMTP
        // verify + send cycle before the guest saw their pass unlock.
        const siteUrl = getSiteUrl();

        after(async () => {
            try {
                await fetch(
                    new URL("/api/email-worker", siteUrl),
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
        });
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
    if (
        await isPaymentGenuinelyPending({
            admin,
            eventId: registration.event_id,
            paymentStatus:
                registration.payment_status,
        })
    ) {
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

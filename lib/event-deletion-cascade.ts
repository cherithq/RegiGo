import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { EventDeletionAccessError } from "@/lib/event-deletion-access";

/**
 * Deletes every row across the app's schema that references an event,
 * so the final `DELETE FROM events` never hits a foreign-key violation.
 * Ordered leaves-first: grandchildren (e.g. order_items, which reference
 * an order, not the event directly) before their parents, and anything
 * referencing `registrations` before `registrations` itself.
 *
 * This exists instead of relying on `ON DELETE CASCADE` because this
 * environment has no direct Postgres/DDL access to configure it at the
 * schema level — only the Supabase REST API. If a table gets added later
 * without being wired in here, the caller's generic "23503 — configure
 * ON DELETE CASCADE or delete dependent records first" message (with the
 * blocking table named by Postgres) still tells you exactly what's
 * missing.
 */
export async function deleteEventDependents(
    admin: SupabaseClient,
    eventId: string,
) {
    async function ids(
        table: string,
        column: string,
        value: string | string[],
    ): Promise<string[]> {
        if (Array.isArray(value) && value.length === 0) {
            return [];
        }

        const query = admin
            .from(table)
            .select("id");
        const filtered = Array.isArray(value)
            ? query.in(column, value)
            : query.eq(column, value);
        const { data, error } =
            await filtered;

        if (error) {
            throw new EventDeletionAccessError(
                `Unable to read ${table} while preparing to delete this event: ${error.message}`,
                500,
            );
        }

        return (data || []).map((row) =>
            String(
                (row as { id: string }).id,
            ),
        );
    }

    async function clear(
        table: string,
        column: string,
        value: string | string[],
    ) {
        if (
            Array.isArray(value) &&
            value.length === 0
        ) {
            return;
        }

        const query = admin
            .from(table)
            .delete();
        const filtered = Array.isArray(value)
            ? query.in(column, value)
            : query.eq(column, value);
        const { error } = await filtered;

        if (error) {
            throw new EventDeletionAccessError(
                `Unable to delete ${table} rows while removing this event: ${error.message}`,
                409,
            );
        }
    }

    // --- Phase 1: grandchildren, resolved via their parent's ids ---
    const tournamentIds = await ids(
        "tap_tournaments",
        "event_id",
        eventId,
    );
    const roundIds = await ids(
        "tap_tournament_rounds",
        "tournament_id",
        tournamentIds,
    );
    await clear(
        "tap_tournament_ttt_matches",
        "round_id",
        roundIds,
    );

    const orderIds = await ids(
        "orders",
        "event_id",
        eventId,
    );
    await clear(
        "order_items",
        "order_id",
        orderIds,
    );

    const badgeJobIds = await ids(
        "badge_print_jobs",
        "event_id",
        eventId,
    );
    await clear(
        "badge_print_job_items",
        "job_id",
        badgeJobIds,
    );

    const registrationFormIds = await ids(
        "registration_forms",
        "event_id",
        eventId,
    );
    await clear(
        "registration_fields",
        "form_id",
        registrationFormIds,
    );

    // --- Phase 2: tables that reference registrations (and/or the event
    // directly) — must clear before registrations itself ---
    for (const table of [
        "badge_browser_print_requests",
        "check_ins",
        "email_jobs",
        "email_logs",
        "event_invitations",
        "lucky_draw_winners",
        "qr_tickets",
        "table_assignments",
        "table_selection_holds",
    ]) {
        await clear(
            table,
            "event_id",
            eventId,
        );
    }
    await clear(
        "orders",
        "event_id",
        eventId,
    );

    // --- Phase 3: mid-level parents, now that their children are gone ---
    await clear(
        "tap_tournament_rounds",
        "tournament_id",
        tournamentIds,
    );
    await clear(
        "tap_tournament_plan_settings",
        "tournament_id",
        tournamentIds,
    );
    await clear(
        "tap_tournament_plan_steps",
        "tournament_id",
        tournamentIds,
    );
    await clear(
        "tap_tournament_players",
        "tournament_id",
        tournamentIds,
    );
    await clear(
        "tap_tournaments",
        "event_id",
        eventId,
    );
    await clear(
        "badge_print_jobs",
        "event_id",
        eventId,
    );
    await clear(
        "registration_forms",
        "event_id",
        eventId,
    );
    await clear(
        "event_tables",
        "event_id",
        eventId,
    );
    await clear(
        "lucky_draw_prizes",
        "event_id",
        eventId,
    );

    // --- Phase 4: registrations, now that everything referencing them
    // is gone ---
    await clear(
        "registrations",
        "event_id",
        eventId,
    );

    // --- Phase 5: remaining tables with no known dependents ---
    for (const table of [
        "event_addons",
        "event_agenda",
        "event_branding",
        "event_guest_counters",
        "event_licenses",
        "event_members",
        "event_page_sections",
        "event_settings",
        "event_table_selection_settings",
        "email_templates",
        "lucky_draw_display_settings",
        "speakers",
        "ticket_types",
        "badge_templates",
        "badge_browser_print_settings",
    ]) {
        await clear(
            table,
            "event_id",
            eventId,
        );
    }
}

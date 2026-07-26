import "server-only";

import {
    createClient,
} from "@supabase/supabase-js";
import {
    TableSelectionError,
} from "@/lib/table-selection";

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new TableSelectionError(
            "Supabase service-role configuration is missing.",
            500,
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

export async function getRegistrationTableSelectionContext({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    const admin =
        adminClient();

    const {
        data: event,
        error:
            eventError,
    } = await admin
        .from("events")
        .select(
            "id, event_name, event_slug, event_date, event_time, venue",
        )
        .eq(
            "event_slug",
            slug,
        )
        .maybeSingle();

    if (
        eventError ||
        !event
    ) {
        throw new TableSelectionError(
            eventError?.message ||
                "The event could not be found.",
            eventError ? 400 : 404,
        );
    }

    const {
        data: ticket,
        error:
            ticketError,
    } = await admin
        .from("qr_tickets")
        .select(
            "id, event_id, registration_id, qr_token, is_active",
        )
        .eq(
            "event_id",
            event.id,
        )
        .eq(
            "qr_token",
            token,
        )
        .eq(
            "is_active",
            true,
        )
        .maybeSingle();

    if (
        ticketError ||
        !ticket
    ) {
        throw new TableSelectionError(
            ticketError?.message ||
                "This registration table-selection link is invalid or expired.",
            ticketError ? 400 : 404,
        );
    }

    const {
        data: registration,
        error:
            registrationError,
    } = await admin
        .from("registrations")
        .select(
            "id, event_id, full_name, email, registration_status, rsvp_status, payment_status, selected_ticket_quantity, table_selection_status",
        )
        .eq(
            "id",
            ticket.registration_id,
        )
        .eq(
            "event_id",
            event.id,
        )
        .maybeSingle();

    if (
        registrationError ||
        !registration
    ) {
        throw new TableSelectionError(
            registrationError
                ?.message ||
                "The guest registration could not be found.",
            registrationError
                ? 400
                : 404,
        );
    }

    if (
        ![
            "confirmed",
            "registered",
            "approved",
        ].includes(
            String(
                registration.registration_status ||
                    "",
            ).toLowerCase(),
        )
    ) {
        throw new TableSelectionError(
            "Complete the registration before selecting a table.",
            403,
        );
    }

    const [
        addonResult,
        settingsResult,
    ] = await Promise.all([
        admin
            .from(
                "event_addons",
            )
            .select(
                "enabled",
            )
            .eq(
                "event_id",
                event.id,
            )
            .eq(
                "addon_key",
                "guest_table_selection",
            )
            .maybeSingle(),

        // select("*") instead of an explicit column list so this keeps
        // working even before the page_title/page_subtitle/banner_color_*
        // appearance columns have been added to the database.
        admin
            .from(
                "event_table_selection_settings",
            )
            .select("*")
            .eq(
                "event_id",
                event.id,
            )
            .maybeSingle(),
    ]);

    if (addonResult.error) {
        throw new TableSelectionError(
            addonResult.error
                .message,
        );
    }

    if (
        !addonResult.data
            ?.enabled
    ) {
        throw new TableSelectionError(
            "Guest table selection is not enabled for this event.",
            403,
        );
    }

    if (
        settingsResult.error ||
        !settingsResult.data
    ) {
        throw new TableSelectionError(
            settingsResult.error
                ?.message ||
                "Table selection settings could not be found.",
            settingsResult.error
                ? 400
                : 500,
        );
    }

    const settings =
        settingsResult.data;

    if (
        settings.allow_registration_selection ===
        false
    ) {
        throw new TableSelectionError(
            "Table selection is not enabled after public registration.",
            403,
        );
    }

    if (
        settings.require_paid_ticket &&
        ![
            "paid",
            "not_required",
        ].includes(
            String(
                registration.payment_status ||
                    "",
            ),
        )
    ) {
        throw new TableSelectionError(
            "Complete the ticket payment before selecting a table.",
            403,
        );
    }

    return {
        admin,
        event,
        registration,
        settings,
        ticket,
        partySize:
            Math.max(
                Number(
                    registration.selected_ticket_quantity ||
                        1,
                ),
                1,
            ),
        qrPassUrl:
            `/event/${encodeURIComponent(
                slug,
            )}/pass?registration=${encodeURIComponent(
                String(
                    registration.id,
                ),
            )}`,
    };
}

export async function getRegistrationTableSelectionSnapshot({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    const context =
        await getRegistrationTableSelectionContext({
            slug,
            token,
        });

    await context.admin.rpc(
        "regigo_release_expired_table_holds_v1",
        {
            p_event_id:
                context.event.id,
        },
    );

    const [
        tablesResult,
        allTableIdsResult,
        holdsResult,
    ] = await Promise.all([
        context.admin
            .from(
                "event_tables",
            )
            .select(
                "id, table_name, capacity:table_capacity, selection_label, selection_description, selection_order, guest_selectable, floor_x, floor_y, table_size, table_shape, rotation",
            )
            .eq(
                "event_id",
                context.event.id,
            )
            .eq(
                "guest_selectable",
                true,
            )
            .order(
                "selection_order",
                {
                    ascending:
                        true,
                },
            )
            .order(
                "table_name",
                {
                    ascending:
                        true,
                },
            ),

        context.admin
            .from(
                "event_tables",
            )
            .select("id")
            .eq(
                "event_id",
                context.event.id,
            ),

        context.admin
            .from(
                "table_selection_holds",
            )
            .select(
                "id, table_id, registration_id, party_size, expires_at",
            )
            .eq(
                "event_id",
                context.event.id,
            )
            .gt(
                "expires_at",
                new Date().toISOString(),
            ),
    ]);

    for (const result of [
        tablesResult,
        allTableIdsResult,
        holdsResult,
    ]) {
        if (result.error) {
            throw new TableSelectionError(
                result.error.message,
            );
        }
    }

    const allTableIds = (
        allTableIdsResult.data || []
    ).map((table) => table.id);

    // table_assignments.event_id is not reliably populated, so scope by
    // this event's table ids instead of filtering on event_id directly.
    const assignmentsResult = allTableIds.length
        ? await context.admin
              .from("table_assignments")
              .select(
                  "id, table_id, registration_id, assignment_source, assigned_at",
              )
              .in("table_id", allTableIds)
        : {
              data: [] as {
                  id: string;
                  table_id: string;
                  registration_id: string;
                  assignment_source: string | null;
                  assigned_at: string;
              }[],
              error: null,
          };

    if (assignmentsResult.error) {
        throw new TableSelectionError(
            assignmentsResult.error.message,
        );
    }

    const assignments =
        assignmentsResult.data ||
        [];
    const holds =
        holdsResult.data ||
        [];
    const registrationIds =
        Array.from(
            new Set(
                assignments
                    .map(
                        (row) =>
                            String(
                                row.registration_id ||
                                    "",
                            ),
                    )
                    .filter(
                        Boolean,
                    ),
            ),
        );
    const partySizeMap =
        new Map<
            string,
            number
        >();

    if (
        registrationIds.length >
        0
    ) {
        const {
            data,
            error,
        } = await context.admin
            .from(
                "registrations",
            )
            .select(
                "id, selected_ticket_quantity",
            )
            .in(
                "id",
                registrationIds,
            );

        if (error) {
            throw new TableSelectionError(
                error.message,
            );
        }

        for (const row of
            data || []) {
            partySizeMap.set(
                String(
                    row.id,
                ),
                Math.max(
                    Number(
                        row.selected_ticket_quantity ||
                            1,
                    ),
                    1,
                ),
            );
        }
    }

    const confirmedByTable =
        new Map<
            string,
            number
        >();

    for (const assignment of
        assignments) {
        const tableId =
            String(
                assignment.table_id,
            );
        const registrationId =
            String(
                assignment.registration_id,
            );

        confirmedByTable.set(
            tableId,
            (
                confirmedByTable.get(
                    tableId,
                ) || 0
            ) +
                (
                    partySizeMap.get(
                        registrationId,
                    ) || 1
                ),
        );
    }

    const heldByTable =
        new Map<
            string,
            number
        >();

    for (const hold of
        holds) {
        if (
            String(
                hold.registration_id,
            ) ===
            String(
                context.registration
                    .id,
            )
        ) {
            continue;
        }

        const tableId =
            String(
                hold.table_id,
            );

        heldByTable.set(
            tableId,
            (
                heldByTable.get(
                    tableId,
                ) || 0
            ) +
                Math.max(
                    Number(
                        hold.party_size ||
                            1,
                    ),
                    1,
                ),
        );
    }

    const currentAssignment =
        assignments.find(
            (assignment) =>
                String(
                    assignment.registration_id,
                ) ===
                String(
                    context.registration
                        .id,
                ),
        ) || null;
    const currentHold =
        holds.find(
            (hold) =>
                String(
                    hold.registration_id,
                ) ===
                String(
                    context.registration
                        .id,
                ),
        ) || null;

    const tables =
        (
            tablesResult.data ||
            []
        ).map((table) => {
            const tableId =
                String(table.id);
            const confirmed =
                confirmedByTable.get(
                    tableId,
                ) || 0;
            const held =
                heldByTable.get(
                    tableId,
                ) || 0;
            const capacity =
                Math.max(
                    Number(
                        table.capacity ||
                            0,
                    ),
                    0,
                );

            return {
                ...table,
                confirmedSeats:
                    confirmed,
                heldSeats:
                    held,
                availableSeats:
                    Math.max(
                        capacity -
                            confirmed -
                            held,
                        0,
                    ),
            };
        });

    return {
        ...context,
        tables,
        currentAssignment,
        currentHold,
    };
}

import "server-only";

import {
    EventAddonError,
    getEventAddonConfiguration,
} from "@/lib/event-addons";
import {
    InvitationError,
    getPublicInvitation,
} from "@/lib/guest-invitations";

export class TableSelectionError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "TableSelectionError";
        this.status = status;
    }
}

export async function requireTableSelectionManager(
    eventId: string,
) {
    try {
        const configuration =
            await getEventAddonConfiguration(eventId);

        const addon = configuration.addons.find(
            (item) =>
                item.key === "guest_table_selection",
        );

        if (!addon || !addon.allowed || !addon.enabled) {
            throw new TableSelectionError(
                "Guest Table Selection is not enabled for this event.",
                403,
            );
        }

        if (!configuration.actor.canManage) {
            throw new TableSelectionError(
                "You do not have permission to manage guest table selection.",
                403,
            );
        }

        return configuration;
    } catch (error) {
        if (error instanceof TableSelectionError) {
            throw error;
        }

        if (error instanceof EventAddonError) {
            throw new TableSelectionError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

export async function getPublicTableSelectionContext({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    try {
        const { admin, invitation } =
            await getPublicInvitation({ slug, token });

        const event = Array.isArray(invitation.events)
            ? invitation.events[0]
            : invitation.events;

        const registration = Array.isArray(
            invitation.registrations,
        )
            ? invitation.registrations[0]
            : invitation.registrations;

        if (!event || !registration) {
            throw new TableSelectionError(
                "The invitation could not be loaded.",
                404,
            );
        }

        if (invitation.status !== "accepted") {
            throw new TableSelectionError(
                "Accept the invitation before selecting a table.",
                403,
            );
        }

        const { data: addon, error: addonError } =
            await admin
                .from("event_addons")
                .select("enabled")
                .eq("event_id", event.id)
                .eq("addon_key", "guest_table_selection")
                .maybeSingle();

        if (addonError) {
            throw new TableSelectionError(
                addonError.message,
            );
        }

        if (!addon?.enabled) {
            throw new TableSelectionError(
                "Guest table selection is not enabled for this event.",
                403,
            );
        }

        const { data: settings, error } = await admin
            .from("event_table_selection_settings")
            .select(
                "hold_minutes, allow_changes, require_paid_ticket, allow_registration_selection, allow_rsvp_selection, selection_required, instructions",
            )
            .eq("event_id", event.id)
            .maybeSingle();

        if (error) {
            throw new TableSelectionError(error.message);
        }

        if (!settings) {
            throw new TableSelectionError(
                "Table selection settings could not be found.",
                500,
            );
        }

        if (
            settings.allow_rsvp_selection ===
            false
        ) {
            throw new TableSelectionError(
                "Table selection is not enabled for invitation RSVP guests.",
                403,
            );
        }

        const {
            data: registrationDetails,
            error: registrationDetailsError,
        } = await admin
            .from("registrations")
            .select(
                "payment_status, selected_ticket_quantity",
            )
            .eq("id", registration.id)
            .maybeSingle();

        if (registrationDetailsError) {
            throw new TableSelectionError(
                registrationDetailsError.message,
            );
        }

        if (!registrationDetails) {
            throw new TableSelectionError(
                "The registration could not be found.",
                404,
            );
        }

        if (
            settings.require_paid_ticket &&
            !["paid", "not_required"].includes(
                String(registrationDetails.payment_status || ""),
            )
        ) {
            throw new TableSelectionError(
                "Complete your ticket payment before selecting a table.",
                403,
            );
        }

        return {
            admin,
            invitation,
            event,
            registration: {
                ...registration,
                payment_status:
                    registrationDetails.payment_status,
                selected_ticket_quantity:
                    registrationDetails.selected_ticket_quantity,
            },
            settings,
            partySize: Math.max(
                Number(
                    registrationDetails.selected_ticket_quantity ??
                        1,
                ),
                1,
            ),
        };
    } catch (error) {
        if (error instanceof TableSelectionError) {
            throw error;
        }

        if (error instanceof InvitationError) {
            throw new TableSelectionError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

export async function getTableSelectionSnapshot({
    slug,
    token,
}: {
    slug: string;
    token: string;
}) {
    const context =
        await getPublicTableSelectionContext({
            slug,
            token,
        });

    await context.admin.rpc(
        "regigo_release_expired_table_holds_v1",
        { p_event_id: context.event.id },
    );

    const [tablesResult, assignmentsResult, holdsResult] =
        await Promise.all([
            context.admin
                .from("event_tables")
                .select(
                    "id, table_name, capacity, selection_label, selection_description, selection_order, guest_selectable",
                )
                .eq("event_id", context.event.id)
                .eq("guest_selectable", true)
                .order("selection_order", {
                    ascending: true,
                })
                .order("table_name", { ascending: true }),

            context.admin
                .from("table_assignments")
                .select(
                    "id, table_id, registration_id, assignment_source, assigned_at",
                )
                .eq("event_id", context.event.id),

            context.admin
                .from("table_selection_holds")
                .select(
                    "id, table_id, registration_id, party_size, expires_at",
                )
                .eq("event_id", context.event.id)
                .gt("expires_at", new Date().toISOString()),
        ]);

    if (tablesResult.error) {
        throw new TableSelectionError(
            tablesResult.error.message,
        );
    }
    if (assignmentsResult.error) {
        throw new TableSelectionError(
            assignmentsResult.error.message,
        );
    }
    if (holdsResult.error) {
        throw new TableSelectionError(
            holdsResult.error.message,
        );
    }

    const assignments = assignmentsResult.data || [];
    const holds = holdsResult.data || [];

    const registrationIds = Array.from(
        new Set(
            assignments
                .map((row) =>
                    String(row.registration_id || ""),
                )
                .filter(Boolean),
        ),
    );

    const partySizeMap = new Map<string, number>();

    if (registrationIds.length > 0) {
        const { data, error } = await context.admin
            .from("registrations")
            .select("id, selected_ticket_quantity")
            .in("id", registrationIds);

        if (error) {
            throw new TableSelectionError(error.message);
        }

        for (const row of data || []) {
            partySizeMap.set(
                String(row.id),
                Math.max(
                    Number(row.selected_ticket_quantity || 1),
                    1,
                ),
            );
        }
    }

    const confirmedByTable = new Map<string, number>();
    for (const assignment of assignments) {
        const tableId = String(assignment.table_id);
        const registrationId = String(
            assignment.registration_id,
        );
        confirmedByTable.set(
            tableId,
            (confirmedByTable.get(tableId) || 0) +
                (partySizeMap.get(registrationId) || 1),
        );
    }

    const heldByTable = new Map<string, number>();
    for (const hold of holds) {
        if (
            String(hold.registration_id) ===
            String(context.registration.id)
        ) {
            continue;
        }

        const tableId = String(hold.table_id);
        heldByTable.set(
            tableId,
            (heldByTable.get(tableId) || 0) +
                Math.max(Number(hold.party_size || 1), 1),
        );
    }

    const currentAssignment =
        assignments.find(
            (assignment) =>
                String(assignment.registration_id) ===
                String(context.registration.id),
        ) || null;

    const currentHold =
        holds.find(
            (hold) =>
                String(hold.registration_id) ===
                String(context.registration.id),
        ) || null;

    const tables = (tablesResult.data || []).map(
        (table) => {
            const confirmed =
                confirmedByTable.get(String(table.id)) || 0;
            const held =
                heldByTable.get(String(table.id)) || 0;
            const capacity = Math.max(
                Number(table.capacity || 0),
                0,
            );

            return {
                ...table,
                confirmedSeats: confirmed,
                heldSeats: held,
                availableSeats: Math.max(
                    capacity - confirmed - held,
                    0,
                ),
            };
        },
    );

    return {
        ...context,
        tables,
        currentAssignment,
        currentHold,
    };
}
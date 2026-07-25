import { NextResponse } from "next/server";
import {
    TableSelectionError,
    requireTableSelectionManager,
} from "@/lib/table-selection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function handle(error: unknown) {
    return json(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage table selection.",
        },
        error instanceof TableSelectionError
            ? error.status
            : 500,
    );
}

function cleanText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

async function buildPayload(eventId: string) {
    const configuration =
        await requireTableSelectionManager(eventId);
    const admin = configuration.actor.admin;

    await admin.rpc(
        "regigo_release_expired_table_holds_v1",
        { p_event_id: eventId },
    );

    const [settingsResult, tablesResult, assignmentsResult, holdsResult] =
        await Promise.all([
            admin
                .from("event_table_selection_settings")
                .select(
                    "hold_minutes, allow_changes, require_paid_ticket, allow_registration_selection, allow_rsvp_selection, selection_required, instructions",
                )
                .eq("event_id", eventId)
                .maybeSingle(),

            admin
                .from("event_tables")
                .select(
                    "id, table_name, capacity, guest_selectable, selection_label, selection_description, selection_order",
                )
                .eq("event_id", eventId)
                .order("selection_order", {
                    ascending: true,
                })
                .order("table_name", {
                    ascending: true,
                }),

            admin
                .from("table_assignments")
                .select(
                    "id, table_id, registration_id, assignment_source, assigned_at",
                )
                .eq("event_id", eventId),

            admin
                .from("table_selection_holds")
                .select(
                    "id, table_id, registration_id, party_size, expires_at",
                )
                .eq("event_id", eventId)
                .gt("expires_at", new Date().toISOString()),
        ]);

    for (const result of [
        settingsResult,
        tablesResult,
        assignmentsResult,
        holdsResult,
    ]) {
        if (result.error) {
            throw new TableSelectionError(
                result.error.message,
            );
        }
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
        const { data, error } = await admin
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

    const confirmed = new Map<string, number>();
    for (const assignment of assignments) {
        const tableId = String(assignment.table_id);
        const registrationId = String(
            assignment.registration_id,
        );
        confirmed.set(
            tableId,
            (confirmed.get(tableId) || 0) +
                (partySizeMap.get(registrationId) || 1),
        );
    }

    const held = new Map<string, number>();
    for (const hold of holds) {
        const tableId = String(hold.table_id);
        held.set(
            tableId,
            (held.get(tableId) || 0) +
                Math.max(Number(hold.party_size || 1), 1),
        );
    }

    const tables = (tablesResult.data || []).map(
        (table) => {
            const tableId = String(table.id);
            const capacity = Math.max(
                Number(table.capacity || 0),
                0,
            );
            const confirmedSeats =
                confirmed.get(tableId) || 0;
            const heldSeats = held.get(tableId) || 0;

            return {
                ...table,
                confirmedSeats,
                heldSeats,
                availableSeats: Math.max(
                    capacity - confirmedSeats - heldSeats,
                    0,
                ),
            };
        },
    );

    return {
        configuration,
        settings: settingsResult.data,
        tables,
    };
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{ eventId: string }>;
    },
) {
    try {
        const { eventId } = await params;
        const payload = await buildPayload(eventId);

        return json({
            success: true,
            event: payload.configuration.event,
            settings: payload.settings,
            tables: payload.tables,
        });
    } catch (error) {
        return handle(error);
    }
}

export async function PATCH(
    request: Request,
    {
        params,
    }: {
        params: Promise<{ eventId: string }>;
    },
) {
    try {
        const { eventId } = await params;
        const configuration =
            await requireTableSelectionManager(eventId);
        const admin = configuration.actor.admin;
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const action = cleanText(body.action);

        if (action === "settings") {
            const holdMinutes = Number(body.holdMinutes);

            if (
                !Number.isInteger(holdMinutes) ||
                holdMinutes < 2 ||
                holdMinutes > 30
            ) {
                throw new TableSelectionError(
                    "Hold time must be between 2 and 30 minutes.",
                );
            }

            const { error } = await admin
                .from("event_table_selection_settings")
                .upsert(
                    {
                        event_id: eventId,
                        hold_minutes: holdMinutes,
                        allow_changes:
                            body.allowChanges !== false,
                        require_paid_ticket:
                            body.requirePaidTicket !== false,
                        allow_registration_selection:
                            body.allowRegistrationSelection !== false,
                        allow_rsvp_selection:
                            body.allowRsvpSelection !== false,
                        selection_required:
                            body.selectionRequired === true,
                        instructions:
                            cleanText(body.instructions) ||
                            null,
                    },
                    { onConflict: "event_id" },
                );

            if (error) {
                throw new TableSelectionError(error.message);
            }
        } else if (action === "table") {
            const tableId = cleanText(body.tableId);

            if (!tableId) {
                throw new TableSelectionError(
                    "Choose a table.",
                );
            }

            const selectionOrder = Number(
                body.selectionOrder || 0,
            );

            if (!Number.isInteger(selectionOrder)) {
                throw new TableSelectionError(
                    "Table order must be a whole number.",
                );
            }

            const { error } = await admin
                .from("event_tables")
                .update({
                    guest_selectable:
                        body.guestSelectable === true,
                    selection_label:
                        cleanText(body.selectionLabel) || null,
                    selection_description:
                        cleanText(
                            body.selectionDescription,
                        ) || null,
                    selection_order: selectionOrder,
                })
                .eq("id", tableId)
                .eq("event_id", eventId);

            if (error) {
                throw new TableSelectionError(error.message);
            }
        } else if (action === "bulk") {
            const { error } = await admin
                .from("event_tables")
                .update({
                    guest_selectable:
                        body.enabled === true,
                })
                .eq("event_id", eventId);

            if (error) {
                throw new TableSelectionError(error.message);
            }
        } else {
            throw new TableSelectionError(
                "Choose a valid table-selection action.",
            );
        }

        const payload = await buildPayload(eventId);

        return json({
            success: true,
            message: "Table-selection settings updated.",
            settings: payload.settings,
            tables: payload.tables,
        });
    } catch (error) {
        return handle(error);
    }
}

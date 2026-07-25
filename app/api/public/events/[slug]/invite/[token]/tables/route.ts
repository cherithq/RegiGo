import { NextResponse } from "next/server";
import {
    TableSelectionError,
    getTableSelectionSnapshot,
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

function snapshotResponse(
    snapshot: Awaited<
        ReturnType<typeof getTableSelectionSnapshot>
    >,
) {
    const currentTable =
        snapshot.tables.find(
            (table) =>
                String(table.id) ===
                String(
                    snapshot.currentAssignment?.table_id ||
                        "",
                ),
        ) || null;

    const heldTable =
        snapshot.tables.find(
            (table) =>
                String(table.id) ===
                String(snapshot.currentHold?.table_id || ""),
        ) || null;

    return {
        success: true,
        event: {
            id: snapshot.event.id,
            event_name: snapshot.event.event_name,
            event_date: snapshot.event.event_date,
            event_time: snapshot.event.event_time,
            venue: snapshot.event.venue,
        },
        guest: {
            id: snapshot.registration.id,
            full_name: snapshot.registration.full_name,
            partySize: snapshot.partySize,
            paymentStatus:
                snapshot.registration.payment_status,
        },
        settings: snapshot.settings,
        tables: snapshot.tables,
        currentAssignment: snapshot.currentAssignment
            ? {
                  ...snapshot.currentAssignment,
                  table: currentTable,
              }
            : null,
        currentHold: snapshot.currentHold
            ? {
                  ...snapshot.currentHold,
                  table: heldTable,
              }
            : null,
    };
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{
            slug: string;
            token: string;
        }>;
    },
) {
    try {
        const { slug, token } = await params;
        const snapshot =
            await getTableSelectionSnapshot({
                slug,
                token,
            });

        return json(snapshotResponse(snapshot));
    } catch (error) {
        return handle(error);
    }
}

export async function POST(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            slug: string;
            token: string;
        }>;
    },
) {
    try {
        const { slug, token } = await params;
        const body = (await request.json()) as {
            action?: unknown;
            tableId?: unknown;
        };
        const action =
            typeof body.action === "string"
                ? body.action.trim()
                : "";

        const snapshot =
            await getTableSelectionSnapshot({
                slug,
                token,
            });

        if (action === "hold") {
            const tableId =
                typeof body.tableId === "string"
                    ? body.tableId.trim()
                    : "";

            if (!tableId) {
                throw new TableSelectionError(
                    "Choose a table.",
                );
            }

            const selectedTable = snapshot.tables.find(
                (table) => String(table.id) === tableId,
            );

            if (!selectedTable) {
                throw new TableSelectionError(
                    "The selected table is not available.",
                    409,
                );
            }

            if (
                Number(selectedTable.availableSeats) <
                snapshot.partySize
            ) {
                throw new TableSelectionError(
                    "The selected table does not have enough seats for your party.",
                    409,
                );
            }

            const { error } = await snapshot.admin.rpc(
                "regigo_hold_event_table_v1",
                {
                    p_event_id: snapshot.event.id,
                    p_registration_id:
                        snapshot.registration.id,
                    p_table_id: tableId,
                },
            );

            if (error) {
                throw new TableSelectionError(
                    error.message,
                    409,
                );
            }
        } else if (action === "confirm") {
            const { error } = await snapshot.admin.rpc(
                "regigo_confirm_event_table_v1",
                {
                    p_event_id: snapshot.event.id,
                    p_registration_id:
                        snapshot.registration.id,
                },
            );

            if (error) {
                throw new TableSelectionError(
                    error.message,
                    409,
                );
            }
        } else if (action === "release") {
            const { error } = await snapshot.admin.rpc(
                "regigo_release_event_table_hold_v1",
                {
                    p_event_id: snapshot.event.id,
                    p_registration_id:
                        snapshot.registration.id,
                },
            );

            if (error) {
                throw new TableSelectionError(error.message);
            }
        } else {
            throw new TableSelectionError(
                "Choose a valid table-selection action.",
            );
        }

        const refreshed =
            await getTableSelectionSnapshot({
                slug,
                token,
            });

        return json({
            ...snapshotResponse(refreshed),
            message:
                action === "confirm"
                    ? "Your table has been confirmed."
                    : action === "hold"
                      ? "The table is temporarily held for your party."
                      : "The temporary table hold was released.",
        });
    } catch (error) {
        return handle(error);
    }
}

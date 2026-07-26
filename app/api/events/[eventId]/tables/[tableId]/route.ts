import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

class TableError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "TableError";
        this.status = status;
    }
}

function reply(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage this table.",
        },
        error instanceof TableError ? error.status : 500,
    );
}

async function loadTable(
    admin: ReturnType<typeof getSupabaseAdminClient>,
    eventId: string,
    tableId: string,
) {
    const { data: table, error } = await admin
        .from("event_tables")
        .select("id, table_name, table_capacity")
        .eq("id", tableId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (error) {
        throw new TableError(error.message, 500);
    }

    if (!table) {
        throw new TableError(
            "This table does not belong to this event.",
            404,
        );
    }

    return table;
}

export async function PATCH(
    request: Request,
    context: {
        params: Promise<{ eventId: string; tableId: string }>;
    },
) {
    try {
        await requirePermission("can_manage_guests");

        const { eventId, tableId } = await context.params;
        const body = (await request.json()) as Record<string, unknown>;

        const admin = getSupabaseAdminClient();
        await loadTable(admin, eventId, tableId);

        const tableName =
            typeof body.tableName === "string"
                ? body.tableName.trim()
                : "";
        const capacity = Number(body.tableCapacity);

        if (!tableName) {
            throw new TableError("Enter a table name.");
        }

        if (!Number.isFinite(capacity) || capacity <= 0) {
            throw new TableError("Enter a valid capacity.");
        }

        const { data: updated, error } = await admin
            .from("event_tables")
            .update({
                table_name: tableName,
                table_capacity: capacity,
                capacity,
            })
            .eq("id", tableId)
            .eq("event_id", eventId)
            .select("*")
            .single();

        if (error) {
            throw new TableError(error.message, 500);
        }

        return reply({
            success: true,
            table: updated,
            message: "Table updated.",
        });
    } catch (error) {
        return fail(error);
    }
}

export async function DELETE(
    _request: Request,
    context: {
        params: Promise<{ eventId: string; tableId: string }>;
    },
) {
    try {
        await requirePermission("can_manage_guests");

        const { eventId, tableId } = await context.params;

        const admin = getSupabaseAdminClient();
        await loadTable(admin, eventId, tableId);

        const { error: assignmentError } = await admin
            .from("table_assignments")
            .delete()
            .eq("table_id", tableId);

        if (assignmentError) {
            throw new TableError(assignmentError.message, 500);
        }

        const { error } = await admin
            .from("event_tables")
            .delete()
            .eq("id", tableId)
            .eq("event_id", eventId);

        if (error) {
            throw new TableError(error.message, 500);
        }

        return reply({
            success: true,
            message: "Table deleted.",
        });
    } catch (error) {
        return fail(error);
    }
}

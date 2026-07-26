import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

class TableAssignError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "TableAssignError";
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
                    : "Unable to manage table assignments.",
        },
        error instanceof TableAssignError ? error.status : 500,
    );
}

function cleanId(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        await requirePermission("can_manage_guests");

        const { eventId } = await context.params;
        const body = (await request.json()) as Record<string, unknown>;
        const registrationId = cleanId(body.registrationId);
        const tableId = cleanId(body.tableId);

        if (!registrationId || !tableId) {
            throw new TableAssignError(
                "Choose a guest and a table.",
            );
        }

        const admin = getSupabaseAdminClient();

        const { data: registration, error: registrationError } =
            await admin
                .from("registrations")
                .select("id")
                .eq("id", registrationId)
                .eq("event_id", eventId)
                .maybeSingle();

        if (registrationError) {
            throw new TableAssignError(registrationError.message, 500);
        }

        if (!registration) {
            throw new TableAssignError(
                "This guest does not belong to this event.",
                404,
            );
        }

        const { data: table, error: tableError } = await admin
            .from("event_tables")
            .select("id, table_name, table_capacity")
            .eq("id", tableId)
            .eq("event_id", eventId)
            .maybeSingle();

        if (tableError) {
            throw new TableAssignError(tableError.message, 500);
        }

        if (!table) {
            throw new TableAssignError(
                "This table does not belong to this event.",
                404,
            );
        }

        const { count: currentCount, error: countError } = await admin
            .from("table_assignments")
            .select("id", { count: "exact", head: true })
            .eq("table_id", tableId)
            .neq("registration_id", registrationId);

        if (countError) {
            throw new TableAssignError(countError.message, 500);
        }

        const capacity = Number(table.table_capacity || 0);

        if (capacity > 0 && (currentCount || 0) >= capacity) {
            throw new TableAssignError(
                `${table.table_name || "This table"} is already full.`,
                409,
            );
        }

        const { data: existingAssignment, error: existingError } =
            await admin
                .from("table_assignments")
                .select("id")
                .eq("registration_id", registrationId)
                .maybeSingle();

        if (existingError) {
            throw new TableAssignError(existingError.message, 500);
        }

        const { data: savedAssignment, error: saveError } =
            existingAssignment
                ? await admin
                      .from("table_assignments")
                      .update({
                          event_id: eventId,
                          table_id: tableId,
                      })
                      .eq("registration_id", registrationId)
                      .select("*")
                      .single()
                : await admin
                      .from("table_assignments")
                      .insert({
                          event_id: eventId,
                          table_id: tableId,
                          registration_id: registrationId,
                      })
                      .select("*")
                      .single();

        if (saveError) {
            throw new TableAssignError(saveError.message, 500);
        }

        return reply({
            success: true,
            assignment: savedAssignment,
            message: "Table assigned.",
        });
    } catch (error) {
        return fail(error);
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        await requirePermission("can_manage_guests");

        const { eventId } = await context.params;
        const body = (await request.json()) as Record<string, unknown>;
        const registrationId = cleanId(body.registrationId);

        if (!registrationId) {
            throw new TableAssignError("Choose a guest.");
        }

        const admin = getSupabaseAdminClient();

        const { data: registration, error: registrationError } =
            await admin
                .from("registrations")
                .select("id")
                .eq("id", registrationId)
                .eq("event_id", eventId)
                .maybeSingle();

        if (registrationError) {
            throw new TableAssignError(registrationError.message, 500);
        }

        if (!registration) {
            throw new TableAssignError(
                "This guest does not belong to this event.",
                404,
            );
        }

        // table_assignments.event_id is not reliably populated, so scope
        // the delete by registration_id alone (already verified above).
        const { error } = await admin
            .from("table_assignments")
            .delete()
            .eq("registration_id", registrationId);

        if (error) {
            throw new TableAssignError(error.message, 500);
        }

        return reply({
            success: true,
            message: "Table assignment removed.",
        });
    } catch (error) {
        return fail(error);
    }
}

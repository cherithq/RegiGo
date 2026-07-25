import {
    NextResponse,
} from "next/server";
import {
    assertCompanyScope,
    CompanyModuleError,
    getCompanyActor,
} from "@/lib/company-module-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function text(
    value: unknown,
    max = 300,
) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

function fail(error: unknown) {
    return json(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to delete the event.",
        },
        error instanceof
        CompanyModuleError
            ? error.status
            : 500,
    );
}

export async function DELETE(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } =
            await params;
        const actor =
            await getCompanyActor();

        const {
            data: event,
            error: eventError,
        } = await actor.admin
            .from("events")
            .select(
                "id, company_id, event_name",
            )
            .eq("id", eventId)
            .maybeSingle();

        if (eventError) {
            throw new CompanyModuleError(
                eventError.message,
            );
        }

        if (!event) {
            throw new CompanyModuleError(
                "The event could not be found.",
                404,
            );
        }

        assertCompanyScope({
            actor,
            companyId:
                event.company_id,
        });

        let body: Record<
            string,
            unknown
        > = {};

        try {
            body =
                await request.json();
        } catch {
            body = {};
        }

        const confirmationName =
            text(
                body.confirmationName,
            );

        if (
            confirmationName !==
            event.event_name
        ) {
            throw new CompanyModuleError(
                "The confirmation name does not match the event name.",
                409,
            );
        }

        const {
            data,
            error,
        } = await actor.admin.rpc(
            "regigo_delete_event_v1",
            {
                p_event_id:
                    eventId,
                p_confirmation_name:
                    confirmationName,
                p_deleted_by:
                    actor.user.id,
            },
        );

        if (error) {
            const isForeignKeyError =
                error.code ===
                "23503";

            throw new CompanyModuleError(
                isForeignKeyError
                    ? "The event still has a database relationship that is not configured for cascade deletion. Run the event deletion migration, then try again."
                    : error.message,
                isForeignKeyError
                    ? 409
                    : 500,
            );
        }

        const deleted =
            Array.isArray(data)
                ? data[0]
                : data;

        if (!deleted?.deleted_event_id) {
            throw new CompanyModuleError(
                "The event was not deleted.",
                500,
            );
        }

        return json({
            success: true,
            deletedEventId:
                deleted.deleted_event_id,
            eventName:
                deleted.deleted_event_name,
            redirectTo:
                "/dashboard/events",
            message:
                "Event permanently deleted.",
        });
    } catch (error) {
        return fail(error);
    }
}

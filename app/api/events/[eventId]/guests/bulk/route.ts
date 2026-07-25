import {
    NextResponse,
} from "next/server";
import {
    CompanyModuleError,
} from "@/lib/company-module-server";
import {
    cleanGuestStatus,
    cleanGuestText,
    positiveInteger,
    requireLargeEventAccess,
} from "@/lib/large-event-operations";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

const missingSchemaCodes =
    new Set([
        "42703",
        "42P01",
        "42883",
        "PGRST200",
        "PGRST202",
        "PGRST204",
        "PGRST205",
    ]);

function isMissingSchema(
    error:
        | {
              code?: string | null;
              message?: string | null;
          }
        | null
        | undefined,
) {
    if (
        missingSchemaCodes.has(
            String(error?.code || ""),
        )
    ) {
        return true;
    }

    const message =
        String(
            error?.message || "",
        ).toLowerCase();

    return (
        message.includes(
            "does not exist",
        ) ||
        message.includes(
            "schema cache",
        ) ||
        message.includes(
            "could not find",
        )
    );
}

export async function POST(
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
        const {
            eventId,
        } = await params;
        const context =
            await requireLargeEventAccess(
                {
                    eventId,
                    write: true,
                },
            );
        const body =
            (await request.json()) as {
                guests?: unknown;
            };

        if (
            !Array.isArray(
                body.guests,
            )
        ) {
            throw new CompanyModuleError(
                "Guests must be an array.",
            );
        }

        if (
            body.guests.length <
                1 ||
            body.guests.length >
                500
        ) {
            throw new CompanyModuleError(
                "Each import request must contain between 1 and 500 guests.",
            );
        }

        const guests =
            body.guests.map(
                (
                    item,
                    index,
                ) => {
                    const record =
                        item &&
                        typeof item ===
                            "object"
                            ? item as Record<
                                  string,
                                  unknown
                              >
                            : {};
                    const fullName =
                        cleanGuestText(
                            record.fullName ??
                                record.full_name ??
                                record.name,
                            180,
                        );

                    if (
                        fullName.length <
                        2
                    ) {
                        throw new CompanyModuleError(
                            `Row ${index + 1} is missing a valid guest name.`,
                        );
                    }

                    return {
                        full_name:
                            fullName,
                        email:
                            cleanGuestText(
                                record.email,
                                320,
                            ).toLowerCase() ||
                            null,
                        phone:
                            cleanGuestText(
                                record.phone,
                                60,
                            ) ||
                            null,
                        department:
                            cleanGuestText(
                                record.department,
                                160,
                            ) ||
                            null,
                        ticket_type_id:
                            cleanGuestText(
                                record.ticketTypeId ??
                                    record.ticket_type_id,
                                80,
                            ) ||
                            null,
                        selected_ticket_quantity:
                            positiveInteger(
                                record.quantity ??
                                    record.selected_ticket_quantity,
                                1,
                                100,
                            ),
                        registration_status:
                            cleanGuestStatus(
                                record.registration_status ??
                                    record.status,
                            ),
                    };
                },
            );

        const {
            data,
            error,
        } =
            await context.actor.admin.rpc(
                "regigo_bulk_register_guests_large_event_v2",
                {
                    p_event_id:
                        eventId,
                    p_guests:
                        guests,
                    p_created_by:
                        context.actor
                            .user.id,
                },
            );

        if (
            error &&
            !isMissingSchema(
                error,
            )
        ) {
            throw new CompanyModuleError(
                error.message,
                error.code ===
                    "P0001"
                    ? 409
                    : 400,
            );
        }

        if (!error) {
            return NextResponse.json(
                {
                    success: true,
                    inserted:
                        Number(
                            data || 0,
                        ),
                },
                {
                    status: 201,
                    headers: {
                        "Cache-Control":
                            "no-store",
                    },
                },
            );
        }

        // Compatibility fallback until the v2 RPC migration is installed.
        const currentCount =
            await context.actor.admin
                .from(
                    "registrations",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head: true,
                    },
                )
                .eq(
                    "event_id",
                    eventId,
                )
                .not(
                    "registration_status",
                    "in",
                    "(cancelled,declined)",
                );

        if (
            currentCount.error
        ) {
            throw new CompanyModuleError(
                `${currentCount.error.message}. Run the Guest List registration-status migration.`,
                500,
            );
        }

        const requestedSeats =
            guests.reduce(
                (
                    total,
                    guest,
                ) =>
                    total +
                    (
                        [
                            "cancelled",
                            "declined",
                        ].includes(
                            guest.registration_status,
                        )
                            ? 0
                            : guest.selected_ticket_quantity
                    ),
                0,
            );

        if (
            Number(
                currentCount.count ||
                    0,
            ) +
                requestedSeats >
            context.event
                .maxGuests
        ) {
            throw new CompanyModuleError(
                `This import would exceed the event capacity of ${context.event.maxGuests.toLocaleString()} guests.`,
                409,
            );
        }

        const rows =
            guests.map(
                (guest) => ({
                    event_id:
                        eventId,
                    ...guest,
                    created_by:
                        context.actor
                            .user.id,
                }),
            );
        const {
            data:
                insertedRows,
            error:
                insertError,
        } =
            await context.actor.admin
                .from(
                    "registrations",
                )
                .insert(
                    rows,
                )
                .select("id");

        if (
            insertError
        ) {
            throw new CompanyModuleError(
                insertError.message,
                400,
            );
        }

        return NextResponse.json(
            {
                success: true,
                inserted:
                    insertedRows
                        ?.length ||
                    rows.length,
            },
            {
                status: 201,
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to import guests.",
            },
            {
                status:
                    error instanceof
                    CompanyModuleError
                        ? error.status
                        : 500,
            },
        );
    }
}

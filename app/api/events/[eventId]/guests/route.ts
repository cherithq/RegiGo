import {
    NextResponse,
} from "next/server";
import {
    CompanyModuleError,
} from "@/lib/company-module-server";
import {
    cleanGuestStatus,
    cleanGuestText,
    decodeCursor,
    encodeCursor,
    positiveInteger,
    requireLargeEventAccess,
} from "@/lib/large-event-operations";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

type StatusColumn =
    | "registration_status"
    | "status";

const missingSchemaCodes =
    new Set([
        "42703",
        "42P01",
        "PGRST200",
        "PGRST202",
        "PGRST204",
        "PGRST205",
    ]);

function reply(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(
        body,
        {
            status,
            headers: {
                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",
            },
        },
    );
}

function fail(
    error: unknown,
) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage guests.",
        },
        error instanceof
        CompanyModuleError
            ? error.status
            : 500,
    );
}

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

async function queryGuests({
    admin,
    eventId,
    statusColumn,
    limit,
    search,
    selectedStatus,
    cursor,
}: {
    admin: any;
    eventId: string;
    statusColumn: StatusColumn;
    limit: number;
    search: string;
    selectedStatus: string;
    cursor: ReturnType<
        typeof decodeCursor
    >;
}) {
    let query =
        admin
            .from(
                "registrations",
            )
            .select(
                [
                    "id",
                    "event_id",
                    "full_name",
                    "email",
                    "phone",
                    "department",
                    statusColumn,
                    "selected_ticket_quantity",
                    "ticket_type_id",
                    "created_at",
                    "updated_at",
                ].join(", "),
            )
            .eq(
                "event_id",
                eventId,
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                },
            )
            .order(
                "id",
                {
                    ascending:
                        false,
                },
            )
            .limit(
                limit + 1,
            );

    if (search) {
        query = query.or(
            [
                `full_name.ilike.%${search}%`,
                `email.ilike.%${search}%`,
                `phone.ilike.%${search}%`,
                `department.ilike.%${search}%`,
            ].join(","),
        );
    }

    if (
        selectedStatus &&
        selectedStatus !==
            "all"
    ) {
        query = query.eq(
            statusColumn,
            selectedStatus,
        );
    }

    if (cursor) {
        query = query.or(
            `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        );
    }

    return query;
}

async function loadCounters({
    admin,
    eventId,
    statusColumn,
}: {
    admin: any;
    eventId: string;
    statusColumn: StatusColumn;
}) {
    const counterResult =
        await admin
            .from(
                "event_guest_counters",
            )
            .select(
                "registered_quantity, checked_in_quantity, updated_at",
            )
            .eq(
                "event_id",
                eventId,
            )
            .maybeSingle();

    if (
        !counterResult.error &&
        counterResult.data
    ) {
        return {
            registered:
                Number(
                    counterResult
                        .data
                        .registered_quantity ||
                        0,
                ),
            checkedIn:
                Number(
                    counterResult
                        .data
                        .checked_in_quantity ||
                        0,
                ),
        };
    }

    const registrationCountQuery =
        admin
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
                statusColumn,
                "in",
                "(cancelled,declined)",
            );

    const checkInCountQuery =
        admin
            .from(
                "check_ins",
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
            );

    const [
        registrationCount,
        checkInCount,
    ] = await Promise.all([
        registrationCountQuery,
        checkInCountQuery,
    ]);

    return {
        registered:
            Number(
                registrationCount
                    .count ||
                    0,
            ),
        checkedIn:
            Number(
                checkInCount
                    .count ||
                    0,
            ),
    };
}

export async function GET(
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
                },
            );
        const url =
            new URL(
                request.url,
            );
        const limit =
            positiveInteger(
                url.searchParams.get(
                    "limit",
                ),
                100,
                200,
            );
        const search =
            cleanGuestText(
                url.searchParams.get(
                    "search",
                ),
                120,
            ).replace(
                /[%_,()]/g,
                " ",
            );
        const selectedStatus =
            cleanGuestText(
                url.searchParams.get(
                    "status",
                ),
                40,
            ).toLowerCase();
        const cursor =
            decodeCursor(
                url.searchParams.get(
                    "cursor",
                ),
            );

        let statusColumn:
            StatusColumn =
            "registration_status";
        let guestResult =
            await queryGuests({
                admin:
                    context.actor
                        .admin,
                eventId,
                statusColumn,
                limit,
                search,
                selectedStatus,
                cursor,
            });

        if (
            guestResult.error &&
            isMissingSchema(
                guestResult.error,
            )
        ) {
            statusColumn =
                "status";
            guestResult =
                await queryGuests({
                    admin:
                        context.actor
                            .admin,
                    eventId,
                    statusColumn,
                    limit,
                    search,
                    selectedStatus,
                    cursor,
                });
        }

        if (
            guestResult.error
        ) {
            throw new CompanyModuleError(
                guestResult.error
                    .message,
            );
        }

        const rawRows =
            guestResult.data ||
            [];
        const hasMore =
            rawRows.length >
            limit;
        const visibleRows =
            hasMore
                ? rawRows.slice(
                      0,
                      limit,
                  )
                : rawRows;
        const guests =
            visibleRows.map(
                (
                    row: Record<
                        string,
                        unknown
                    >,
                ) => {
                    const normalizedStatus =
                        cleanGuestStatus(
                            row[
                                statusColumn
                            ],
                        );

                    return {
                        ...row,
                        status:
                            normalizedStatus,
                        registration_status:
                            normalizedStatus,
                    };
                },
            );
        const last =
            guests[
                guests.length -
                    1
            ];
        const counters =
            await loadCounters({
                admin:
                    context.actor
                        .admin,
                eventId,
                statusColumn,
            });

        return reply({
            success: true,
            event:
                context.event,
            guests,
            pagination: {
                limit,
                hasMore,
                nextCursor:
                    hasMore &&
                    last
                        ? encodeCursor(
                              {
                                  createdAt:
                                      String(
                                          last.created_at,
                                      ),
                                  id:
                                      String(
                                          last.id,
                                      ),
                              },
                          )
                        : null,
            },
            counters: {
                registered:
                    counters.registered,
                checkedIn:
                    counters.checkedIn,
                capacity:
                    context.event
                        .maxGuests,
            },
            schema: {
                statusColumn,
            },
            access: {
                canWrite:
                    context.actor
                        .isPlatformAdmin ||
                    context.actor
                        .role ===
                        "admin" ||
                    context.actor
                        .role ===
                        "organizer",
            },
        });
    } catch (error) {
        return fail(
            error,
        );
    }
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
            (await request.json()) as Record<
                string,
                unknown
            >;
        const fullName =
            cleanGuestText(
                body.fullName,
                180,
            );
        const email =
            cleanGuestText(
                body.email,
                320,
            ).toLowerCase();
        const guestQuantity =
            positiveInteger(
                body.quantity,
                1,
                100,
            );
        const registrationStatus =
            cleanGuestStatus(
                body.status ??
                    body.registrationStatus,
            );

        if (
            fullName.length <
            2
        ) {
            throw new CompanyModuleError(
                "Enter the guest's full name.",
            );
        }

        const {
            data,
            error,
        } =
            await context.actor.admin.rpc(
                "regigo_register_guest_large_event_v2",
                {
                    p_event_id:
                        eventId,
                    p_full_name:
                        fullName,
                    p_email:
                        email ||
                        null,
                    p_phone:
                        cleanGuestText(
                            body.phone,
                            60,
                        ) ||
                        null,
                    p_department:
                        cleanGuestText(
                            body.department,
                            160,
                        ) ||
                        null,
                    p_ticket_type_id:
                        cleanGuestText(
                            body.ticketTypeId,
                            80,
                        ) ||
                        null,
                    p_quantity:
                        guestQuantity,
                    p_registration_status:
                        registrationStatus,
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
            return reply(
                {
                    success: true,
                    registrationId:
                        data,
                    message:
                        "Guest registered.",
                },
                201,
            );
        }

        // Compatibility fallback before the migration/RPC is installed.
        const countResult =
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
            countResult.error
        ) {
            throw new CompanyModuleError(
                `${countResult.error.message}. Run the Guest List registration-status migration.`,
                500,
            );
        }

        if (
            Number(
                countResult.count ||
                    0,
            ) +
                guestQuantity >
            context.event
                .maxGuests
        ) {
            throw new CompanyModuleError(
                `This event has reached its maximum capacity of ${context.event.maxGuests.toLocaleString()} guests.`,
                409,
            );
        }

        const {
            data:
                insertedRegistration,
            error:
                insertError,
        } =
            await context.actor.admin
                .from(
                    "registrations",
                )
                .insert({
                    event_id:
                        eventId,
                    full_name:
                        fullName,
                    email:
                        email ||
                        null,
                    phone:
                        cleanGuestText(
                            body.phone,
                            60,
                        ) ||
                        null,
                    department:
                        cleanGuestText(
                            body.department,
                            160,
                        ) ||
                        null,
                    ticket_type_id:
                        cleanGuestText(
                            body.ticketTypeId,
                            80,
                        ) ||
                        null,
                    selected_ticket_quantity:
                        guestQuantity,
                    registration_status:
                        registrationStatus,
                    created_by:
                        context.actor
                            .user.id,
                })
                .select("id")
                .single();

        if (
            insertError ||
            !insertedRegistration
        ) {
            throw new CompanyModuleError(
                insertError
                    ?.message ||
                    "Unable to register the guest.",
                400,
            );
        }

        return reply(
            {
                success: true,
                registrationId:
                    insertedRegistration.id,
                message:
                    "Guest registered.",
            },
            201,
        );
    } catch (error) {
        return fail(
            error,
        );
    }
}

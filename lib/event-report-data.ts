import "server-only";

import {
    type SupabaseClient,
} from "@supabase/supabase-js";
import {
    EventAnalyticsError,
    loadAllRows,
    normalizeAnalyticsMode,
    requireEventAnalyticsAccess,
    type EventAnalyticsMode,
} from "@/lib/event-analytics-server";

export type ReportRegistration = {
    id: string;
    event_id: string;
    full_name:
        | string
        | null;
    email:
        | string
        | null;
    phone:
        | string
        | null;
    department:
        | string
        | null;
    dietary_request:
        | string
        | null;
    registration_status:
        | string
        | null;
    rsvp_status:
        | string
        | null;
    selected_ticket_quantity:
        | number
        | null;
    ticket_type_id:
        | string
        | null;
    custom_answers:
        | Record<
              string,
              unknown
          >
        | null;
    created_at:
        | string
        | null;
};

export type ReportInvitation = {
    id: string;
    event_id: string;
    registration_id: string;
    status:
        | string
        | null;
    sent_at:
        | string
        | null;
    opened_at:
        | string
        | null;
    responded_at:
        | string
        | null;
    expires_at:
        | string
        | null;
    created_at:
        | string
        | null;
};

export type ReportCheckIn = {
    registration_id:
        | string
        | null;
    checked_in_at:
        | string
        | null;
};

export type ReportField = {
    id: string;
    field_label:
        | string
        | null;
    field_key:
        | string
        | null;
    field_type:
        | string
        | null;
    sort_order:
        | number
        | null;
};

export type ReportAssignment = {
    registration_id:
        | string
        | null;
    table_id?:
        | string
        | null;
    // Some rows carry the table reference and/or name under different
    // column names than the current schema — see the fallback lookups
    // below (and the matching handling in lib/badges.ts).
    event_table_id?:
        | string
        | null;
    table_name?:
        | string
        | null;
    table_label?:
        | string
        | null;
};

export type ReportTable = {
    id: string;
    table_name:
        | string
        | null;
    capacity:
        | number
        | null;
};

export type EventReportGuest = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    dietaryRequest: string;
    registrationStatus: string;
    rsvpStatus: string;
    guestQuantity: number;
    registeredAt: string;
    checkedIn: boolean;
    checkedInAt: string;
    assignedTable: string;
    invitationStatus: string;
    invitationSentAt: string;
    invitationOpenedAt: string;
    invitationRespondedAt: string;
    customAnswers:
        Record<
            string,
            unknown
        >;
};

export type EventReportDataset = {
    context:
        Awaited<
            ReturnType<
                typeof requireEventAnalyticsAccess
            >
        >;
    mode:
        EventAnalyticsMode;
    registrations:
        ReportRegistration[];
    invitations:
        ReportInvitation[];
    checkIns:
        ReportCheckIn[];
    form:
        | {
              id: string;
              form_title?:
                  | string
                  | null;
              form_description?:
                  | string
                  | null;
          }
        | null;
    fields:
        ReportField[];
    assignments:
        ReportAssignment[];
    tables:
        ReportTable[];
    guests:
        EventReportGuest[];
};

const optionalErrors =
    new Set([
        "42P01",
        "42703",
        "PGRST200",
        "PGRST204",
        "PGRST205",
    ]);

function isOptionalError(
    error:
        | {
              code?: string | null;
              message?: string | null;
          }
        | null
        | undefined,
) {
    if (
        optionalErrors.has(
            String(
                error?.code ||
                    "",
            ),
        )
    ) {
        return true;
    }

    const message =
        String(
            error?.message ||
                "",
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

function clean(
    value: unknown,
) {
    return String(
        value ||
            "",
    ).trim();
}

function lower(
    value: unknown,
    fallback = "",
) {
    return clean(
        value ||
            fallback,
    ).toLowerCase();
}

function quantity(
    value: unknown,
) {
    const parsed =
        Number(value);

    return Number.isFinite(
        parsed,
    )
        ? Math.max(
              1,
              Math.round(
                  parsed,
              ),
          )
        : 1;
}

async function loadRegistrations({
    admin,
    eventId,
}: {
    admin: SupabaseClient;
    eventId: string;
}) {
    try {
        return await loadAllRows<ReportRegistration>({
            admin,
            table:
                "registrations",
            columns:
                "id, event_id, full_name, email, phone, department, dietary_request, registration_status, rsvp_status, selected_ticket_quantity, ticket_type_id, custom_answers, created_at",
            eventId,
        });
    } catch (error) {
        const message =
            error instanceof
                Error
                ? error.message
                : "";

        if (
            !message.includes(
                "dietary_request",
            )
        ) {
            throw error;
        }

        const rows =
            await loadAllRows<
                Omit<
                    ReportRegistration,
                    "dietary_request"
                >
            >({
                admin,
                table:
                    "registrations",
                columns:
                    "id, event_id, full_name, email, phone, department, registration_status, rsvp_status, selected_ticket_quantity, ticket_type_id, custom_answers, created_at",
                eventId,
            });

        return rows.map(
            (row) => ({
                ...row,
                dietary_request:
                    null,
            }),
        );
    }
}

async function loadCheckIns({
    admin,
    eventId,
}: {
    admin: SupabaseClient;
    eventId: string;
}) {
    // check_ins has no created_at column — checked_in_at is the only
    // timestamp, so that's both what we select and what we order/dedupe by.
    // Uses loadAllRows to paginate past PostgREST's default 1000-row cap,
    // which silently truncated a single .range() call on larger events.
    return loadAllRows<ReportCheckIn>({
        admin,
        table:
            "check_ins",
        columns:
            "registration_id, checked_in_at",
        eventId,
        orderColumn:
            "checked_in_at",
    });
}

async function loadOptionalRows<T>({
    admin,
    table,
    columns,
    eventId,
    orderColumn,
}: {
    admin: SupabaseClient;
    table: string;
    columns: string;
    eventId: string;
    orderColumn: string;
}) {
    try {
        return await loadAllRows<T>({
            admin,
            table,
            columns,
            eventId,
            orderColumn,
        });
    } catch (error) {
        const message =
            error instanceof
                Error
                ? error.message
                : "";

        if (
            message.includes(
                "does not exist",
            ) ||
            message.includes(
                "schema cache",
            ) ||
            message.includes(
                "could not find",
            )
        ) {
            return [];
        }

        throw error;
    }
}

async function loadOptionalRowsIn<T>({
    admin,
    table,
    columns,
    column,
    ids,
    orderColumn,
    chunkSize = 200,
}: {
    admin: SupabaseClient;
    table: string;
    columns: string;
    column: string;
    ids: string[];
    orderColumn: string;
    chunkSize?: number;
}) {
    try {
        const chunks: string[][] = [];

        for (
            let start = 0;
            start < ids.length;
            start += chunkSize
        ) {
            chunks.push(
                ids.slice(
                    start,
                    start + chunkSize,
                ),
            );
        }

        // Chunks are independent lookups, so fetch them concurrently —
        // on large events (thousands of registrations => dozens of
        // chunks) doing this sequentially took 7+ seconds and risked
        // tripping the serverless function timeout on the export/print
        // route.
        const results =
            await Promise.all(
                chunks.map(
                    (chunk) =>
                        admin
                            .from(table)
                            .select(columns)
                            .in(column, chunk)
                            .order(orderColumn, {
                                ascending: true,
                            }),
                ),
            );

        const rows: T[] = [];

        for (const { data, error } of results) {
            if (error) {
                throw new EventAnalyticsError(
                    error.message,
                );
            }

            rows.push(...((data || []) as T[]));
        }

        return rows;
    } catch (error) {
        const message =
            error instanceof
                Error
                ? error.message
                : "";

        if (
            message.includes(
                "does not exist",
            ) ||
            message.includes(
                "schema cache",
            ) ||
            message.includes(
                "could not find",
            )
        ) {
            return [];
        }

        throw error;
    }
}

async function loadFields({
    admin,
    eventId,
}: {
    admin: SupabaseClient;
    eventId: string;
}) {
    const formResult =
        await admin
            .from(
                "registration_forms",
            )
            .select(
                "id, form_title, form_description",
            )
            .eq(
                "event_id",
                eventId,
            )
            .maybeSingle();

    if (
        formResult.error &&
        !isOptionalError(
            formResult.error,
        )
    ) {
        throw new EventAnalyticsError(
            formResult.error
                .message,
        );
    }

    if (
        !formResult.data
            ?.id
    ) {
        return {
            form:
                null,
            fields:
                [] as ReportField[],
        };
    }

    const fieldResult =
        await admin
            .from(
                "registration_fields",
            )
            .select(
                "id, field_label, field_key, field_type, sort_order",
            )
            .eq(
                "form_id",
                formResult
                    .data
                    .id,
            )
            .order(
                "sort_order",
                {
                    ascending:
                        true,
                },
            );

    if (
        fieldResult.error &&
        !isOptionalError(
            fieldResult.error,
        )
    ) {
        throw new EventAnalyticsError(
            fieldResult.error
                .message,
        );
    }

    return {
        form:
            formResult.data,
        fields:
            (
                fieldResult.data ||
                []
            ) as ReportField[],
    };
}

export async function loadEventReportDataset(
    eventId: string,
) {
    const context =
        await requireEventAnalyticsAccess(
            eventId,
        );
    const {
        admin,
    } = context;

    const [
        settingsResult,
        registrations,
        invitations,
        checkIns,
        fieldResult,
        tables,
    ] =
        await Promise.all([
            admin
                .from(
                    "event_settings",
                )
                .select(
                    "registration_mode, registration_is_open",
                )
                .eq(
                    "event_id",
                    eventId,
                )
                .maybeSingle(),

            loadRegistrations({
                admin,
                eventId,
            }),

            loadOptionalRows<ReportInvitation>({
                admin,
                table:
                    "event_invitations",
                columns:
                    "id, event_id, registration_id, status, sent_at, opened_at, responded_at, expires_at, created_at",
                eventId,
                orderColumn:
                    "created_at",
            }),

            loadCheckIns({
                admin,
                eventId,
            }),

            loadFields({
                admin,
                eventId,
            }),

            loadOptionalRows<ReportTable>({
                admin,
                table:
                    "event_tables",
                columns:
                    "id, table_name, capacity:table_capacity",
                eventId,
                orderColumn:
                    "table_name",
            }),
        ]);

    // table_assignments.event_id is not reliably populated, so scope by
    // this event's registration ids instead of filtering on event_id directly.
    const registrationIds = registrations.map(
        (registration) => registration.id,
    );

    const assignments = registrationIds.length
        ? await loadOptionalRowsIn<ReportAssignment>({
              admin,
              table: "table_assignments",
              columns: "*",
              column: "registration_id",
              ids: registrationIds,
              orderColumn: "registration_id",
          })
        : [];

    if (
        settingsResult.error &&
        !isOptionalError(
            settingsResult.error,
        )
    ) {
        throw new EventAnalyticsError(
            settingsResult.error
                .message,
        );
    }

    const mode =
        normalizeAnalyticsMode({
            storedMode:
                settingsResult.data
                    ?.registration_mode,
            registrationOpen:
                settingsResult.data
                    ?.registration_is_open !==
                false,
            invitationCount:
                invitations.length,
        });
    const invitationByRegistration =
        new Map(
            invitations.map(
                (
                    invitation,
                ) => [
                    String(
                        invitation.registration_id,
                    ),
                    invitation,
                ],
            ),
        );
    const checkInByRegistration =
        new Map<
            string,
            ReportCheckIn
        >();

    for (const checkIn of
        checkIns) {
        const id =
            clean(
                checkIn.registration_id,
            );

        if (!id) {
            continue;
        }

        const current =
            checkInByRegistration.get(
                id,
            );
        const currentTime =
            new Date(
                current
                    ?.checked_in_at ||
                    0,
            ).getTime();
        const nextTime =
            new Date(
                checkIn.checked_in_at ||
                    0,
            ).getTime();

        if (
            !current ||
            nextTime <
                currentTime
        ) {
            checkInByRegistration.set(
                id,
                checkIn,
            );
        }
    }

    const tableById =
        new Map(
            tables.map(
                (table) => [
                    String(
                        table.id,
                    ),
                    table,
                ],
            ),
        );
    const tableByRegistration =
        new Map<
            string,
            string
        >();

    for (const assignment of
        assignments) {
        const registrationId =
            clean(
                assignment.registration_id,
            );
        const table =
            tableById.get(
                clean(
                    assignment.table_id ||
                        assignment.event_table_id,
                ),
            );
        // Fall back to a name carried directly on the assignment row
        // when the table_id reference doesn't resolve against this
        // event's tables (matches the fallback lib/badges.ts uses).
        const tableName =
            clean(
                table?.table_name ||
                    assignment.table_name ||
                    assignment.table_label,
            );

        if (
            registrationId &&
            tableName
        ) {
            tableByRegistration.set(
                registrationId,
                tableName,
            );
        }
    }

    const guests =
        registrations.map(
            (
                registration,
            ): EventReportGuest => {
                const id =
                    String(
                        registration.id,
                    );
                const invitation =
                    invitationByRegistration.get(
                        id,
                    );
                const checkIn =
                    checkInByRegistration.get(
                        id,
                    );
                const customAnswers =
                    registration.custom_answers &&
                    typeof registration.custom_answers ===
                        "object" &&
                    !Array.isArray(
                        registration.custom_answers,
                    )
                        ? registration.custom_answers
                        : {};
                const dietaryRequest =
                    clean(
                        registration.dietary_request ||
                            customAnswers.dietary_request ||
                            customAnswers.dietary ||
                            customAnswers.meal_requirement,
                    );

                return {
                    id,
                    fullName:
                        clean(
                            registration.full_name,
                        ) ||
                        "Guest",
                    email:
                        clean(
                            registration.email,
                        ),
                    phone:
                        clean(
                            registration.phone,
                        ),
                    department:
                        clean(
                            registration.department ||
                                customAnswers.department,
                        ),
                    dietaryRequest,
                    registrationStatus:
                        lower(
                            registration.registration_status,
                            "registered",
                        ),
                    rsvpStatus:
                        lower(
                            registration.rsvp_status,
                            "not_invited",
                        ),
                    guestQuantity:
                        quantity(
                            registration.selected_ticket_quantity,
                        ),
                    registeredAt:
                        clean(
                            registration.created_at,
                        ),
                    checkedIn:
                        Boolean(
                            checkIn,
                        ),
                    checkedInAt:
                        clean(
                            checkIn
                                ?.checked_in_at,
                        ),
                    assignedTable:
                        tableByRegistration.get(
                            id,
                        ) ||
                        "",
                    invitationStatus:
                        lower(
                            invitation?.status,
                            registration.rsvp_status ||
                                "not_invited",
                        ),
                    invitationSentAt:
                        clean(
                            invitation
                                ?.sent_at,
                        ),
                    invitationOpenedAt:
                        clean(
                            invitation
                                ?.opened_at,
                        ),
                    invitationRespondedAt:
                        clean(
                            invitation
                                ?.responded_at,
                        ),
                    customAnswers,
                };
            },
        );

    return {
        context,
        mode,
        registrations,
        invitations,
        checkIns,
        fields:
            fieldResult.fields,
        form:
            fieldResult.form,
        assignments,
        tables,
        guests,
    };
}

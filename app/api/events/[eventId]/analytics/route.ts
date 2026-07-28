import {
    NextResponse,
} from "next/server";
import {
    dateKey,
    EventAnalyticsError,
    percentage,
} from "@/lib/event-analytics-server";
import {
    loadEventReportDataset,
    type EventReportGuest,
    type ReportField,
    type ReportRegistration,
} from "@/lib/event-report-data";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

function reply(
    body: Record<
        string,
        unknown
    >,
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
                error instanceof
                Error
                    ? error.message
                    : "Unable to load event analytics.",
        },
        error instanceof
        EventAnalyticsError
            ? error.status
            : 500,
    );
}

function status(
    value: unknown,
    fallback = "",
) {
    return String(
        value ||
            fallback,
    )
        .trim()
        .toLowerCase();
}

function timeline(
    rows: {
        date:
            | string
            | null;
        value?: number;
    }[],
    days = 14,
) {
    const totals =
        new Map<
            string,
            number
        >();

    for (const row of
        rows) {
        const key =
            dateKey(
                row.date,
            );

        if (!key) {
            continue;
        }

        totals.set(
            key,
            (
                totals.get(
                    key,
                ) ||
                0
            ) +
                (
                    row.value ||
                    1
                ),
        );
    }

    const output: {
        date: string;
        label: string;
        value: number;
    }[] = [];
    const today =
        new Date();

    for (
        let index =
            days - 1;
        index >= 0;
        index -= 1
    ) {
        const date =
            new Date(
                today,
            );

        date.setHours(
            0,
            0,
            0,
            0,
        );
        date.setDate(
            date.getDate() -
                index,
        );

        const key =
            date
                .toISOString()
                .slice(
                    0,
                    10,
                );

        output.push({
            date:
                key,
            label:
                new Intl.DateTimeFormat(
                    "en-SG",
                    {
                        day:
                            "2-digit",
                        month:
                            "short",
                    },
                ).format(
                    date,
                ),
            value:
                totals.get(
                    key,
                ) ||
                0,
        });
    }

    return output;
}

function topBreakdown(
    values: string[],
    maximum = 10,
) {
    const counts =
        new Map<
            string,
            number
        >();

    for (const raw of
        values) {
        const value =
            String(
                raw ||
                    "",
            ).trim();

        if (!value) {
            continue;
        }

        counts.set(
            value,
            (
                counts.get(
                    value,
                ) ||
                0
            ) +
                1,
        );
    }

    return Array.from(
        counts.entries(),
    )
        .sort(
            (
                first,
                second,
            ) =>
                second[1] -
                first[1],
        )
        .slice(
            0,
            maximum,
        )
        .map(
            ([
                label,
                value,
            ]) => ({
                label,
                value,
                percentage:
                    percentage(
                        value,
                        values.filter(
                            Boolean,
                        ).length,
                    ),
            }),
        );
}

function answerValue({
    registration,
    key,
}: {
    registration:
        ReportRegistration;
    key: string;
}) {
    const custom =
        registration.custom_answers &&
        typeof registration.custom_answers ===
            "object" &&
        !Array.isArray(
            registration.custom_answers,
        )
            ? registration.custom_answers
            : {};
    const standard =
        registration as unknown as Record<
            string,
            unknown
        >;

    return key in
        custom
        ? custom[key]
        : standard[key];
}

function flattenAnswers(
    value: unknown,
) {
    if (
        Array.isArray(
            value,
        )
    ) {
        return value
            .map(
                (
                    item,
                ) =>
                    String(
                        item ||
                            "",
                    ).trim(),
            )
            .filter(
                Boolean,
            );
    }

    if (
        typeof value ===
        "boolean"
    ) {
        return [
            value
                ? "Yes"
                : "No",
        ];
    }

    const text =
        String(
            value ||
                "",
        ).trim();

    return text
        ? [
              text,
          ]
        : [];
}

function registrationFieldAnalytics({
    fields,
    registrations,
}: {
    fields:
        ReportField[];
    registrations:
        ReportRegistration[];
}) {
    const ignored =
        new Set([
            "full_name",
            "name",
            "email",
            "phone",
            "mobile",
        ]);

    return fields
        .filter(
            (
                field,
            ) =>
                field.field_key &&
                !ignored.has(
                    String(
                        field.field_key,
                    ),
                ),
        )
        .map(
            (
                field,
            ) => {
                const key =
                    String(
                        field.field_key,
                    );
                const type =
                    status(
                        field.field_type,
                        "text",
                    );
                const values =
                    registrations.flatMap(
                        (
                            registration,
                        ) =>
                            flattenAnswers(
                                answerValue({
                                    registration,
                                    key,
                                }),
                            ),
                    );
                const answered =
                    registrations.filter(
                        (
                            registration,
                        ) =>
                            flattenAnswers(
                                answerValue({
                                    registration,
                                    key,
                                }),
                            )
                                .length >
                            0,
                    ).length;
                const counts =
                    new Map<
                        string,
                        number
                    >();

                for (const value of
                    values) {
                    const label =
                        value.length >
                        80
                            ? `${value.slice(
                                  0,
                                  77,
                              )}…`
                            : value;

                    counts.set(
                        label,
                        (
                            counts.get(
                                label,
                            ) ||
                            0
                        ) +
                            1,
                    );
                }

                return {
                    id:
                        field.id,
                    label:
                        String(
                            field.field_label ||
                                key,
                        ),
                    type,
                    answered,
                    unanswered:
                        Math.max(
                            0,
                            registrations.length -
                                answered,
                        ),
                    completionRate:
                        percentage(
                            answered,
                            registrations.length,
                        ),
                    choices:
                        Array.from(
                            counts.entries(),
                        )
                            .sort(
                                (
                                    first,
                                    second,
                                ) =>
                                    second[1] -
                                    first[1],
                            )
                            .slice(
                                0,
                                10,
                            )
                            .map(
                                ([
                                    value,
                                    count,
                                ]) => ({
                                    value,
                                    count,
                                    percentage:
                                        percentage(
                                            count,
                                            Math.max(
                                                values.length,
                                                1,
                                            ),
                                        ),
                                }),
                            ),
                    isFreeText:
                        ![
                            "select",
                            "dropdown",
                            "radio",
                            "checkbox",
                            "multi_select",
                            "multiselect",
                            "yes_no",
                            "boolean",
                        ].includes(
                            type,
                        ),
                };
            },
        );
}

function seatingOverview(
    guests:
        EventReportGuest[],
    tables: {
        id: string;
        table_name:
            | string
            | null;
        capacity:
            | number
            | null;
    }[],
) {
    const assignedCounts =
        new Map<
            string,
            number
        >();

    for (const guest of
        guests) {
        if (
            !guest.assignedTable
        ) {
            continue;
        }

        assignedCounts.set(
            guest.assignedTable,
            (
                assignedCounts.get(
                    guest.assignedTable,
                ) ||
                0
            ) +
                guest.guestQuantity,
        );
    }

    return tables
        .map(
            (
                table,
            ) => {
                const name =
                    String(
                        table.table_name ||
                            "Unnamed Table",
                    );
                const capacity =
                    Math.max(
                        0,
                        Number(
                            table.capacity ||
                                0,
                        ),
                    );
                const assigned =
                    assignedCounts.get(
                        name,
                    ) ||
                    0;

                return {
                    tableName:
                        name,
                    capacity,
                    assigned,
                    available:
                        Math.max(
                            0,
                            capacity -
                                assigned,
                        ),
                    occupancyRate:
                        percentage(
                            assigned,
                            capacity,
                        ),
                };
            },
        )
        .sort(
            (
                first,
                second,
            ) =>
                second.assigned -
                first.assigned,
        );
}

export async function GET(
    _request: Request,
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
        const dataset =
            await loadEventReportDataset(
                eventId,
            );
        const {
            context,
            mode,
            registrations,
            invitations,
            guests,
            fields,
            tables,
        } = dataset;

        const checkedIn =
            guests.filter(
                (
                    guest,
                ) =>
                    guest.checkedIn,
            ).length;
        const notCheckedIn =
            Math.max(
                0,
                guests.length -
                    checkedIn,
            );
        const totalGuestQuantity =
            guests.reduce(
                (
                    total,
                    guest,
                ) =>
                    total +
                    guest.guestQuantity,
                0,
            );
        const assignedGuests =
            guests.filter(
                (
                    guest,
                ) =>
                    Boolean(
                        guest.assignedTable,
                    ),
            ).length;
        const attendance = {
            totalGuests:
                guests.length,
            guestQuantity:
                totalGuestQuantity,
            checkedIn,
            notCheckedIn,
            attendanceRate:
                percentage(
                    checkedIn,
                    guests.length,
                ),
        };
        const common = {
            success:
                true,
            mode,
            event:
                context.event,
            form:
                dataset.form,
            attendance,
            departmentBreakdown:
                topBreakdown(
                    guests.map(
                        (
                            guest,
                        ) =>
                            guest.department,
                    ),
                ),
            dietaryBreakdown:
                topBreakdown(
                    guests.map(
                        (
                            guest,
                        ) =>
                            guest.dietaryRequest,
                    ),
                ),
            seating: {
                totalTables:
                    tables.length,
                assignedGuests,
                unassignedGuests:
                    Math.max(
                        0,
                        guests.length -
                            assignedGuests,
                    ),
                tables:
                    seatingOverview(
                        guests,
                        tables,
                    ),
            },
            reportLinks: {
                fullReport:
                    `/dashboard/events/${eventId}/reports`,
                guestCsv:
                    `/api/events/${eventId}/analytics/export?report=guests&format=csv`,
                attendanceCsv:
                    `/api/events/${eventId}/analytics/export?report=attendance&format=csv`,
                formCsv:
                    `/api/events/${eventId}/analytics/export?report=form&format=csv`,
                invitationCsv:
                    `/api/events/${eventId}/analytics/export?report=invitations&format=csv`,
                seatingCsv:
                    `/api/events/${eventId}/analytics/export?report=seating&format=csv`,
                allCsv:
                    `/api/events/${eventId}/analytics/export?report=all&format=csv`,
                printReport:
                    `/api/events/${eventId}/analytics/export?report=all&format=html`,
            },
        };

        if (
            mode ===
            "invitation_only"
        ) {
            const sent =
                invitations.filter(
                    (
                        row,
                    ) =>
                        Boolean(
                            row.sent_at,
                        ),
                ).length;
            const opened =
                invitations.filter(
                    (
                        row,
                    ) =>
                        Boolean(
                            row.opened_at,
                        ) ||
                        [
                            "opened",
                            "accepted",
                            "declined",
                        ].includes(
                            status(
                                row.status,
                            ),
                        ),
                ).length;
            const accepted =
                invitations.filter(
                    (
                        row,
                    ) =>
                        status(
                            row.status,
                        ) ===
                        "accepted",
                ).length;
            const declined =
                invitations.filter(
                    (
                        row,
                    ) =>
                        status(
                            row.status,
                        ) ===
                        "declined",
                ).length;
            const pending =
                invitations.filter(
                    (
                        row,
                    ) =>
                        [
                            "pending",
                            "opened",
                        ].includes(
                            status(
                                row.status,
                            ),
                        ),
                ).length;
            const expired =
                invitations.filter(
                    (
                        row,
                    ) =>
                        [
                            "expired",
                            "cancelled",
                        ].includes(
                            status(
                                row.status,
                            ),
                        ),
                ).length;

            return reply({
                ...common,
                headline: {
                    totalGuests:
                        guests.length,
                    invitationsCreated:
                        invitations.length,
                    sent,
                    opened,
                    accepted,
                    declined,
                    pending,
                    expired,
                    openRate:
                        percentage(
                            opened,
                            sent,
                        ),
                    responseRate:
                        percentage(
                            accepted +
                                declined,
                            sent,
                        ),
                    acceptanceRate:
                        percentage(
                            accepted,
                            accepted +
                                declined,
                        ),
                    acceptedCheckedIn:
                        guests.filter(
                            (
                                guest,
                            ) =>
                                guest.checkedIn &&
                                guest.invitationStatus ===
                                    "accepted",
                        ).length,
                },
                timeline:
                    timeline(
                        invitations.map(
                            (
                                row,
                            ) => ({
                                date:
                                    row.sent_at ||
                                    row.created_at,
                            }),
                        ),
                    ),
                statusBreakdown: [
                    {
                        label:
                            "Not Sent",
                        value:
                            Math.max(
                                0,
                                guests.length -
                                    invitations.length,
                            ),
                    },
                    {
                        label:
                            "Pending",
                        value:
                            pending,
                    },
                    {
                        label:
                            "Accepted",
                        value:
                            accepted,
                    },
                    {
                        label:
                            "Declined",
                        value:
                            declined,
                    },
                    {
                        label:
                            "Expired / Cancelled",
                        value:
                            expired,
                    },
                ],
            });
        }

        const confirmed =
            guests.filter(
                (
                    guest,
                ) =>
                    [
                        "registered",
                        "confirmed",
                        "approved",
                        "checked_in",
                    ].includes(
                        guest.registrationStatus,
                    ),
            ).length;
        const pending =
            guests.filter(
                (
                    guest,
                ) =>
                    guest.registrationStatus ===
                    "pending",
            ).length;
        const cancelled =
            guests.filter(
                (
                    guest,
                ) =>
                    [
                        "cancelled",
                        "declined",
                    ].includes(
                        guest.registrationStatus,
                    ),
            ).length;

        return reply({
            ...common,
            headline: {
                totalRegistrations:
                    registrations.length,
                guestQuantity:
                    totalGuestQuantity,
                confirmed,
                pending,
                cancelled,
                checkedIn,
                checkInRate:
                    attendance.attendanceRate,
                capacity:
                    Number(
                        context.event
                            .max_guests ||
                            0,
                    ),
                capacityUsed:
                    percentage(
                        totalGuestQuantity,
                        Number(
                            context.event
                                .max_guests ||
                                0,
                        ),
                    ),
            },
            timeline:
                timeline(
                    guests.map(
                        (
                            guest,
                        ) => ({
                            date:
                                guest.registeredAt,
                            value:
                                guest.guestQuantity,
                        }),
                    ),
                ),
            // Registration events don't have a meaningful RSVP-style status
            // split (almost everything ends up "Confirmed"), so the
            // breakdown here tracks attendance instead — Checked In and Not
            // Checked In are mutually exclusive and sum to the whole, which
            // is what BreakdownCard's bars assume.
            statusBreakdown: [
                {
                    label:
                        "Checked In",
                    value:
                        checkedIn,
                },
                {
                    label:
                        "Not Checked In",
                    value:
                        notCheckedIn,
                },
            ],
            fields:
                registrationFieldAnalytics({
                    fields,
                    registrations,
                }),
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

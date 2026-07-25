import {
    NextResponse,
} from "next/server";
import {
    EventAnalyticsError,
    percentage,
} from "@/lib/event-analytics-server";
import {
    loadEventReportDataset,
    type EventReportDataset,
    type EventReportGuest,
} from "@/lib/event-report-data";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

type ReportType =
    | "guests"
    | "attendance"
    | "form"
    | "invitations"
    | "seating"
    | "all";

function cleanReport(
    value: string | null,
): ReportType {
    return [
        "guests",
        "attendance",
        "form",
        "invitations",
        "seating",
        "all",
    ].includes(
        String(
            value ||
                "",
        ),
    )
        ? value as ReportType
        : "all";
}

function csvCell(
    value: unknown,
) {
    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return "";
    }

    const text =
        Array.isArray(
            value,
        )
            ? value.join(
                  "; ",
              )
            : typeof value ===
                "object"
              ? JSON.stringify(
                    value,
                )
              : String(
                    value,
                );

    return `"${text.replace(
        /"/g,
        '""',
    )}"`;
}

function csvTable(
    headers: string[],
    rows: unknown[][],
) {
    return [
        headers.map(
            csvCell,
        ).join(","),
        ...rows.map(
            (
                row,
            ) =>
                row.map(
                    csvCell,
                ).join(
                    ",",
                ),
        ),
    ].join("\r\n");
}

function timestamp(
    value: string,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-SG",
        {
            dateStyle:
                "medium",
            timeStyle:
                "short",
            timeZone:
                "Asia/Singapore",
        },
    ).format(
        date,
    );
}

function customFieldColumns(
    dataset:
        EventReportDataset,
) {
    return dataset.fields
        .filter(
            (
                field,
            ) =>
                Boolean(
                    field.field_key,
                ),
        )
        .map(
            (
                field,
            ) => ({
                key:
                    String(
                        field.field_key,
                    ),
                label:
                    String(
                        field.field_label ||
                            field.field_key,
                    ),
            }),
        );
}

function customValue(
    guest:
        EventReportGuest,
    key: string,
) {
    const value =
        guest.customAnswers[
            key
        ];

    if (
        Array.isArray(
            value,
        )
    ) {
        return value.join(
            "; ",
        );
    }

    if (
        value &&
        typeof value ===
            "object"
    ) {
        return JSON.stringify(
            value,
        );
    }

    return value ??
        "";
}

function guestTable(
    dataset:
        EventReportDataset,
    includeCustom = true,
) {
    const customFields =
        includeCustom
            ? customFieldColumns(
                  dataset,
              )
            : [];

    return {
        headers: [
            "Full Name",
            "Email",
            "Phone",
            "Department",
            "Dietary Requirements",
            "Registration Status",
            "RSVP Status",
            "Guest Quantity",
            "Registered At",
            "Check-In Status",
            "Checked-In At",
            "Assigned Table",
            "Invitation Status",
            "Invitation Sent At",
            "Invitation Opened At",
            "Invitation Responded At",
            ...customFields.map(
                (
                    field,
                ) =>
                    field.label,
            ),
        ],
        rows:
            dataset.guests.map(
                (
                    guest,
                ) => [
                    guest.fullName,
                    guest.email,
                    guest.phone,
                    guest.department,
                    guest.dietaryRequest,
                    guest.registrationStatus,
                    guest.rsvpStatus,
                    guest.guestQuantity,
                    timestamp(
                        guest.registeredAt,
                    ),
                    guest.checkedIn
                        ? "Checked In"
                        : "Not Checked In",
                    timestamp(
                        guest.checkedInAt,
                    ),
                    guest.assignedTable,
                    guest.invitationStatus,
                    timestamp(
                        guest.invitationSentAt,
                    ),
                    timestamp(
                        guest.invitationOpenedAt,
                    ),
                    timestamp(
                        guest.invitationRespondedAt,
                    ),
                    ...customFields.map(
                        (
                            field,
                        ) =>
                            customValue(
                                guest,
                                field.key,
                            ),
                    ),
                ],
            ),
    };
}

function attendanceTable(
    dataset:
        EventReportDataset,
) {
    return {
        headers: [
            "Full Name",
            "Email",
            "Phone",
            "Department",
            "Check-In Status",
            "Checked-In At",
            "Assigned Table",
            "Guest Quantity",
        ],
        rows:
            dataset.guests.map(
                (
                    guest,
                ) => [
                    guest.fullName,
                    guest.email,
                    guest.phone,
                    guest.department,
                    guest.checkedIn
                        ? "Checked In"
                        : "Not Checked In",
                    timestamp(
                        guest.checkedInAt,
                    ),
                    guest.assignedTable,
                    guest.guestQuantity,
                ],
            ),
    };
}

function invitationTable(
    dataset:
        EventReportDataset,
) {
    return {
        headers: [
            "Full Name",
            "Email",
            "Phone",
            "Department",
            "Invitation Status",
            "Invitation Sent At",
            "Invitation Opened At",
            "Invitation Responded At",
            "RSVP Status",
            "Check-In Status",
            "Checked-In At",
            "Assigned Table",
        ],
        rows:
            dataset.guests.map(
                (
                    guest,
                ) => [
                    guest.fullName,
                    guest.email,
                    guest.phone,
                    guest.department,
                    guest.invitationStatus,
                    timestamp(
                        guest.invitationSentAt,
                    ),
                    timestamp(
                        guest.invitationOpenedAt,
                    ),
                    timestamp(
                        guest.invitationRespondedAt,
                    ),
                    guest.rsvpStatus,
                    guest.checkedIn
                        ? "Checked In"
                        : "Not Checked In",
                    timestamp(
                        guest.checkedInAt,
                    ),
                    guest.assignedTable,
                ],
            ),
    };
}

function seatingTable(
    dataset:
        EventReportDataset,
) {
    const assignedByTable =
        new Map<
            string,
            number
        >();

    for (const guest of
        dataset.guests) {
        if (
            !guest.assignedTable
        ) {
            continue;
        }

        assignedByTable.set(
            guest.assignedTable,
            (
                assignedByTable.get(
                    guest.assignedTable,
                ) ||
                0
            ) +
                guest.guestQuantity,
        );
    }

    return {
        headers: [
            "Table Name",
            "Capacity",
            "Assigned Seats",
            "Available Seats",
            "Occupancy Rate",
        ],
        rows:
            dataset.tables.map(
                (
                    table,
                ) => {
                    const tableName =
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
                        assignedByTable.get(
                            tableName,
                        ) ||
                        0;

                    return [
                        tableName,
                        capacity,
                        assigned,
                        Math.max(
                            0,
                            capacity -
                                assigned,
                        ),
                        `${percentage(
                            assigned,
                            capacity,
                        )}%`,
                    ];
                },
            ),
    };
}

function reportTable({
    dataset,
    report,
}: {
    dataset:
        EventReportDataset;
    report:
        Exclude<
            ReportType,
            "all"
        >;
}) {
    if (
        report ===
        "attendance"
    ) {
        return attendanceTable(
            dataset,
        );
    }

    if (
        report ===
        "form"
    ) {
        return guestTable(
            dataset,
            true,
        );
    }

    if (
        report ===
        "invitations"
    ) {
        return invitationTable(
            dataset,
        );
    }

    if (
        report ===
        "seating"
    ) {
        return seatingTable(
            dataset,
        );
    }

    return guestTable(
        dataset,
        true,
    );
}

function allCsv(
    dataset:
        EventReportDataset,
) {
    const sections: {
        title: string;
        headers: string[];
        rows: unknown[][];
    }[] = [
        {
            title:
                "EVENT OVERVIEW",
            headers: [
                "Metric",
                "Value",
            ],
            rows: [
                [
                    "Event",
                    dataset.context
                        .event
                        .event_name,
                ],
                [
                    "Analytics Mode",
                    dataset.mode ===
                    "invitation_only"
                        ? "Invitation & RSVP"
                        : "Public Registration",
                ],
                [
                    "Total Guest Records",
                    dataset.guests
                        .length,
                ],
                [
                    "Total Guest Quantity",
                    dataset.guests.reduce(
                        (
                            total,
                            guest,
                        ) =>
                            total +
                            guest.guestQuantity,
                        0,
                    ),
                ],
                [
                    "Checked In",
                    dataset.guests.filter(
                        (
                            guest,
                        ) =>
                            guest.checkedIn,
                    ).length,
                ],
                [
                    "Not Checked In",
                    dataset.guests.filter(
                        (
                            guest,
                        ) =>
                            !guest.checkedIn,
                    ).length,
                ],
            ],
        },
        {
            title:
                "FULL GUEST REPORT",
            ...guestTable(
                dataset,
                true,
            ),
        },
        {
            title:
                "ATTENDANCE REPORT",
            ...attendanceTable(
                dataset,
            ),
        },
        {
            title:
                "INVITATION REPORT",
            ...invitationTable(
                dataset,
            ),
        },
        {
            title:
                "SEATING REPORT",
            ...seatingTable(
                dataset,
            ),
        },
    ];

    return sections
        .map(
            (
                section,
            ) =>
                [
                    csvCell(
                        section.title,
                    ),
                    csvTable(
                        section.headers,
                        section.rows,
                    ),
                ].join(
                    "\r\n",
                ),
        )
        .join(
            "\r\n\r\n",
        );
}

function escapeHtml(
    value: unknown,
) {
    return String(
        value ??
            "",
    )
        .replace(
            /&/g,
            "&amp;",
        )
        .replace(
            /</g,
            "&lt;",
        )
        .replace(
            />/g,
            "&gt;",
        )
        .replace(
            /"/g,
            "&quot;",
        )
        .replace(
            /'/g,
            "&#039;",
        );
}

function htmlTable(
    title: string,
    headers: string[],
    rows: unknown[][],
) {
    return `
        <section>
            <h2>${escapeHtml(
                title,
            )}</h2>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>${headers
                            .map(
                                (
                                    header,
                                ) =>
                                    `<th>${escapeHtml(
                                        header,
                                    )}</th>`,
                            )
                            .join(
                                "",
                            )}</tr>
                    </thead>
                    <tbody>
                        ${rows
                            .map(
                                (
                                    row,
                                ) =>
                                    `<tr>${row
                                        .map(
                                            (
                                                value,
                                            ) =>
                                                `<td>${escapeHtml(
                                                    value,
                                                )}</td>`,
                                        )
                                        .join(
                                            "",
                                        )}</tr>`,
                            )
                            .join(
                                "",
                            )}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function printableHtml(
    dataset:
        EventReportDataset,
) {
    const guest =
        guestTable(
            dataset,
            true,
        );
    const attendance =
        attendanceTable(
            dataset,
        );
    const invitation =
        invitationTable(
            dataset,
        );
    const seating =
        seatingTable(
            dataset,
        );
    const checkedIn =
        dataset.guests.filter(
            (
                item,
            ) =>
                item.checkedIn,
        ).length;
    const attendanceRate =
        percentage(
            checkedIn,
            dataset.guests
                .length,
        );

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(
        dataset.context
            .event
            .event_name,
    )} — Event Reports</title>
    <style>
        *{box-sizing:border-box}
        body{margin:0;padding:32px;font-family:Arial,sans-serif;color:#0f172a;background:#fff}
        .header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:20px}
        h1{font-size:30px;margin:0}
        h2{font-size:20px;margin:34px 0 12px}
        p{color:#475569}
        .actions{margin-bottom:24px}
        button{border:0;border-radius:10px;background:#4f46e5;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer}
        .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:22px}
        .stat{border:1px solid #e2e8f0;border-radius:14px;padding:16px}
        .stat strong{display:block;font-size:24px;margin-top:6px}
        .table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:14px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top;white-space:nowrap}
        th{background:#f8fafc}
        @media print{
            body{padding:12px}
            .actions{display:none}
            section{break-inside:avoid}
            .table-wrap{overflow:visible}
            table{font-size:8px}
        }
    </style>
</head>
<body>
    <div class="actions">
        <button onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="header">
        <div>
            <h1>${escapeHtml(
                dataset.context
                    .event
                    .event_name,
            )}</h1>
            <p>Complete RegiGo event report</p>
        </div>
        <div>
            <strong>${escapeHtml(
                dataset.mode ===
                "invitation_only"
                    ? "Invitation & RSVP"
                    : "Public Registration",
            )}</strong>
        </div>
    </div>
    <div class="stats">
        <div class="stat">Guest Records<strong>${dataset.guests.length}</strong></div>
        <div class="stat">Checked In<strong>${checkedIn}</strong></div>
        <div class="stat">Not Checked In<strong>${Math.max(
            0,
            dataset.guests
                .length -
                checkedIn,
        )}</strong></div>
        <div class="stat">Attendance Rate<strong>${attendanceRate}%</strong></div>
    </div>
    ${htmlTable(
        "Full Guest Report",
        guest.headers,
        guest.rows,
    )}
    ${htmlTable(
        "Attendance Report",
        attendance.headers,
        attendance.rows,
    )}
    ${htmlTable(
        "Invitation Report",
        invitation.headers,
        invitation.rows,
    )}
    ${htmlTable(
        "Seating Report",
        seating.headers,
        seating.rows,
    )}
</body>
</html>`;
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
        const dataset =
            await loadEventReportDataset(
                eventId,
            );
        const url =
            new URL(
                request.url,
            );
        const report =
            cleanReport(
                url.searchParams.get(
                    "report",
                ),
            );
        const format =
            url.searchParams.get(
                "format",
            ) === "html"
                ? "html"
                : "csv";
        const slug =
            String(
                dataset.context
                    .event
                    .event_slug ||
                    dataset.context
                        .event
                        .event_name ||
                    "event",
            )
                .trim()
                .toLowerCase()
                .replace(
                    /[^a-z0-9]+/g,
                    "-",
                )
                .replace(
                    /^-+|-+$/g,
                    "",
                ) ||
            "event";

        if (
            format ===
            "html"
        ) {
            return new NextResponse(
                printableHtml(
                    dataset,
                ),
                {
                    status:
                        200,
                    headers: {
                        "Content-Type":
                            "text/html; charset=utf-8",
                        "Content-Disposition":
                            `inline; filename="${slug}-all-reports.html"`,
                        "Cache-Control":
                            "no-store",
                    },
                },
            );
        }

        const content =
            report ===
            "all"
                ? allCsv(
                      dataset,
                  )
                : (() => {
                      const table =
                          reportTable({
                              dataset,
                              report,
                          });

                      return csvTable(
                          table.headers,
                          table.rows,
                      );
                  })();

        return new NextResponse(
            `\uFEFF${content}`,
            {
                status:
                    200,
                headers: {
                    "Content-Type":
                        "text/csv; charset=utf-8",
                    "Content-Disposition":
                        `attachment; filename="${slug}-${report}-report.csv"`,
                    "Cache-Control":
                        "no-store",
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof
                    Error
                        ? error.message
                        : "Unable to export the event report.",
            },
            {
                status:
                    error instanceof
                    EventAnalyticsError
                        ? error.status
                        : 500,
            },
        );
    }
}

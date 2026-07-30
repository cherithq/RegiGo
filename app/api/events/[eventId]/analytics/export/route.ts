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
    | "ticketing"
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
        "ticketing",
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

function money(
    cents: number,
    currency: string,
) {
    return new Intl.NumberFormat(
        "en-SG",
        {
            style:
                "currency",
            currency:
                currency ||
                "SGD",
        },
    ).format(
        (cents ||
            0) /
            100,
    );
}

// These already have a dedicated column in every guest report, so a
// registration form field reusing one of these keys (e.g. a "Department"
// question) would otherwise show up twice with identical values.
const reservedFieldKeys =
    new Set([
        "full_name",
        "name",
        "email",
        "phone",
        "mobile",
        "department",
        "dietary_request",
        "dietary",
    ]);

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
                ) &&
                !reservedFieldKeys.has(
                    String(
                        field.field_key,
                    ).toLowerCase(),
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

function formFieldKeys(
    dataset:
        EventReportDataset,
) {
    return new Set(
        dataset.fields
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
                ) =>
                    String(
                        field.field_key,
                    ).toLowerCase(),
            ),
    );
}

// Invitation-only events have no public form — department/dietary are
// entered directly by the admin, so they're always relevant there. For
// registration-mode events, only show them when the event's own form
// actually asks for them; otherwise every guest has a blank value and the
// column is just clutter.
function includeDepartmentColumn(
    dataset:
        EventReportDataset,
) {
    return (
        dataset.mode ===
            "invitation_only" ||
        formFieldKeys(
            dataset,
        ).has(
            "department",
        )
    );
}

function includeDietaryColumn(
    dataset:
        EventReportDataset,
) {
    return (
        dataset.mode ===
            "invitation_only" ||
        [
            "dietary_request",
            "dietary",
        ].some(
            (
                key,
            ) =>
                formFieldKeys(
                    dataset,
                ).has(
                    key,
                ),
        )
    );
}

// Only relevant when the event actually has seating tables configured —
// otherwise every guest is "Unassigned" and the column adds nothing.
function includeTableColumn(
    dataset:
        EventReportDataset,
) {
    return (
        dataset.tables
            .length > 0
    );
}

// Registration-based events collect answers through a configurable
// registration form, so their guest report surfaces those form fields.
// Invitation/RSVP-based events have no public form — guests are curated
// by the admin — so their report surfaces the RSVP/invitation timeline
// instead. Showing the other mode's columns would just be empty clutter,
// which is what made these reports read as "wrong" when printed.
function guestTable(
    dataset:
        EventReportDataset,
    includeCustom = true,
) {
    const invitationMode =
        dataset.mode ===
        "invitation_only";
    const showDepartment =
        includeDepartmentColumn(
            dataset,
        );
    const showDietary =
        includeDietaryColumn(
            dataset,
        );
    const showTable =
        includeTableColumn(
            dataset,
        );
    const customFields =
        includeCustom &&
        !invitationMode
            ? customFieldColumns(
                  dataset,
              )
            : [];

    return {
        headers: [
            "Full Name",
            "Email",
            "Phone",
            ...(showDepartment
                ? [
                      "Department",
                  ]
                : []),
            ...(showDietary
                ? [
                      "Dietary Requirements",
                  ]
                : []),
            ...(invitationMode
                ? [
                      "RSVP Status",
                      "Invitation Status",
                      "Invitation Sent At",
                      "Invitation Opened At",
                      "Invitation Responded At",
                  ]
                : [
                      "Registration Status",
                  ]),
            // Party size only matters when guests RSVP for a group invite —
            // public registration is always one form submission per guest.
            ...(invitationMode
                ? [
                      "Guest Quantity",
                  ]
                : []),
            "Registered At",
            "Check-In Status",
            "Checked-In At",
            ...(showTable
                ? [
                      "Assigned Table",
                  ]
                : []),
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
                    ...(showDepartment
                        ? [
                              guest.department,
                          ]
                        : []),
                    ...(showDietary
                        ? [
                              guest.dietaryRequest,
                          ]
                        : []),
                    ...(invitationMode
                        ? [
                              guest.rsvpStatus,
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
                          ]
                        : [
                              guest.registrationStatus,
                          ]),
                    ...(invitationMode
                        ? [
                              guest.guestQuantity,
                          ]
                        : []),
                    timestamp(
                        guest.registeredAt,
                    ),
                    guest.checkedIn
                        ? "Checked In"
                        : "Not Checked In",
                    timestamp(
                        guest.checkedInAt,
                    ),
                    ...(showTable
                        ? [
                              guest.assignedTable,
                          ]
                        : []),
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
    const invitationMode =
        dataset.mode ===
        "invitation_only";
    const showDepartment =
        includeDepartmentColumn(
            dataset,
        );
    const showTable =
        includeTableColumn(
            dataset,
        );

    return {
        headers: [
            "Full Name",
            "Email",
            "Phone",
            ...(showDepartment
                ? [
                      "Department",
                  ]
                : []),
            "Check-In Status",
            "Checked-In At",
            ...(showTable
                ? [
                      "Assigned Table",
                  ]
                : []),
            // Party size only matters when guests RSVP for a group invite —
            // public registration is always one form submission per guest.
            ...(invitationMode
                ? [
                      "Guest Quantity",
                  ]
                : []),
        ],
        rows:
            dataset.guests.map(
                (
                    guest,
                ) => [
                    guest.fullName,
                    guest.email,
                    guest.phone,
                    ...(showDepartment
                        ? [
                              guest.department,
                          ]
                        : []),
                    guest.checkedIn
                        ? "Checked In"
                        : "Not Checked In",
                    timestamp(
                        guest.checkedInAt,
                    ),
                    ...(showTable
                        ? [
                              guest.assignedTable,
                          ]
                        : []),
                    ...(invitationMode
                        ? [
                              guest.guestQuantity,
                          ]
                        : []),
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

// Ticket sales aren't tied to guest-report mode (both public-registration
// and invitation/RSVP events can sell tickets — see
// event_ticket_settings' allow_registration_sales/allow_rsvp_sales), so
// this report is gated on whether the event has any ticket types
// configured at all, not on dataset.mode.
function ticketingSummaryTable(
    dataset:
        EventReportDataset,
) {
    return {
        headers: [
            "Ticket Name",
            "Price",
            "Tickets Sold",
            "Reserved",
            "Available",
            "Revenue",
            "Status",
        ],
        rows:
            dataset.ticketing.ticketTypes.map(
                (
                    ticket,
                ) => [
                    ticket.name,
                    ticket.isComplimentary
                        ? "Free"
                        : money(
                              ticket.priceCents,
                              ticket.currency,
                          ),
                    ticket.quantitySold,
                    ticket.quantityReserved,
                    ticket.quantityAvailable ===
                    null
                        ? "Unlimited"
                        : Math.max(
                              0,
                              ticket.quantityAvailable -
                                  ticket.quantityReserved -
                                  ticket.quantitySold,
                          ),
                    money(
                        ticket.revenueCents,
                        ticket.currency,
                    ),
                    ticket.isActive
                        ? "Active"
                        : "Inactive",
                ],
            ),
    };
}

function ticketingOrdersTable(
    dataset:
        EventReportDataset,
) {
    return {
        headers: [
            "Order Number",
            "Guest",
            "Email",
            "Tickets",
            "Amount",
            "Status",
            "Paid At",
            "Created At",
        ],
        rows:
            dataset.ticketing.orders.map(
                (
                    order,
                ) => [
                    order.orderNumber ||
                        order.id,
                    order.guestName,
                    order.guestEmail,
                    order.items
                        .map(
                            (
                                item,
                            ) =>
                                `${item.ticketName} x${item.quantity}`,
                        )
                        .join(
                            "; ",
                        ),
                    money(
                        order.totalCents,
                        order.currency,
                    ),
                    order.status,
                    timestamp(
                        order.paidAt,
                    ),
                    timestamp(
                        order.createdAt,
                    ),
                ],
            ),
    };
}

function ticketingCsv(
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
                "TICKET SALES SUMMARY",
            ...ticketingSummaryTable(
                dataset,
            ),
        },
        {
            title:
                "TICKET ORDERS",
            ...ticketingOrdersTable(
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

function reportTable({
    dataset,
    report,
}: {
    dataset:
        EventReportDataset;
    report:
        Exclude<
            ReportType,
            | "all"
            | "ticketing"
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
                // Party size only matters when guests RSVP for a group
                // invite — public registration is always one form
                // submission per guest.
                ...(dataset.mode ===
                "invitation_only"
                    ? [
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
                      ]
                    : []),
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
                ...(dataset.ticketing
                    .enabled
                    ? [
                          [
                              "Tickets Sold",
                              dataset.ticketing
                                  .totals
                                  .ticketsSold,
                          ],
                          [
                              "Ticket Revenue",
                              money(
                                  dataset.ticketing
                                      .totals
                                      .totalRevenueCents,
                                  dataset.ticketing
                                      .currency,
                              ),
                          ],
                      ]
                    : []),
            ],
        },
        // The full guest report already carries check-in, table, and
        // (for invitation-mode events) invitation/RSVP columns, so a
        // separate attendance/invitation section would just repeat the
        // same data under a different heading.
        {
            title:
                "FULL GUEST REPORT",
            ...guestTable(
                dataset,
                true,
            ),
        },
        // Only events with at least one ticket type configured have
        // anything to report here — free/non-ticketed events would just
        // show an empty section.
        ...(dataset.ticketing
            .enabled
            ? [
                  {
                      title:
                          "TICKET SALES SUMMARY",
                      ...ticketingSummaryTable(
                          dataset,
                      ),
                  },
                  {
                      title:
                          "TICKET ORDERS",
                      ...ticketingOrdersTable(
                          dataset,
                      ),
                  },
              ]
            : []),
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
    const seating =
        seatingTable(
            dataset,
        );
    const ticketingSummary =
        ticketingSummaryTable(
            dataset,
        );
    const ticketingOrders =
        ticketingOrdersTable(
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
    ${
        dataset.ticketing
            .enabled
            ? `<div class="stats">
        <div class="stat">Tickets Sold<strong>${dataset.ticketing.totals.ticketsSold}</strong></div>
        <div class="stat">Paid Orders<strong>${dataset.ticketing.totals.paidOrderCount}</strong></div>
        <div class="stat">Ticket Revenue<strong>${escapeHtml(
            money(
                dataset.ticketing
                    .totals
                    .totalRevenueCents,
                dataset.ticketing
                    .currency,
            ),
        )}</strong></div>
        <div class="stat">Avg Order Value<strong>${escapeHtml(
            money(
                dataset.ticketing
                    .totals
                    .averageOrderValueCents,
                dataset.ticketing
                    .currency,
            ),
        )}</strong></div>
    </div>`
            : ""
    }
    ${htmlTable(
        "Full Guest Report",
        guest.headers,
        guest.rows,
    )}
    ${
        dataset.ticketing
            .enabled
            ? `${htmlTable(
                  "Ticket Sales Summary",
                  ticketingSummary.headers,
                  ticketingSummary.rows,
              )}
    ${htmlTable(
        "Ticket Orders",
        ticketingOrders.headers,
        ticketingOrders.rows,
    )}`
            : ""
    }
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
        const attendance =
            String(
                url.searchParams.get(
                    "attendance",
                ) ||
                    "all",
            )
                .trim()
                .toLowerCase();

        if (
            attendance ===
            "checked_in"
        ) {
            dataset.guests =
                dataset.guests.filter(
                    (
                        guest,
                    ) =>
                        guest.checkedIn,
                );
        } else if (
            attendance ===
            "not_checked_in"
        ) {
            dataset.guests =
                dataset.guests.filter(
                    (
                        guest,
                    ) =>
                        !guest.checkedIn,
                );
        }

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
                : report ===
                  "ticketing"
                  ? ticketingCsv(
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

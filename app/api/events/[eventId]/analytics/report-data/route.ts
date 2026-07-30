import {
    NextResponse,
} from "next/server";
import {
    EventAnalyticsError,
    percentage,
} from "@/lib/event-analytics-server";
import {
    loadEventReportDataset,
} from "@/lib/event-report-data";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

function positiveInteger(
    value: string | null,
    fallback: number,
    maximum: number,
) {
    const parsed =
        Number(value);

    if (
        !Number.isInteger(
            parsed,
        ) ||
        parsed <
            1
    ) {
        return fallback;
    }

    return Math.min(
        maximum,
        parsed,
    );
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
        const page =
            positiveInteger(
                url.searchParams.get(
                    "page",
                ),
                1,
                10000,
            );
        const limit =
            positiveInteger(
                url.searchParams.get(
                    "limit",
                ),
                100,
                200,
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
        const search =
            String(
                url.searchParams.get(
                    "search",
                ) ||
                    "",
            )
                .trim()
                .toLowerCase()
                .slice(
                    0,
                    120,
                );

        let rows =
            dataset.guests;

        if (
            attendance ===
            "checked_in"
        ) {
            rows =
                rows.filter(
                    (
                        guest,
                    ) =>
                        guest.checkedIn,
                );
        } else if (
            attendance ===
            "not_checked_in"
        ) {
            rows =
                rows.filter(
                    (
                        guest,
                    ) =>
                        !guest.checkedIn,
                );
        }

        if (search) {
            rows =
                rows.filter(
                    (
                        guest,
                    ) =>
                        [
                            guest.fullName,
                            guest.email,
                            guest.phone,
                            guest.department,
                            guest.assignedTable,
                            guest.registrationStatus,
                            guest.invitationStatus,
                        ].some(
                            (
                                value,
                            ) =>
                                String(
                                    value ||
                                        "",
                                )
                                    .toLowerCase()
                                    .includes(
                                        search,
                                    ),
                        ),
                );
        }

        rows =
            [...rows].sort(
                (
                    first,
                    second,
                ) =>
                    new Date(
                        second.registeredAt ||
                            0,
                    ).getTime() -
                    new Date(
                        first.registeredAt ||
                            0,
                    ).getTime(),
            );

        const total =
            rows.length;
        const start =
            (
                page -
                1
            ) *
            limit;
        const paged =
            rows.slice(
                start,
                start +
                    limit,
            );
        const checkedIn =
            dataset.guests.filter(
                (
                    guest,
                ) =>
                    guest.checkedIn,
            ).length;

        return NextResponse.json(
            {
                success:
                    true,
                event:
                    dataset.context
                        .event,
                mode:
                    dataset.mode,
                ticketing:
                    dataset.ticketing,
                rows:
                    paged,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages:
                        Math.max(
                            1,
                            Math.ceil(
                                total /
                                    limit,
                            ),
                        ),
                },
                counts: {
                    total:
                        dataset.guests
                            .length,
                    checkedIn,
                    notCheckedIn:
                        Math.max(
                            0,
                            dataset.guests
                                .length -
                                checkedIn,
                        ),
                    attendanceRate:
                        percentage(
                            checkedIn,
                            dataset.guests
                                .length,
                        ),
                },
                customFields:
                    dataset.fields.map(
                        (
                            field,
                        ) => ({
                            key:
                                field.field_key,
                            label:
                                field.field_label,
                        }),
                    ),
            },
            {
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
                    error instanceof
                    Error
                        ? error.message
                        : "Unable to load the guest report.",
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

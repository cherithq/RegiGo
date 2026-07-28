import {
    NextResponse,
} from "next/server";
import {
    InvitationError,
    requireInvitationManager,
} from "@/lib/guest-invitations";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

function clean(
    value: unknown,
    maximum = 500,
) {
    return typeof value ===
        "string"
        ? value
              .trim()
              .slice(
                  0,
                  maximum,
              )
        : "";
}

function quantity(
    value: unknown,
) {
    const parsed =
        Number(value);

    return Number.isInteger(
        parsed,
    )
        ? Math.min(
              100,
              Math.max(
                  1,
                  parsed,
              ),
          )
        : 1;
}

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
        const {
            userId,
            admin,
        } =
            await requireInvitationManager(
                eventId,
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
            throw new InvitationError(
                "Guests must be an array.",
            );
        }

        if (
            body.guests.length <
                1 ||
            body.guests.length >
                500
        ) {
            throw new InvitationError(
                "Each CSV batch must contain between 1 and 500 guests.",
            );
        }

        const rows =
            body.guests.map(
                (
                    value,
                    index,
                ) => {
                    const record =
                        value &&
                        typeof value ===
                            "object"
                            ? value as Record<
                                  string,
                                  unknown
                              >
                            : {};
                    const fullName =
                        clean(
                            record.full_name ??
                                record.fullname ??
                                record.name,
                            180,
                        );
                    const email =
                        clean(
                            record.email,
                            320,
                        ).toLowerCase();

                    if (
                        fullName.length <
                        2
                    ) {
                        throw new InvitationError(
                            `Row ${index + 1} is missing full_name.`,
                        );
                    }

                    if (
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                            email,
                        )
                    ) {
                        throw new InvitationError(
                            `Row ${index + 1} has an invalid email address.`,
                        );
                    }

                    const standard =
                        new Set([
                            "full_name",
                            "fullname",
                            "name",
                            "email",
                            "phone",
                            "mobile",
                            "department",
                            "dietary_request",
                            "dietary",
                            "quantity",
                            "selected_ticket_quantity",
                        ]);
                    const customAnswers =
                        Object.fromEntries(
                            Object.entries(
                                record,
                            )
                                .filter(
                                    ([
                                        key,
                                        item,
                                    ]) =>
                                        !standard.has(
                                            key,
                                        ) &&
                                        clean(
                                            item,
                                            2000,
                                        ),
                                )
                                .map(
                                    ([
                                        key,
                                        item,
                                    ]) => [
                                        key,
                                        clean(
                                            item,
                                            2000,
                                        ),
                                    ],
                                ),
                        );

                    return {
                        full_name:
                            fullName,
                        email,
                        phone:
                            clean(
                                record.phone ??
                                    record.mobile,
                                80,
                            ) ||
                            null,
                        department:
                            clean(
                                record.department,
                                160,
                            ) ||
                            null,
                        dietary_request:
                            clean(
                                record.dietary_request ??
                                    record.dietary,
                                500,
                            ) ||
                            null,
                        selected_ticket_quantity:
                            quantity(
                                record.quantity ??
                                    record.selected_ticket_quantity,
                            ),
                        registration_status:
                            "pending",
                        rsvp_status:
                            "not_invited",
                        custom_answers:
                            customAnswers,
                        created_by:
                            userId,
                    };
                },
            );

        const emailAddresses =
            Array.from(
                new Set(
                    rows.map(
                        (
                            row,
                        ) =>
                            row.email,
                    ),
                ),
            );
        const {
            data: existing,
            error:
                existingError,
        } = await admin
            .from(
                "registrations",
            )
            .select(
                "id, email",
            )
            .eq(
                "event_id",
                eventId,
            )
            .in(
                "email",
                emailAddresses,
            );

        if (existingError) {
            throw new InvitationError(
                existingError
                    .message,
            );
        }

        const existingByEmail =
            new Map(
                (
                    existing ||
                    []
                ).map(
                    (
                        row,
                    ) => [
                        String(
                            row.email ||
                                "",
                        ).toLowerCase(),
                        String(
                            row.id,
                        ),
                    ],
                ),
            );
        const registrationIds:
            string[] = [];
        let inserted =
            0;
        let updated =
            0;

        for (const row of
            rows) {
            const existingId =
                existingByEmail.get(
                    row.email,
                );

            if (existingId) {
                const {
                    error,
                } = await admin
                    .from(
                        "registrations",
                    )
                    .update({
                        full_name:
                            row.full_name,
                        phone:
                            row.phone,
                        department:
                            row.department,
                        dietary_request:
                            row.dietary_request,
                        selected_ticket_quantity:
                            row.selected_ticket_quantity,
                        custom_answers:
                            row.custom_answers,
                    })
                    .eq(
                        "id",
                        existingId,
                    )
                    .eq(
                        "event_id",
                        eventId,
                    );

                if (error) {
                    throw new InvitationError(
                        error.message,
                    );
                }

                registrationIds.push(
                    existingId,
                );
                updated +=
                    1;
                continue;
            }

            const {
                data,
                error,
            } = await admin
                .from(
                    "registrations",
                )
                .insert({
                    event_id:
                        eventId,
                    ...row,
                })
                .select(
                    "id",
                )
                .single();

            if (
                error ||
                !data
            ) {
                throw new InvitationError(
                    error?.message ||
                        "Unable to add an invitation guest.",
                );
            }

            const id =
                String(
                    data.id,
                );

            registrationIds.push(
                id,
            );
            existingByEmail.set(
                row.email,
                id,
            );
            inserted +=
                1;
        }

        return reply(
            {
                success:
                    true,
                inserted,
                updated,
                registrationIds,
            },
            201,
        );
    } catch (error) {
        return reply(
            {
                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to import invitation guests.",
            },
            error instanceof
            InvitationError
                ? error.status
                : 500,
        );
    }
}

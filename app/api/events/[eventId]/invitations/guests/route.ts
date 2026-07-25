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
    maximum: number,
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

function partySize(
    value: unknown,
) {
    const parsed =
        Number(value);

    return Number.isFinite(
        parsed,
    )
        ? Math.min(
              100,
              Math.max(
                  1,
                  Math.round(
                      parsed,
                  ),
              ),
          )
        : 1;
}

function validEmail(
    value: string,
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value,
    );
}

function response(
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

function handleError(
    error: unknown,
) {
    return response(
        {
            error:
                error instanceof
                    Error
                    ? error.message
                    : "Unable to manage the invitation guest.",
        },
        error instanceof
        InvitationError
            ? error.status
            : 500,
    );
}

async function assertUniqueEmail({
    admin,
    eventId,
    email,
    excludeRegistrationId,
}: {
    admin: any;
    eventId: string;
    email: string;
    excludeRegistrationId?: string;
}) {
    let query =
        admin
            .from(
                "registrations",
            )
            .select(
                "id",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "email",
                email,
            );

    if (
        excludeRegistrationId
    ) {
        query =
            query.neq(
                "id",
                excludeRegistrationId,
            );
    }

    const {
        data,
        error,
    } =
        await query
            .limit(1)
            .maybeSingle();

    if (error) {
        throw new InvitationError(
            error.message,
        );
    }

    if (data?.id) {
        throw new InvitationError(
            "Another guest in this event already uses this email address.",
            409,
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
        const {
            userId,
            admin,
        } =
            await requireInvitationManager(
                eventId,
            );
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const fullName =
            clean(
                body.fullName,
                180,
            );
        const email =
            clean(
                body.email,
                320,
            ).toLowerCase();

        if (
            fullName.length <
            2
        ) {
            throw new InvitationError(
                "Enter the guest's full name.",
            );
        }

        if (
            !validEmail(
                email,
            )
        ) {
            throw new InvitationError(
                "Enter a valid guest email address.",
            );
        }

        const {
            data: existing,
            error:
                existingError,
        } = await admin
            .from(
                "registrations",
            )
            .select(
                "id",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "email",
                email,
            )
            .maybeSingle();

        if (existingError) {
            throw new InvitationError(
                existingError
                    .message,
            );
        }

        const values = {
            full_name:
                fullName,
            email,
            phone:
                clean(
                    body.phone,
                    80,
                ) ||
                null,
            department:
                clean(
                    body.department,
                    160,
                ) ||
                null,
            selected_ticket_quantity:
                partySize(
                    body.quantity,
                ),
        };

        if (existing?.id) {
            const {
                error,
            } = await admin
                .from(
                    "registrations",
                )
                .update(
                    values,
                )
                .eq(
                    "id",
                    existing.id,
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

            return response({
                success:
                    true,
                registrationId:
                    existing.id,
                updated:
                    true,
                message:
                    "Existing guest updated and selected.",
            });
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
                ...values,
                registration_status:
                    "pending",
                rsvp_status:
                    "not_invited",
                created_by:
                    userId,
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
                    "Unable to add the guest.",
            );
        }

        return response(
            {
                success:
                    true,
                registrationId:
                    data.id,
                updated:
                    false,
                message:
                    "Guest added and selected.",
            },
            201,
        );
    } catch (error) {
        return handleError(
            error,
        );
    }
}

export async function PATCH(
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
            admin,
        } =
            await requireInvitationManager(
                eventId,
            );
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const registrationId =
            clean(
                body.registrationId,
                80,
            );
        const fullName =
            clean(
                body.fullName,
                180,
            );
        const email =
            clean(
                body.email,
                320,
            ).toLowerCase();

        if (!registrationId) {
            throw new InvitationError(
                "The guest record is missing.",
            );
        }

        if (
            fullName.length <
            2
        ) {
            throw new InvitationError(
                "Enter the guest's full name.",
            );
        }

        if (
            !validEmail(
                email,
            )
        ) {
            throw new InvitationError(
                "Enter a valid guest email address.",
            );
        }

        const {
            data: current,
            error:
                currentError,
        } = await admin
            .from(
                "registrations",
            )
            .select(
                "id",
            )
            .eq(
                "id",
                registrationId,
            )
            .eq(
                "event_id",
                eventId,
            )
            .maybeSingle();

        if (currentError) {
            throw new InvitationError(
                currentError
                    .message,
            );
        }

        if (!current) {
            throw new InvitationError(
                "The guest could not be found in this event.",
                404,
            );
        }

        await assertUniqueEmail({
            admin,
            eventId,
            email,
            excludeRegistrationId:
                registrationId,
        });

        const {
            error,
        } = await admin
            .from(
                "registrations",
            )
            .update({
                full_name:
                    fullName,
                email,
                phone:
                    clean(
                        body.phone,
                        80,
                    ) ||
                    null,
                department:
                    clean(
                        body.department,
                        160,
                    ) ||
                    null,
                selected_ticket_quantity:
                    partySize(
                        body.quantity,
                    ),
            })
            .eq(
                "id",
                registrationId,
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

        return response({
            success:
                true,
            registrationId,
            message:
                "Guest details updated.",
        });
    } catch (error) {
        return handleError(
            error,
        );
    }
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
        const {
            eventId,
        } = await params;
        const {
            admin,
        } =
            await requireInvitationManager(
                eventId,
            );
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const registrationId =
            clean(
                body.registrationId,
                80,
            );

        if (!registrationId) {
            throw new InvitationError(
                "The guest record is missing.",
            );
        }

        const {
            data: current,
            error:
                currentError,
        } = await admin
            .from(
                "registrations",
            )
            .select(
                "id, full_name, email",
            )
            .eq(
                "id",
                registrationId,
            )
            .eq(
                "event_id",
                eventId,
            )
            .maybeSingle();

        if (currentError) {
            throw new InvitationError(
                currentError
                    .message,
            );
        }

        if (!current) {
            throw new InvitationError(
                "The guest could not be found in this event.",
                404,
            );
        }

        const {
            error:
                rpcError,
        } =
            await admin.rpc(
                "regigo_delete_invitation_guest_v1",
                {
                    p_event_id:
                        eventId,
                    p_registration_id:
                        registrationId,
                },
            );

        if (!rpcError) {
            return response({
                success:
                    true,
                registrationId,
                message:
                    "Guest and invitation deleted from the event.",
            });
        }

        const missingRpc =
            [
                "42883",
                "PGRST202",
                "PGRST204",
            ].includes(
                String(
                    rpcError.code ||
                        "",
                ),
            ) ||
            String(
                rpcError.message ||
                    "",
            )
                .toLowerCase()
                .includes(
                    "could not find the function",
                );

        if (!missingRpc) {
            throw new InvitationError(
                rpcError.message,
                409,
            );
        }

        // Compatibility fallback for projects that have not run the
        // deletion migration yet. The invitation row is removed first,
        // then the event registration.
        const {
            error:
                invitationError,
        } = await admin
            .from(
                "event_invitations",
            )
            .delete()
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "registration_id",
                registrationId,
            );

        if (
            invitationError &&
            ![
                "42P01",
                "PGRST205",
            ].includes(
                String(
                    invitationError.code ||
                        "",
                ),
            )
        ) {
            throw new InvitationError(
                invitationError
                    .message,
            );
        }

        const {
            error:
                deleteError,
        } = await admin
            .from(
                "registrations",
            )
            .delete()
            .eq(
                "id",
                registrationId,
            )
            .eq(
                "event_id",
                eventId,
            );

        if (deleteError) {
            throw new InvitationError(
                `${deleteError.message}. Run the invitation guest deletion migration included with this patch.`,
                409,
            );
        }

        return response({
            success:
                true,
            registrationId,
            message:
                "Guest and invitation deleted from the event.",
        });
    } catch (error) {
        return handleError(
            error,
        );
    }
}

import {
    NextResponse,
} from "next/server";
import {
    EventDeletionAccessError,
    getEventDeletionAccess,
} from "@/lib/event-deletion-access";
import {
    deleteEventDependents,
} from "@/lib/event-deletion-cascade";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

type RouteContext = {
    params: Promise<{
        eventId: string;
    }>;
};

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
            success:
                false,
            error:
                error instanceof
                    Error
                    ? error.message
                    : "Unable to manage event deletion.",
        },
        error instanceof
            EventDeletionAccessError
            ? error.status
            : 500,
    );
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const {
            eventId,
        } =
            await context.params;
        const {
            access,
        } =
            await getEventDeletionAccess(
                eventId,
            );

        return reply({
            success:
                true,
            allowed:
                access.allowed,
            reason:
                access.reason,
            eventName:
                access.event
                    .event_name,
            isPlatformAdmin:
                access.isPlatformAdmin,
            isCompanyAdmin:
                access.isCompanyAdmin,
            hasUnlimitedPlan:
                access.hasUnlimitedPlan,
            planName:
                access.plan
                    ?.plan_name ||
                null,
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    try {
        const {
            eventId,
        } =
            await context.params;
        const {
            access,
            admin,
            user,
        } =
            await getEventDeletionAccess(
                eventId,
            );

        if (
            !access.allowed
        ) {
            return reply(
                {
                    success:
                        false,
                    error:
                        access.reason,
                },
                403,
            );
        }

        const eventName =
            access.event
                .event_name ||
            "Event";

        await deleteEventDependents(
            admin,
            eventId,
        );

        const deletion =
            await admin
                .from(
                    "events",
                )
                .delete()
                .eq(
                    "id",
                    eventId,
                )
                .select(
                    "id",
                )
                .maybeSingle();

        if (
            deletion.error
        ) {
            const message =
                deletion.error
                    .message;
            const isForeignKey =
                String(
                    deletion.error
                        .code ||
                        "",
                ) ===
                "23503";

            throw new EventDeletionAccessError(
                isForeignKey
                    ? `${message} A related table is blocking deletion. Configure that foreign key with ON DELETE CASCADE or delete the dependent records first.`
                    : message,
                isForeignKey
                    ? 409
                    : 500,
            );
        }

        if (
            !deletion.data
        ) {
            throw new EventDeletionAccessError(
                "The event was not deleted because it no longer exists.",
                404,
            );
        }

        const verification =
            await admin
                .from(
                    "events",
                )
                .select(
                    "id",
                )
                .eq(
                    "id",
                    eventId,
                )
                .maybeSingle();

        if (
            verification.error
        ) {
            throw new EventDeletionAccessError(
                verification.error
                    .message,
                500,
            );
        }

        if (
            verification.data
        ) {
            throw new EventDeletionAccessError(
                "The server could not confirm that the event was deleted.",
                500,
            );
        }

        console.info(
            "RegiGo event deleted",
            {
                eventId,
                eventName,
                companyId:
                    access.companyId,
                deletedBy:
                    user.id,
                deletionAccess:
                    access.isPlatformAdmin
                        ? "platform_admin"
                        : "unlimited_company_admin",
            },
        );

        return reply({
            success:
                true,
            message:
                `${eventName} was permanently deleted.`,
            deletedEventId:
                eventId,
            deletedBy:
                access.isPlatformAdmin
                    ? "platform_admin"
                    : "unlimited_company_admin",
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

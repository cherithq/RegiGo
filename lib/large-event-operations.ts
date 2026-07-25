import "server-only";

import {
    CompanyModuleError,
    getCompanyUserActor,
    loadEffectiveModules,
} from "@/lib/company-module-server";

export type LargeEventAccess = Awaited<
    ReturnType<
        typeof requireLargeEventAccess
    >
>;

export async function requireLargeEventAccess({
    eventId,
    write = false,
}: {
    eventId: string;
    write?: boolean;
}) {
    const actor =
        await getCompanyUserActor();

    const {
        data: event,
        error,
    } = await actor.admin
        .from("events")
        .select(
            "id, company_id, event_name, max_guests",
        )
        .eq("id", eventId)
        .maybeSingle();

    if (
        error ||
        !event
    ) {
        throw new CompanyModuleError(
            error?.message ||
                "The event could not be found.",
            error ? 400 : 404,
        );
    }

    const companyId =
        String(
            event.company_id ||
                "",
        );

    if (
        !actor.isPlatformAdmin &&
        String(
            actor.profile
                .company_id ||
                "",
        ) !== companyId
    ) {
        throw new CompanyModuleError(
            "This event belongs to another company.",
            403,
        );
    }

    if (
        !actor.isPlatformAdmin &&
        actor.role !== "admin"
    ) {
        const {
            data: assignment,
            error:
                assignmentError,
        } = await actor.admin
            .from(
                "event_members",
            )
            .select(
                "role",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "profile_id",
                actor.user.id,
            )
            .maybeSingle();

        if (
            assignmentError ||
            !assignment
        ) {
            throw new CompanyModuleError(
                assignmentError
                    ?.message ||
                    "This event is not assigned to your account.",
                assignmentError
                    ? 400
                    : 403,
            );
        }
    }

    const modules =
        await loadEffectiveModules(
            {
                admin:
                    actor.admin,
                companyId,
                role:
                    actor.role,
                eventId,
                platformAdmin:
                    actor.isPlatformAdmin,
            },
        );

    if (
        modules.guests ===
        false
    ) {
        throw new CompanyModuleError(
            "Your role does not have access to the Guest List.",
            403,
        );
    }

    if (
        write &&
        !actor.isPlatformAdmin &&
        actor.role !==
            "admin" &&
        actor.role !==
            "organizer"
    ) {
        throw new CompanyModuleError(
            "Your role can view guests but cannot add or import them.",
            403,
        );
    }

    return {
        actor,
        event: {
            id:
                String(
                    event.id,
                ),
            companyId,
            eventName:
                String(
                    event.event_name ||
                        "Event",
                ),
            maxGuests:
                event.max_guests == null
                    ? 20000
                    : Math.min(
                          Math.max(
                              Number(
                                  event.max_guests,
                              ),
                              1,
                          ),
                          20000,
                      ),
        },
    };
}

export function positiveInteger(
    value: unknown,
    fallback: number,
    maximum: number,
) {
    const parsed =
        Number(value);

    if (
        !Number.isInteger(
            parsed,
        ) ||
        parsed < 1
    ) {
        return fallback;
    }

    return Math.min(
        parsed,
        maximum,
    );
}

export function cleanGuestText(
    value: unknown,
    maximum = 320,
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

export function cleanGuestStatus(
    value: unknown,
) {
    const status =
        cleanGuestText(
            value,
            40,
        ).toLowerCase();

    if (
        [
            "registered",
            "confirmed",
            "pending",
            "cancelled",
            "declined",
        ].includes(status)
    ) {
        return status;
    }

    return "registered";
}

export function encodeCursor({
    createdAt,
    id,
}: {
    createdAt: string;
    id: string;
}) {
    return Buffer.from(
        JSON.stringify({
            createdAt,
            id,
        }),
        "utf8",
    ).toString(
        "base64url",
    );
}

export function decodeCursor(
    value:
        | string
        | null,
) {
    if (!value) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                Buffer.from(
                    value,
                    "base64url",
                ).toString(
                    "utf8",
                ),
            ) as {
                createdAt?: unknown;
                id?: unknown;
            };

        if (
            typeof parsed.createdAt ===
                "string" &&
            typeof parsed.id ===
                "string"
        ) {
            return {
                createdAt:
                    parsed.createdAt,
                id: parsed.id,
            };
        }
    } catch {
        return null;
    }

    return null;
}

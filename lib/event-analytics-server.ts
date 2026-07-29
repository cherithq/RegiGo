import "server-only";

import {
    createClient,
    type SupabaseClient,
} from "@supabase/supabase-js";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";

export type EventAnalyticsMode =
    | "public_registration"
    | "invitation_only";

export class EventAnalyticsError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "EventAnalyticsError";
        this.status = status;
    }
}

const platformAdminRoles =
    new Set([
        "super_admin",
        "super-admin",
        "platform_admin",
        "platform-admin",
    ]);

const companyAdminRoles =
    new Set([
        "admin",
        "administrator",
        "company_admin",
        "company-admin",
        "owner",
    ]);

const organizerRoles =
    new Set([
        "organizer",
        "organiser",
        "manager",
        "event_manager",
        "event-manager",
    ]);

function role(
    value: unknown,
) {
    return String(
        value || "",
    )
        .trim()
        .toLowerCase();
}

function serviceClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new EventAnalyticsError(
            "Supabase service-role configuration is missing.",
            500,
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

async function optionalMembership({
    admin,
    userId,
    companyId,
}: {
    admin: SupabaseClient;
    userId: string;
    companyId: string;
}) {
    const {
        data,
        error,
    } = await admin
        .from(
            "company_members",
        )
        .select(
            "company_id, company_role, status",
        )
        .eq(
            "user_id",
            userId,
        )
        .eq(
            "company_id",
            companyId,
        )
        .maybeSingle();

    if (
        error &&
        ![
            "42P01",
            "42703",
            "PGRST200",
            "PGRST204",
            "PGRST205",
        ].includes(
            String(
                error.code ||
                    "",
            ),
        )
    ) {
        throw new EventAnalyticsError(
            error.message,
        );
    }

    return data || null;
}

export async function requireEventAnalyticsAccess(
    eventId: string,
) {
    const server =
        await createSupabaseServerClient();
    const {
        data: {
            user,
        },
        error:
            authError,
    } =
        await server.auth
            .getUser();

    if (
        authError ||
        !user
    ) {
        throw new EventAnalyticsError(
            "You must be logged in.",
            401,
        );
    }

    const admin =
        serviceClient();

    const [
        profileResult,
        eventResult,
    ] =
        await Promise.all([
            admin
                .from(
                    "profiles",
                )
                .select(
                    "id, role, platform_role, company_id",
                )
                .eq(
                    "id",
                    user.id,
                )
                .maybeSingle(),

            admin
                .from(
                    "events",
                )
                .select(
                    "id, company_id, event_name, event_slug, event_date, event_time, venue, status, max_guests",
                )
                .eq(
                    "id",
                    eventId,
                )
                .maybeSingle(),
        ]);

    if (
        profileResult.error
    ) {
        throw new EventAnalyticsError(
            profileResult.error
                .message,
        );
    }

    if (
        eventResult.error ||
        !eventResult.data
    ) {
        throw new EventAnalyticsError(
            eventResult.error
                ?.message ||
                "Event not found.",
            eventResult.error
                ? 400
                : 404,
        );
    }

    const profile =
        profileResult.data;
    const event =
        eventResult.data;
    const companyId =
        String(
            event.company_id ||
                "",
        );
    const membership =
        companyId
            ? await optionalMembership(
                  {
                      admin,
                      userId:
                          user.id,
                      companyId,
                  },
              )
            : null;
    const platformRole =
        role(
            profile
                ?.platform_role,
        );
    const profileRole =
        role(
            profile?.role,
        );
    const membershipRole =
        role(
            membership
                ?.company_role,
        );
    const isPlatformAdmin =
        platformAdminRoles.has(
            platformRole,
        );
    const sameCompany =
        String(
            profile
                ?.company_id ||
                membership
                    ?.company_id ||
                "",
        ) === companyId;
    const isCompanyAdmin =
        sameCompany &&
        (
            companyAdminRoles.has(
                profileRole,
            ) ||
            companyAdminRoles.has(
                membershipRole,
            )
        );
    const isOrganizer =
        sameCompany &&
        (
            organizerRoles.has(
                profileRole,
            ) ||
            organizerRoles.has(
                membershipRole,
            )
        );

    let assigned =
        false;

    if (isOrganizer) {
        const {
            data,
            error,
        } = await admin
            .from(
                "event_members",
            )
            .select(
                "event_id",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "profile_id",
                user.id,
            )
            .maybeSingle();

        if (
            error &&
            ![
                "42P01",
                "42703",
                "PGRST200",
                "PGRST204",
                "PGRST205",
            ].includes(
                String(
                    error.code ||
                        "",
                ),
            )
        ) {
            throw new EventAnalyticsError(
                error.message,
            );
        }

        assigned =
            Boolean(data);
    }

    if (
        !isPlatformAdmin &&
        !isCompanyAdmin &&
        !(
            isOrganizer &&
            assigned
        )
    ) {
        throw new EventAnalyticsError(
            "Your account cannot view analytics for this event.",
            403,
        );
    }

    return {
        user,
        admin,
        event,
        profile,
        isPlatformAdmin,
        isCompanyAdmin,
        isOrganizer,
    };
}

export async function loadAllRows<T>({
    admin,
    table,
    columns,
    eventId,
    orderColumn = "created_at",
    batchSize = 1000,
}: {
    admin: SupabaseClient;
    table: string;
    columns: string;
    eventId: string;
    orderColumn?: string;
    batchSize?: number;
}) {
    const maxRows = 50000;
    const countResult =
        await admin
            .from(table)
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq(
                "event_id",
                eventId,
            );

    if (countResult.error) {
        throw new EventAnalyticsError(
            countResult.error
                .message,
        );
    }

    const total =
        Math.min(
            countResult.count ||
                0,
            maxRows,
        );

    if (total === 0) {
        return [] as T[];
    }

    const pageStarts: number[] =
        [];

    for (
        let start = 0;
        start < total;
        start += batchSize
    ) {
        pageStarts.push(
            start,
        );
    }

    // Pages are independent range reads, so fetch them concurrently —
    // sequential pagination on large events (thousands of rows => many
    // 1000-row pages) added multiple seconds to every report/export load.
    const results =
        await Promise.all(
            pageStarts.map(
                (start) =>
                    admin
                        .from(table)
                        .select(columns)
                        .eq(
                            "event_id",
                            eventId,
                        )
                        .order(
                            orderColumn,
                            {
                                ascending:
                                    true,
                            },
                        )
                        // orderColumn alone isn't unique (bulk-inserted rows
                        // can share the exact same timestamp), which makes
                        // range() pagination non-deterministic across pages —
                        // rows get duplicated or dropped at page boundaries.
                        // "id" as a tiebreaker keeps the order stable
                        // regardless of ties.
                        .order(
                            "id",
                            {
                                ascending:
                                    true,
                            },
                        )
                        .range(
                            start,
                            start +
                                batchSize -
                                1,
                        ),
            ),
        );

    const rows: T[] = [];

    for (const {
        data,
        error,
    } of results) {
        if (error) {
            throw new EventAnalyticsError(
                error.message,
            );
        }

        rows.push(
            ...((
                data ||
                []
            ) as T[]),
        );
    }

    return rows;
}

export function percentage(
    numerator: number,
    denominator: number,
) {
    if (
        denominator <=
        0
    ) {
        return 0;
    }

    return Math.round(
        (
            numerator /
            denominator
        ) *
            1000,
    ) /
        10;
}

export function dateKey(
    value: unknown,
) {
    if (
        typeof value !==
        "string" ||
        !value
    ) {
        return null;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return null;
    }

    return date
        .toISOString()
        .slice(
            0,
            10,
        );
}

export function normalizeAnalyticsMode({
    storedMode,
    registrationOpen,
    invitationCount,
}: {
    storedMode: unknown;
    registrationOpen: boolean;
    invitationCount: number;
}): EventAnalyticsMode {
    if (
        storedMode ===
        "invitation_only"
    ) {
        return "invitation_only";
    }

    if (
        storedMode ===
        "public_registration"
    ) {
        return "public_registration";
    }

    if (
        !registrationOpen &&
        invitationCount >
            0
    ) {
        return "invitation_only";
    }

    return "public_registration";
}

// Shared by any admin settings page that needs to know an event's mode to
// decide which of a "for RSVP" / "for public registration" pair of options
// to show — same inputs/heuristic normalizeAnalyticsMode already uses
// elsewhere (dashboard overview, sidebar nav), just packaged as one fetch.
export async function resolveEventRegistrationMode(
    admin: SupabaseClient,
    eventId: string,
): Promise<EventAnalyticsMode> {
    const [
        eventSettingsResult,
        invitationCountResult,
    ] = await Promise.all([
        admin
            .from("event_settings")
            .select(
                "registration_mode, registration_is_open",
            )
            .eq("event_id", eventId)
            .maybeSingle(),

        admin
            .from("event_invitations")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("event_id", eventId),
    ]);

    return normalizeAnalyticsMode({
        storedMode:
            eventSettingsResult.data
                ?.registration_mode,
        registrationOpen:
            eventSettingsResult.data
                ?.registration_is_open !==
            false,
        invitationCount: Number(
            invitationCountResult.count ||
                0,
        ),
    });
}

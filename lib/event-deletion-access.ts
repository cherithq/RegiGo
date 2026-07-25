import {
    createClient,
    type SupabaseClient,
    type User,
} from "@supabase/supabase-js";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";

type ProfileRow = {
    id: string;
    role:
        | string
        | null;
    platform_role:
        | string
        | null;
    company_id:
        | string
        | null;
};

type CompanyMemberRow = {
    company_id:
        | string
        | null;
    company_role:
        | string
        | null;
    status:
        | string
        | null;
};

type EventRow = {
    id: string;
    company_id:
        | string
        | null;
    event_name:
        | string
        | null;
};

type CompanyRow = {
    id: string;
    status:
        | string
        | null;
    current_plan_id:
        | string
        | null;
};

type RentalPlanRow = {
    id: string;
    code:
        | string
        | null;
    plan_name:
        | string
        | null;
    rental_type:
        | string
        | null;
    event_limit:
        | number
        | null;
    features:
        | Record<
              string,
              unknown
          >
        | null;
    is_active:
        | boolean
        | null;
};

type SubscriptionRow = {
    id: string;
    company_id: string;
    plan_id: string;
    status:
        | string
        | null;
    starts_at:
        | string
        | null;
    ends_at:
        | string
        | null;
    cancel_at_period_end:
        | boolean
        | null;
};

export type EventDeletionAccess = {
    allowed: boolean;
    reason: string;
    isPlatformAdmin: boolean;
    isCompanyAdmin: boolean;
    hasUnlimitedPlan: boolean;
    companyId:
        | string
        | null;
    event: EventRow;
    plan:
        | RentalPlanRow
        | null;
};

export class EventDeletionAccessError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(
            message,
        );
        this.name =
            "EventDeletionAccessError";
        this.status =
            status;
    }
}

const COMPATIBILITY_CODES =
    new Set([
        "42P01",
        "42703",
        "PGRST116",
        "PGRST204",
        "PGRST205",
    ]);

function clean(
    value: unknown,
) {
    return String(
        value ||
            "",
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            "_",
        );
}

function isCompatibilityError(
    error:
        | {
              code?: unknown;
          }
        | null
        | undefined,
) {
    return COMPATIBILITY_CODES.has(
        String(
            error?.code ||
                "",
        ),
    );
}

function serviceClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (
        !url ||
        !key
    ) {
        throw new EventDeletionAccessError(
            "Supabase server configuration is incomplete.",
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

function isPlatformAdminRole(
    value: unknown,
) {
    return [
        "super_admin",
        "super-admin",
        "platform_admin",
        "platform-admin",
    ].includes(
        clean(
            value,
        ),
    );
}

function isCompanyAdminRole(
    value: unknown,
) {
    return [
        "admin",
        "administrator",
        "owner",
        "company_admin",
        "company-admin",
    ].includes(
        clean(
            value,
        ),
    );
}

function isActiveCompany(
    value: unknown,
) {
    const status =
        clean(
            value,
        );

    return (
        !status ||
        [
            "active",
            "trialing",
        ].includes(
            status,
        )
    );
}

function isActiveSubscription(
    subscription:
        SubscriptionRow,
) {
    const status =
        clean(
            subscription.status,
        );

    if (
        ![
            "active",
            "trialing",
        ].includes(
            status,
        )
    ) {
        return false;
    }

    const now =
        Date.now();
    const startsAt =
        subscription.starts_at
            ? new Date(
                  subscription.starts_at,
              ).getTime()
            : null;
    const endsAt =
        subscription.ends_at
            ? new Date(
                  subscription.ends_at,
              ).getTime()
            : null;

    if (
        startsAt !==
            null &&
        (
            Number.isNaN(
                startsAt,
            ) ||
            startsAt >
                now
        )
    ) {
        return false;
    }

    if (
        endsAt !==
            null &&
        (
            Number.isNaN(
                endsAt,
            ) ||
            endsAt <=
                now
        )
    ) {
        return false;
    }

    return true;
}

function hasUnlimitedEvents(
    plan:
        RentalPlanRow,
) {
    const features =
        plan.features &&
        typeof plan.features ===
            "object" &&
        !Array.isArray(
            plan.features,
        )
            ? plan.features
            : {};

    const explicitUnlimited =
        features.unlimited_events ===
            true ||
        features.unlimitedEvents ===
            true ||
        features.events_unlimited ===
            true;

    const eventLimit =
        plan.event_limit;

    return (
        explicitUnlimited ||
        eventLimit ===
            null ||
        (
            typeof eventLimit ===
                "number" &&
            eventLimit <=
                0
        )
    );
}

async function loadProfile(
    admin:
        SupabaseClient,
    userId: string,
) {
    const primary =
        await admin
            .from(
                "profiles",
            )
            .select(
                "id, role, platform_role, company_id",
            )
            .eq(
                "id",
                userId,
            )
            .maybeSingle();

    if (
        primary.error &&
        String(
            primary.error
                .code ||
                "",
        ) ===
            "42703"
    ) {
        const fallback =
            await admin
                .from(
                    "profiles",
                )
                .select(
                    "id, role, company_id",
                )
                .eq(
                    "id",
                    userId,
                )
                .maybeSingle();

        if (
            fallback.error
        ) {
            throw new EventDeletionAccessError(
                fallback.error
                    .message,
                500,
            );
        }

        if (
            !fallback.data
        ) {
            return null;
        }

        return {
            ...fallback.data,
            platform_role:
                null,
        } as unknown as ProfileRow;
    }

    if (
        primary.error
    ) {
        throw new EventDeletionAccessError(
            primary.error
                .message,
            500,
        );
    }

    return (
        primary.data ||
        null
    ) as unknown as
        | ProfileRow
        | null;
}

async function loadCompanyMembership(
    admin:
        SupabaseClient,
    userId: string,
    companyId:
        | string
        | null,
) {
    const userColumns = [
        "user_id",
        "profile_id",
    ] as const;

    for (const userColumn of userColumns) {
        let query =
            admin
                .from(
                    "company_members",
                )
                .select(
                    "company_id, company_role, status",
                )
                .eq(
                    userColumn,
                    userId,
                );

        if (
            companyId
        ) {
            query =
                query.eq(
                    "company_id",
                    companyId,
                );
        }

        const result =
            await query
                .limit(1)
                .maybeSingle();

        if (
            result.error
        ) {
            if (
                isCompatibilityError(
                    result.error,
                )
            ) {
                continue;
            }

            throw new EventDeletionAccessError(
                result.error
                    .message,
                500,
            );
        }

        if (
            result.data
        ) {
            return result.data as unknown as CompanyMemberRow;
        }
    }

    return null;
}

async function requireAuthenticatedUser() {
    const server =
        await createSupabaseServerClient();
    const {
        data: {
            user,
        },
        error,
    } =
        await server.auth.getUser();

    if (
        error ||
        !user
    ) {
        throw new EventDeletionAccessError(
            "You must be logged in.",
            401,
        );
    }

    return user;
}

async function loadEvent(
    admin:
        SupabaseClient,
    eventId: string,
) {
    const result =
        await admin
            .from(
                "events",
            )
            .select(
                "id, company_id, event_name",
            )
            .eq(
                "id",
                eventId,
            )
            .maybeSingle();

    if (
        result.error
    ) {
        throw new EventDeletionAccessError(
            result.error
                .message,
            500,
        );
    }

    if (
        !result.data
    ) {
        throw new EventDeletionAccessError(
            "The event could not be found.",
            404,
        );
    }

    return result.data as unknown as EventRow;
}

async function loadCompany(
    admin:
        SupabaseClient,
    companyId: string,
) {
    const result =
        await admin
            .from(
                "companies",
            )
            .select(
                "id, status, current_plan_id",
            )
            .eq(
                "id",
                companyId,
            )
            .maybeSingle();

    if (
        result.error
    ) {
        throw new EventDeletionAccessError(
            result.error
                .message,
            500,
        );
    }

    return (
        result.data ||
        null
    ) as unknown as
        | CompanyRow
        | null;
}

async function loadPlan(
    admin:
        SupabaseClient,
    planId: string,
) {
    const result =
        await admin
            .from(
                "rental_plans",
            )
            .select(
                "id, code, plan_name, rental_type, event_limit, features, is_active",
            )
            .eq(
                "id",
                planId,
            )
            .maybeSingle();

    if (
        result.error
    ) {
        throw new EventDeletionAccessError(
            result.error
                .message,
            500,
        );
    }

    return (
        result.data ||
        null
    ) as unknown as
        | RentalPlanRow
        | null;
}

async function loadActiveSubscription(
    admin:
        SupabaseClient,
    companyId: string,
    planId: string,
) {
    const result =
        await admin
            .from(
                "company_subscriptions",
            )
            .select(
                "id, company_id, plan_id, status, starts_at, ends_at, cancel_at_period_end",
            )
            .eq(
                "company_id",
                companyId,
            )
            .eq(
                "plan_id",
                planId,
            )
            .in(
                "status",
                [
                    "active",
                    "trialing",
                ],
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                },
            )
            .limit(5);

    if (
        result.error
    ) {
        throw new EventDeletionAccessError(
            result.error
                .message,
            500,
        );
    }

    const subscriptions =
        (
            result.data ||
            []
        ) as unknown as
            SubscriptionRow[];

    return subscriptions.find(
        isActiveSubscription,
    ) ||
        null;
}

export async function getEventDeletionAccess(
    eventId: string,
): Promise<{
    access:
        EventDeletionAccess;
    admin:
        SupabaseClient;
    user:
        User;
}> {
    const user =
        await requireAuthenticatedUser();
    const admin =
        serviceClient();
    const [
        profile,
        event,
    ] =
        await Promise.all([
            loadProfile(
                admin,
                user.id,
            ),
            loadEvent(
                admin,
                eventId,
            ),
        ]);

    const isPlatformAdmin =
        isPlatformAdminRole(
            profile
                ?.platform_role,
        ) ||
        (
            !profile
                ?.company_id &&
            isPlatformAdminRole(
                profile?.role,
            )
        );

    if (
        isPlatformAdmin
    ) {
        return {
            admin,
            user,
            access: {
                allowed:
                    true,
                reason:
                    "RegiGo platform administrators may delete any event.",
                isPlatformAdmin:
                    true,
                isCompanyAdmin:
                    false,
                hasUnlimitedPlan:
                    true,
                companyId:
                    event.company_id,
                event,
                plan:
                    null,
            },
        };
    }

    const membership =
        await loadCompanyMembership(
            admin,
            user.id,
            profile
                ?.company_id ||
                event.company_id,
        );
    const companyId =
        profile
            ?.company_id ||
        membership
            ?.company_id ||
        null;
    const isCompanyAdmin =
        isCompanyAdminRole(
            profile?.role,
        ) ||
        isCompanyAdminRole(
            membership
                ?.company_role,
        );
    const membershipActive =
        !membership ||
        isActiveCompany(
            membership.status,
        );

    if (
        !isCompanyAdmin ||
        !membershipActive
    ) {
        return {
            admin,
            user,
            access: {
                allowed:
                    false,
                reason:
                    "Only the RegiGo platform administrator or a company administrator on an unlimited plan can delete events.",
                isPlatformAdmin:
                    false,
                isCompanyAdmin:
                    false,
                hasUnlimitedPlan:
                    false,
                companyId,
                event,
                plan:
                    null,
            },
        };
    }

    if (
        !companyId ||
        !event.company_id ||
        companyId !==
            event.company_id
    ) {
        return {
            admin,
            user,
            access: {
                allowed:
                    false,
                reason:
                    "You can delete only events belonging to your own event company.",
                isPlatformAdmin:
                    false,
                isCompanyAdmin:
                    true,
                hasUnlimitedPlan:
                    false,
                companyId,
                event,
                plan:
                    null,
            },
        };
    }

    const company =
        await loadCompany(
            admin,
            companyId,
        );

    if (
        !company ||
        !isActiveCompany(
            company.status,
        )
    ) {
        return {
            admin,
            user,
            access: {
                allowed:
                    false,
                reason:
                    "The event company is not active.",
                isPlatformAdmin:
                    false,
                isCompanyAdmin:
                    true,
                hasUnlimitedPlan:
                    false,
                companyId,
                event,
                plan:
                    null,
            },
        };
    }

    if (
        !company.current_plan_id
    ) {
        return {
            admin,
            user,
            access: {
                allowed:
                    false,
                reason:
                    "Event deletion requires an active unlimited rental plan.",
                isPlatformAdmin:
                    false,
                isCompanyAdmin:
                    true,
                hasUnlimitedPlan:
                    false,
                companyId,
                event,
                plan:
                    null,
            },
        };
    }

    const [
        plan,
        subscription,
    ] =
        await Promise.all([
            loadPlan(
                admin,
                company.current_plan_id,
            ),
            loadActiveSubscription(
                admin,
                companyId,
                company.current_plan_id,
            ),
        ]);

    const planActive =
        Boolean(
            plan,
        ) &&
        plan
            ?.is_active !==
            false;
    const annualPlan =
        clean(
            plan
                ?.rental_type,
        ) ===
        "annual";
    const unlimited =
        Boolean(
            plan,
        ) &&
        hasUnlimitedEvents(
            plan as RentalPlanRow,
        );
    const hasUnlimitedPlan =
        planActive &&
        annualPlan &&
        unlimited &&
        Boolean(
            subscription,
        );

    return {
        admin,
        user,
        access: {
            allowed:
                hasUnlimitedPlan,
            reason:
                hasUnlimitedPlan
                    ? "The company has an active unlimited annual subscription."
                    : "Only companies with an active unlimited annual subscription can delete events.",
            isPlatformAdmin:
                false,
            isCompanyAdmin:
                true,
            hasUnlimitedPlan,
            companyId,
            event,
            plan,
        },
    };
}

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    cleanPlanFeatures,
    type RentalPlanFeatures,
    type RentalType,
} from "@/lib/rental-plans";

type CompanyRecord = {
    id: string;
    company_name: string;
    company_slug: string;
    status: "active" | "suspended" | "cancelled" | string;
    current_plan_id: string | null;
    owner_user_id: string | null;
    billing_email: string | null;
    created_at: string | null;
};

type ProfileRecord = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    company_id: string | null;
    platform_role: "super_admin" | null;
};

type MembershipRecord = {
    id: string;
    company_id: string;
    user_id: string;
    company_role: "owner" | "admin" | "member" | string;
    status: string;
};

type PlanRecord = {
    id: string;
    code: string;
    plan_name: string;
    rental_type: RentalType;
    event_limit: number | null;
    team_member_limit: number | null;
    features: unknown;
    is_active: boolean;
};

type SubscriptionRecord = {
    id: string;
    company_id: string;
    plan_id: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    cancel_at_period_end: boolean;
};

const platformFeatures: RentalPlanFeatures = {
    email_centre: true,
    payments: true,
    stripe_payments: true,
    guest_invitations: true,
    guest_table_selection: true,
    badge_designer: true,
    direct_printing: true,
    lucky_draw: true,
    tournament: true,
};

export type CompanyContext = {
    userId: string;
    profile: ProfileRecord;
    company: CompanyRecord;
    membership: MembershipRecord;
    plan: (Omit<PlanRecord, "features"> & {
        features: RentalPlanFeatures;
    }) | null;
    subscription: SubscriptionRecord | null;
    eventCount: number;
    teamMemberCount: number;
    availableEventLicenses: number;
    accessibleEventIds: string[];
    isPlatformAdmin: boolean;
};

export type EventCreationPermission = {
    allowed: boolean;
    reason: string | null;
    eventCount: number;
    eventLimit: number | null;
    availableLicenses: number;
};

function isFuture(value: string | null | undefined) {
    if (!value) return true;
    return new Date(value).getTime() > Date.now();
}

export function isPlatformAdminContext(
    context: CompanyContext,
) {
    return context.isPlatformAdmin;
}

export function hasAllCompanyEvents(
    context: CompanyContext,
) {
    return (
        context.isPlatformAdmin ||
        context.profile.role === "admin"
    );
}

export async function getCurrentCompanyContext(): Promise<CompanyContext> {
    const supabaseServer =
        await createSupabaseServerClient();
    const db = supabaseServer as any;

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile, error: profileError } =
        await db
            .from("profiles")
            .select(
                "id, full_name, email, role, company_id, platform_role",
            )
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {
        throw new Error(profileError.message);
    }

    if (!profile?.company_id) {
        throw new Error(
            "This account is not connected to an event company.",
        );
    }

    const isPlatformAdmin =
        profile.platform_role === "super_admin";

    let eventCountQuery = db
        .from("events")
        .select("id", {
            count: "exact",
            head: true,
        });

    if (!isPlatformAdmin) {
        eventCountQuery = eventCountQuery.eq(
            "company_id",
            profile.company_id,
        );
    }

    const [
        companyResult,
        membershipResult,
        eventCountResult,
        teamCountResult,
        licenseCountResult,
    ] = await Promise.all([
        db
            .from("companies")
            .select(
                "id, company_name, company_slug, status, current_plan_id, owner_user_id, billing_email, created_at",
            )
            .eq("id", profile.company_id)
            .maybeSingle(),

        db
            .from("company_members")
            .select(
                "id, company_id, user_id, company_role, status",
            )
            .eq("company_id", profile.company_id)
            .eq("user_id", user.id)
            .maybeSingle(),

        eventCountQuery,

        db
            .from("company_members")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("company_id", profile.company_id)
            .in("status", ["active", "invited"]),

        db
            .from("event_licenses")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("company_id", profile.company_id)
            .eq("status", "available")
            .or(
                `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`,
            ),
    ]);

    if (companyResult.error) {
        throw new Error(companyResult.error.message);
    }

    if (!companyResult.data) {
        throw new Error(
            "The event company could not be found.",
        );
    }

    let membership =
        (membershipResult.data as MembershipRecord | null) ||
        null;

    if (!membership && isPlatformAdmin) {
        membership = {
            id: "platform-admin",
            company_id: profile.company_id,
            user_id: user.id,
            company_role: "owner",
            status: "active",
        };
    }

    if (
        !membership ||
        !["active", "invited"].includes(
            membership.status,
        )
    ) {
        throw new Error(
            "Your access to this event company is not active.",
        );
    }

    const company =
        companyResult.data as CompanyRecord;

    let plan: CompanyContext["plan"] = null;
    let subscription: SubscriptionRecord | null =
        null;

    if (isPlatformAdmin) {
        plan = {
            id: "platform-admin",
            code: "platform_admin",
            plan_name:
                "Platform Admin — Unlimited",
            rental_type: "annual",
            event_limit: null,
            team_member_limit: null,
            features: platformFeatures,
            is_active: true,
        };
    } else if (company.current_plan_id) {
        const [
            planResult,
            subscriptionResult,
        ] = await Promise.all([
            db
                .from("rental_plans")
                .select(
                    "id, code, plan_name, rental_type, event_limit, team_member_limit, features, is_active",
                )
                .eq(
                    "id",
                    company.current_plan_id,
                )
                .maybeSingle(),

            db
                .from("company_subscriptions")
                .select(
                    "id, company_id, plan_id, status, starts_at, ends_at, cancel_at_period_end",
                )
                .eq("company_id", company.id)
                .eq(
                    "plan_id",
                    company.current_plan_id,
                )
                .order("created_at", {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle(),
        ]);

        if (planResult.error) {
            throw new Error(
                planResult.error.message,
            );
        }

        if (planResult.data) {
            const rawPlan =
                planResult.data as PlanRecord;

            plan = {
                ...rawPlan,
                features: cleanPlanFeatures(
                    rawPlan.features,
                ),
            };
        }

        if (subscriptionResult.error) {
            throw new Error(
                subscriptionResult.error.message,
            );
        }

        subscription =
            subscriptionResult.data as SubscriptionRecord | null;
    }

    let accessibleEventIds: string[] = [];

    if (
        !isPlatformAdmin &&
        profile.role !== "admin"
    ) {
        const {
            data: assignments,
            error: assignmentError,
        } = await db
            .from("event_members")
            .select("event_id")
            .eq("profile_id", user.id);

        if (assignmentError) {
            throw new Error(
                assignmentError.message,
            );
        }

        accessibleEventIds = Array.from(
            new Set(
                (assignments || [])
                    .map(
                        (row: {
                            event_id?: unknown;
                        }) =>
                            String(
                                row.event_id || "",
                            ),
                    )
                    .filter(Boolean),
            ),
        );
    }

    return {
        userId: user.id,
        profile: profile as ProfileRecord,
        company,
        membership,
        plan,
        subscription,
        eventCount:
            eventCountResult.count || 0,
        teamMemberCount:
            teamCountResult.count || 0,
        availableEventLicenses:
            isPlatformAdmin
                ? 0
                : licenseCountResult.count || 0,
        accessibleEventIds,
        isPlatformAdmin,
    };
}

export function evaluateEventCreation(
    context: CompanyContext,
): EventCreationPermission {
    const {
        company,
        plan,
        subscription,
    } = context;

    if (context.isPlatformAdmin) {
        return {
            allowed: true,
            reason: null,
            eventCount: context.eventCount,
            eventLimit: null,
            availableLicenses: 0,
        };
    }

    if (context.profile.role !== "admin") {
        return {
            allowed: false,
            reason:
                "Only an admin account can create an event.",
            eventCount: context.eventCount,
            eventLimit:
                plan?.event_limit ?? null,
            availableLicenses:
                context.availableEventLicenses,
        };
    }

    if (company.status !== "active") {
        return {
            allowed: false,
            reason:
                "This event company account is not active.",
            eventCount: context.eventCount,
            eventLimit:
                plan?.event_limit ?? null,
            availableLicenses:
                context.availableEventLicenses,
        };
    }

    if (!plan || !plan.is_active) {
        return {
            allowed: false,
            reason:
                "No active rental plan is assigned to this company.",
            eventCount: context.eventCount,
            eventLimit: null,
            availableLicenses:
                context.availableEventLicenses,
        };
    }

    if (plan.rental_type === "per_event") {
        const allowed =
            context.availableEventLicenses > 0;

        return {
            allowed,
            reason: allowed
                ? null
                : "No unused per-event licence is available. Purchase another event licence before creating an event.",
            eventCount: context.eventCount,
            eventLimit: 1,
            availableLicenses:
                context.availableEventLicenses,
        };
    }

    const subscriptionActive =
        Boolean(subscription) &&
        ["trialing", "active"].includes(
            subscription?.status || "",
        ) &&
        isFuture(subscription?.ends_at);

    if (!subscriptionActive) {
        return {
            allowed: false,
            reason:
                "The annual subscription is not active.",
            eventCount: context.eventCount,
            eventLimit: plan.event_limit,
            availableLicenses:
                context.availableEventLicenses,
        };
    }

    const allowed =
        plan.event_limit == null ||
        context.eventCount <
            plan.event_limit;

    return {
        allowed,
        reason: allowed
            ? null
            : `Your plan limit of ${plan.event_limit} events has been reached.`,
        eventCount: context.eventCount,
        eventLimit: plan.event_limit,
        availableLicenses:
            context.availableEventLicenses,
    };
}

export async function canCreateEvent() {
    const context =
        await getCurrentCompanyContext();

    return {
        context,
        permission:
            evaluateEventCreation(context),
    };
}

export async function requireEventCompanyAccess(
    eventId: string,
) {
    const context =
        await getCurrentCompanyContext();
    const supabaseServer =
        await createSupabaseServerClient();
    const db = supabaseServer as any;

    const { data: event, error } = await db
        .from("events")
        .select("id, company_id")
        .eq("id", eventId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (
        context.isPlatformAdmin &&
        event
    ) {
        return context;
    }

    const assigned =
        context.profile.role === "admin" ||
        context.accessibleEventIds.includes(
            eventId,
        );

    if (
        !event ||
        event.company_id !==
            context.company.id ||
        !assigned
    ) {
        redirect("/dashboard/events");
    }

    return context;
}

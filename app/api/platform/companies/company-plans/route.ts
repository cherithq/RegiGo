import {
    NextResponse,
} from "next/server";
import {
    createClient,
} from "@supabase/supabase-js";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

class CompanyPlanError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "CompanyPlanError";
        this.status =
            status;
    }
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

function fail(
    error: unknown,
) {
    return reply(
        {
            error:
                error instanceof
                    Error
                    ? error.message
                    : "Unable to manage company rental plans.",
        },
        error instanceof
            CompanyPlanError
            ? error.status
            : 500,
    );
}

function serviceClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new CompanyPlanError(
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

function clean(
    value: unknown,
    maximum = 200,
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

function integer(
    value: unknown,
    fallback: number,
) {
    const parsed =
        Number(value);

    return Number.isInteger(
        parsed,
    )
        ? parsed
        : fallback;
}

function optionalIsoDate(
    value: string,
    label: string,
) {
    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new CompanyPlanError(
            `${label} is invalid.`,
        );
    }

    return date.toISOString();
}

function relationHelp(
    message: string,
) {
    const lowered =
        message.toLowerCase();

    if (
        lowered.includes(
            "does not exist",
        ) ||
        lowered.includes(
            "schema cache",
        ) ||
        lowered.includes(
            "could not find the table",
        ) ||
        lowered.includes(
            "could not find the function",
        )
    ) {
        return `${message} Run supabase/migrations/20260725_company_rental_plan_management.sql and restart Next.js.`;
    }

    return message;
}

async function requirePlatformAdmin() {
    const server =
        await createSupabaseServerClient();
    const {
        data: {
            user,
        },
        error:
            authError,
    } = await server.auth
        .getUser();

    if (
        authError ||
        !user
    ) {
        throw new CompanyPlanError(
            "You must be logged in.",
            401,
        );
    }

    const admin =
        serviceClient();
    let profile:
        | {
              role?:
                  | string
                  | null;
              platform_role?:
                  | string
                  | null;
          }
        | null = null;

    const fullProfile =
        await admin
            .from(
                "profiles",
            )
            .select(
                "id, role, platform_role",
            )
            .eq(
                "id",
                user.id,
            )
            .maybeSingle();

    if (
        fullProfile.error &&
        String(
            fullProfile.error
                .code ||
                "",
        ) === "42703"
    ) {
        const fallback =
            await admin
                .from(
                    "profiles",
                )
                .select(
                    "id, role",
                )
                .eq(
                    "id",
                    user.id,
                )
                .maybeSingle();

        if (fallback.error) {
            throw new CompanyPlanError(
                fallback.error
                    .message,
            );
        }

        profile =
            fallback.data;
    } else if (
        fullProfile.error
    ) {
        throw new CompanyPlanError(
            fullProfile.error
                .message,
        );
    } else {
        profile =
            fullProfile.data;
    }

    const platformRole =
        String(
            profile
                ?.platform_role ||
                "",
        )
            .trim()
            .toLowerCase();
    const accountRole =
        String(
            profile?.role ||
                "",
        )
            .trim()
            .toLowerCase();
    const isPlatformAdmin =
        [
            "super_admin",
            "super-admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            platformRole,
        ) ||
        [
            "super_admin",
            "super-admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            accountRole,
        );

    if (!isPlatformAdmin) {
        throw new CompanyPlanError(
            "Only the RegiGo platform administrator can change company rental plans.",
            403,
        );
    }

    return {
        user,
        admin,
    };
}

async function assertResult(
    error:
        | {
              message: string;
          }
        | null,
) {
    if (error) {
        throw new CompanyPlanError(
            relationHelp(
                error.message,
            ),
        );
    }
}

export async function GET() {
    try {
        const {
            admin,
        } =
            await requirePlatformAdmin();

        const [
            planResult,
            companyResult,
            eventResult,
            memberResult,
            subscriptionResult,
            licenceResult,
        ] =
            await Promise.all([
                admin
                    .from(
                        "rental_plans",
                    )
                    .select(
                        "id, code, plan_name, rental_type, price_amount, currency, event_limit, team_member_limit, features, is_active",
                    )
                    .order(
                        "rental_type",
                        {
                            ascending:
                                true,
                        },
                    )
                    .order(
                        "plan_name",
                        {
                            ascending:
                                true,
                        },
                    ),

                admin
                    .from(
                        "companies",
                    )
                    .select(
                        "id, company_name, company_slug, status, current_plan_id, billing_email, contact_number, created_at",
                    )
                    .order(
                        "company_name",
                        {
                            ascending:
                                true,
                        },
                    ),

                admin
                    .from(
                        "events",
                    )
                    .select(
                        "id, company_id",
                    ),

                admin
                    .from(
                        "company_members",
                    )
                    .select(
                        "id, company_id, status",
                    ),

                admin
                    .from(
                        "company_subscriptions",
                    )
                    .select(
                        "id, company_id, plan_id, status, starts_at, ends_at, cancel_at_period_end, created_at",
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false,
                        },
                    ),

                admin
                    .from(
                        "event_licenses",
                    )
                    .select(
                        "id, company_id, plan_id, event_id, status, starts_at, expires_at, used_at, created_at",
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                false,
                        },
                    ),
            ]);

        await Promise.all([
            assertResult(
                planResult.error,
            ),
            assertResult(
                companyResult.error,
            ),
            assertResult(
                eventResult.error,
            ),
            assertResult(
                memberResult.error,
            ),
            assertResult(
                subscriptionResult.error,
            ),
            assertResult(
                licenceResult.error,
            ),
        ]);

        const plans =
            planResult.data ||
            [];
        const planById =
            new Map(
                plans.map(
                    (
                        plan,
                    ) => [
                        String(
                            plan.id,
                        ),
                        plan,
                    ],
                ),
            );
        const events =
            eventResult.data ||
            [];
        const members =
            memberResult.data ||
            [];
        const subscriptions =
            subscriptionResult.data ||
            [];
        const licences =
            licenceResult.data ||
            [];
        const now =
            Date.now();

        const companies =
            (
                companyResult.data ||
                []
            ).map(
                (
                    company,
                ) => {
                    const companyId =
                        String(
                            company.id,
                        );
                    const currentPlan =
                        company.current_plan_id
                            ? planById.get(
                                  String(
                                      company.current_plan_id,
                                  ),
                              ) ||
                              null
                            : null;
                    const latestSubscription =
                        subscriptions.find(
                            (
                                subscription,
                            ) =>
                                String(
                                    subscription.company_id,
                                ) ===
                                    companyId &&
                                (
                                    !company.current_plan_id ||
                                    String(
                                        subscription.plan_id,
                                    ) ===
                                        String(
                                            company.current_plan_id,
                                        )
                                ),
                        ) ||
                        null;
                    const companyLicences =
                        licences.filter(
                            (
                                licence,
                            ) =>
                                String(
                                    licence.company_id,
                                ) ===
                                companyId,
                        );

                    return {
                        ...company,
                        currentPlan,
                        subscription:
                            latestSubscription,
                        eventCount:
                            events.filter(
                                (
                                    event,
                                ) =>
                                    String(
                                        event.company_id,
                                    ) ===
                                    companyId,
                            ).length,
                        teamMemberCount:
                            members.filter(
                                (
                                    member,
                                ) =>
                                    String(
                                        member.company_id,
                                    ) ===
                                        companyId &&
                                    String(
                                        member.status ||
                                            "active",
                                    ).toLowerCase() ===
                                        "active",
                            ).length,
                        availableEventLicences:
                            companyLicences.filter(
                                (
                                    licence,
                                ) =>
                                    licence.status ===
                                        "available" &&
                                    (
                                        !licence.expires_at ||
                                        new Date(
                                            licence.expires_at,
                                        ).getTime() >
                                            now
                                    ),
                            ).length,
                        usedEventLicences:
                            companyLicences.filter(
                                (
                                    licence,
                                ) =>
                                    licence.status ===
                                    "used",
                            ).length,
                        nextLicenceExpiry:
                            companyLicences
                                .filter(
                                    (
                                        licence,
                                    ) =>
                                        licence.status ===
                                            "available" &&
                                        licence.expires_at &&
                                        new Date(
                                            licence.expires_at,
                                        ).getTime() >
                                            now,
                                )
                                .map(
                                    (
                                        licence,
                                    ) =>
                                        licence.expires_at as string,
                                )
                                .sort()[0] ||
                            null,
                    };
                },
            );

        return reply({
            success:
                true,
            plans,
            companies,
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

export async function PATCH(
    request: Request,
) {
    try {
        const {
            user,
            admin,
        } =
            await requirePlatformAdmin();
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const companyId =
            clean(
                body.companyId,
                80,
            );
        const planId =
            clean(
                body.planId,
                80,
            );
        const subscriptionEndsAt =
            clean(
                body.subscriptionEndsAt,
                80,
            );
        const licenceQuantity =
            integer(
                body.eventLicenceQuantity,
                1,
            );
        const licenceExpiry =
            clean(
                body.perEventExpiry,
                80,
            );

        if (!companyId) {
            throw new CompanyPlanError(
                "Choose an event company.",
            );
        }

        if (!planId) {
            throw new CompanyPlanError(
                "Choose a rental plan.",
            );
        }

        if (
            licenceQuantity <
                1 ||
            licenceQuantity >
                100
        ) {
            throw new CompanyPlanError(
                "Per-event licence quantity must be between 1 and 100.",
            );
        }

        const {
            data,
            error,
        } = await admin.rpc(
            "regigo_change_company_rental_plan_v1",
            {
                p_company_id:
                    companyId,
                p_plan_id:
                    planId,
                p_changed_by:
                    user.id,
                p_subscription_ends_at:
                    optionalIsoDate(
                        subscriptionEndsAt,
                        "Subscription end date",
                    ),
                p_event_licence_quantity:
                    licenceQuantity,
                p_event_licence_expires_at:
                    optionalIsoDate(
                        licenceExpiry,
                        "Event licence expiry",
                    ),
            },
        );

        if (error) {
            throw new CompanyPlanError(
                relationHelp(
                    error.message,
                ),
                String(
                    error.code ||
                        "",
                ) === "P0002"
                    ? 404
                    : String(
                            error.code ||
                                "",
                        ) ===
                        "P0001"
                      ? 409
                      : 400,
            );
        }

        return reply({
            success:
                true,
            message:
                "The company rental plan has been updated.",
            result:
                Array.isArray(
                    data,
                )
                    ? data[0] ||
                      null
                    : data,
        });
    } catch (error) {
        return fail(
            error,
        );
    }
}

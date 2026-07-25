import "server-only";

import Stripe from "stripe";
import {
    CompanyModuleError,
    getCompanyActor,
    getCompanyAdminClient,
    requireCompanyPermission,
} from "@/lib/company-module-server";

export class StripeConnectError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "StripeConnectError";
        this.status = status;
    }
}

export function getStripeClient() {
    const secret =
        process.env
            .STRIPE_SECRET_KEY;

    if (!secret) {
        throw new StripeConnectError(
            "STRIPE_SECRET_KEY is missing from the server environment.",
            500,
        );
    }

    return new Stripe(
        secret,
        {
            maxNetworkRetries: 2,
            timeout: 20_000,
        },
    );
}

export function platformCompanyId() {
    return (
        process.env
            .REGIGO_PLATFORM_COMPANY_ID ||
        "00000000-0000-0000-0000-000000000001"
    );
}

export function isPlatformCompany(
    companyId: string,
) {
    return (
        companyId ===
        platformCompanyId()
    );
}

function cleanCompanyId(
    value?:
        | string
        | null,
) {
    return value?.trim() ||
        "";
}

function requestOrigin(
    request: Request,
) {
    const configured =
        process.env
            .NEXT_PUBLIC_APP_URL ||
        process.env
            .NEXT_PUBLIC_SITE_URL;

    if (configured) {
        return configured.replace(
            /\/+$/,
            "",
        );
    }

    const forwardedProtocol =
        request.headers.get(
            "x-forwarded-proto",
        );
    const forwardedHost =
        request.headers.get(
            "x-forwarded-host",
        );
    const host =
        forwardedHost ||
        request.headers.get(
            "host",
        );

    if (host) {
        return `${
            forwardedProtocol ||
            (host.includes(
                "localhost",
            )
                ? "http"
                : "https")
        }://${host}`;
    }

    const origin =
        request.headers.get(
            "origin",
        );

    if (
        origin &&
        /^https?:\/\//i.test(
            origin,
        )
    ) {
        return origin.replace(
            /\/+$/,
            "",
        );
    }

    const vercelHost =
        process.env
            .VERCEL_PROJECT_PRODUCTION_URL ||
        process.env
            .VERCEL_URL;

    return vercelHost
        ? `https://${vercelHost}`
        : "http://localhost:3000";
}

function resourceMissing(
    error: unknown,
) {
    if (
        !error ||
        typeof error !==
            "object"
    ) {
        return false;
    }

    const record =
        error as Record<
            string,
            any
        >;

    return (
        record.code ===
            "resource_missing" ||
        record.raw?.code ===
            "resource_missing"
    );
}

function accountRequirements(
    account: Stripe.Account,
) {
    const requirements =
        account.requirements;

    return {
        currentlyDue:
            requirements
                ?.currently_due ||
            [],
        eventuallyDue:
            requirements
                ?.eventually_due ||
            [],
        pastDue:
            requirements
                ?.past_due ||
            [],
        pendingVerification:
            requirements
                ?.pending_verification ||
            [],
        disabledReason:
            requirements
                ?.disabled_reason ||
            null,
    };
}

export async function requireStripeCompany(
    requestedCompanyId?:
        | string
        | null,
) {
    try {
        const actor =
            await getCompanyActor();

        const companyId =
            cleanCompanyId(
                requestedCompanyId,
            ) ||
            cleanCompanyId(
                actor.profile
                    .company_id,
            );

        if (!companyId) {
            throw new StripeConnectError(
                "Choose an event company before configuring Stripe.",
            );
        }

        await requireCompanyPermission({
            actor,
            companyId,
            permission:
                "stripe_setup",
            message:
                "Your Company Admin role does not have access to Stripe Payment Setup.",
        });

        const {
            data: company,
            error,
        } = await actor.admin
            .from("companies")
            .select("*")
            .eq(
                "id",
                companyId,
            )
            .maybeSingle();

        if (error) {
            throw new StripeConnectError(
                error.message,
            );
        }

        if (!company) {
            throw new StripeConnectError(
                "The event company could not be found.",
                404,
            );
        }

        return {
            actor,
            company,
            usesPlatformStripeAccount:
                isPlatformCompany(
                    String(
                        company.id,
                    ),
                ),
        };
    } catch (error) {
        if (
            error instanceof
            StripeConnectError
        ) {
            throw error;
        }

        if (
            error instanceof
            CompanyModuleError
        ) {
            throw new StripeConnectError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

async function saveAccountStatus({
    context,
    account,
}: {
    context: Awaited<
        ReturnType<
            typeof requireStripeCompany
        >
    >;
    account:
        | Stripe.Account
        | null;
}) {
    const values = account
        ? {
              stripe_connected_account_id:
                  account.id,
              stripe_account_type:
                  account.type ||
                  "standard",
              stripe_charges_enabled:
                  Boolean(
                      account
                          .charges_enabled,
                  ),
              stripe_payouts_enabled:
                  Boolean(
                      account
                          .payouts_enabled,
                  ),
              stripe_details_submitted:
                  Boolean(
                      account
                          .details_submitted,
                  ),
              stripe_connection_status:
                  account
                      .charges_enabled &&
                  account
                      .payouts_enabled
                      ? "ready"
                      : account
                              .details_submitted
                        ? "restricted"
                        : "onboarding",
              stripe_disabled_reason:
                  account.requirements
                      ?.disabled_reason ||
                  null,
              stripe_requirements_due:
                  account.requirements
                      ?.currently_due ||
                  [],
              stripe_last_synced_at:
                  new Date().toISOString(),
          }
        : {
              stripe_connected_account_id:
                  null,
              stripe_account_type:
                  null,
              stripe_charges_enabled:
                  false,
              stripe_payouts_enabled:
                  false,
              stripe_details_submitted:
                  false,
              stripe_connection_status:
                  "not_connected",
              stripe_disabled_reason:
                  null,
              stripe_requirements_due:
                  [],
              stripe_last_synced_at:
                  new Date().toISOString(),
          };

    const { error } =
        await context.actor.admin
            .from("companies")
            .update(values)
            .eq(
                "id",
                context.company.id,
            );

    if (error) {
        throw new StripeConnectError(
            error.message,
        );
    }

    return values;
}

export async function refreshStripeCompany(
    context: Awaited<
        ReturnType<
            typeof requireStripeCompany
        >
    >,
) {
    if (
        context
            .usesPlatformStripeAccount
    ) {
        return {
            connected: true,
            accountId: null,
            accountType:
                "platform",
            chargesEnabled: true,
            payoutsEnabled: true,
            detailsSubmitted: true,
            ready: true,
            requirements: {
                currentlyDue: [],
                eventuallyDue: [],
                pastDue: [],
                pendingVerification:
                    [],
                disabledReason:
                    null,
            },
        };
    }

    const accountId =
        String(
            context.company
                .stripe_connected_account_id ||
                "",
        );

    if (!accountId) {
        return {
            connected: false,
            accountId: null,
            accountType: null,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            ready: false,
            requirements: {
                currentlyDue: [],
                eventuallyDue: [],
                pastDue: [],
                pendingVerification:
                    [],
                disabledReason:
                    null,
            },
        };
    }

    try {
        const retrieved =
            await getStripeClient()
                .accounts.retrieve(
                    accountId,
                );

        if (
            "deleted" in
                retrieved &&
            retrieved.deleted
        ) {
            await saveAccountStatus({
                context,
                account: null,
            });

            return {
                connected: false,
                accountId: null,
                accountType: null,
                chargesEnabled:
                    false,
                payoutsEnabled:
                    false,
                detailsSubmitted:
                    false,
                ready: false,
                requirements: {
                    currentlyDue:
                        [],
                    eventuallyDue:
                        [],
                    pastDue: [],
                    pendingVerification:
                        [],
                    disabledReason:
                        null,
                },
            };
        }

        const account =
            retrieved as Stripe.Account;

        await saveAccountStatus({
            context,
            account,
        });

        return {
            connected: true,
            accountId:
                account.id,
            accountType:
                account.type ||
                "standard",
            chargesEnabled:
                Boolean(
                    account
                        .charges_enabled,
                ),
            payoutsEnabled:
                Boolean(
                    account
                        .payouts_enabled,
                ),
            detailsSubmitted:
                Boolean(
                    account
                        .details_submitted,
                ),
            ready:
                Boolean(
                    account
                        .charges_enabled,
                ) &&
                Boolean(
                    account
                        .payouts_enabled,
                ),
            requirements:
                accountRequirements(
                    account,
                ),
        };
    } catch (error) {
        if (
            resourceMissing(
                error,
            )
        ) {
            await saveAccountStatus({
                context,
                account: null,
            });

            return {
                connected: false,
                accountId: null,
                accountType: null,
                chargesEnabled:
                    false,
                payoutsEnabled:
                    false,
                detailsSubmitted:
                    false,
                ready: false,
                requirements: {
                    currentlyDue:
                        [],
                    eventuallyDue:
                        [],
                    pastDue: [],
                    pendingVerification:
                        [],
                    disabledReason:
                        null,
                },
            };
        }

        throw error;
    }
}

export async function ensureCompanyOwnedStripeAccount(
    context: Awaited<
        ReturnType<
            typeof requireStripeCompany
        >
    >,
) {
    if (
        context
            .usesPlatformStripeAccount
    ) {
        throw new StripeConnectError(
            "The RegiGo platform company uses the platform Stripe account directly.",
            409,
        );
    }

    const current =
        await refreshStripeCompany(
            context,
        );

    if (
        current.connected &&
        current.accountId
    ) {
        return current.accountId;
    }

    const stripe =
        getStripeClient();

    const account =
        await stripe.accounts.create({
            type: "standard",
            country:
                process.env
                    .STRIPE_CONNECT_COUNTRY ||
                "SG",
            email:
                context.company
                    .billing_email ||
                context.actor
                    .profile.email ||
                undefined,
            business_profile: {
                name:
                    String(
                        context.company
                            .company_name ||
                            "Event company",
                    ),
                product_description:
                    "Event registration and ticket sales through RegiGo",
            },
            metadata: {
                regigo_company_id:
                    String(
                        context.company.id,
                    ),
                regigo_company_name:
                    String(
                        context.company
                            .company_name ||
                            "Event company",
                    ),
            },
        });

    await saveAccountStatus({
        context,
        account,
    });

    return account.id;
}

export async function createOnboardingLink({
    request,
    context,
}: {
    request: Request;
    context: Awaited<
        ReturnType<
            typeof requireStripeCompany
        >
    >;
}) {
    const accountId =
        await ensureCompanyOwnedStripeAccount(
            context,
        );
    const origin =
        requestOrigin(request);
    const companyQuery =
        `companyId=${encodeURIComponent(
            String(
                context.company.id,
            ),
        )}`;

    const link =
        await getStripeClient()
            .accountLinks.create({
                account:
                    accountId,
                refresh_url:
                    `${origin}/api/company/stripe/connect/refresh?${companyQuery}`,
                return_url:
                    `${origin}/dashboard/payment-setup?${companyQuery}&stripe=returned`,
                type:
                    "account_onboarding",
            });

    return link.url;
}

export async function createStripeDashboardUrl(
    context: Awaited<
        ReturnType<
            typeof requireStripeCompany
        >
    >,
) {
    if (
        context
            .usesPlatformStripeAccount
    ) {
        return "https://dashboard.stripe.com/";
    }

    const status =
        await refreshStripeCompany(
            context,
        );

    if (
        !status.connected ||
        !status.accountId
    ) {
        throw new StripeConnectError(
            "Connect the company Stripe account first.",
            409,
        );
    }

    if (
        status.accountType ===
        "express"
    ) {
        const link =
            await getStripeClient()
                .accounts.createLoginLink(
                    status.accountId,
                );

        return link.url;
    }

    return "https://dashboard.stripe.com/";
}

export async function syncStripeAccountFromWebhook(
    account: Stripe.Account,
) {
    const companyId =
        account.metadata
            ?.regigo_company_id;

    if (!companyId) {
        return;
    }

    const admin =
        getCompanyAdminClient();

    await admin
        .from("companies")
        .update({
            stripe_connected_account_id:
                account.id,
            stripe_account_type:
                account.type ||
                "standard",
            stripe_charges_enabled:
                Boolean(
                    account
                        .charges_enabled,
                ),
            stripe_payouts_enabled:
                Boolean(
                    account
                        .payouts_enabled,
                ),
            stripe_details_submitted:
                Boolean(
                    account
                        .details_submitted,
                ),
            stripe_connection_status:
                account
                    .charges_enabled &&
                account
                    .payouts_enabled
                    ? "ready"
                    : account
                            .details_submitted
                      ? "restricted"
                      : "onboarding",
            stripe_disabled_reason:
                account.requirements
                    ?.disabled_reason ||
                null,
            stripe_requirements_due:
                account.requirements
                    ?.currently_due ||
                [],
            stripe_last_synced_at:
                new Date().toISOString(),
        })
        .eq("id", companyId);
}

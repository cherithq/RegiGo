import {
    NextResponse,
} from "next/server";
import {
    createOnboardingLink,
    refreshStripeCompany,
    requireStripeCompany,
    StripeConnectError,
} from "@/lib/company-stripe-connect";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

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

function handle(
    error: unknown,
) {
    return response(
        {
            error:
                error instanceof
                Error
                    ? error.message
                    : "Unable to configure Stripe.",
        },
        error instanceof
        StripeConnectError
            ? error.status
            : 500,
    );
}

function queryCompanyId(
    request: Request,
) {
    return new URL(
        request.url,
    ).searchParams.get(
        "companyId",
    );
}

export async function GET(
    request: Request,
) {
    try {
        const context =
            await requireStripeCompany(
                queryCompanyId(
                    request,
                ),
            );
        const status =
            await refreshStripeCompany(
                context,
            );

        return response({
            success: true,
            isPlatformAdmin:
                context.actor
                    .isPlatformAdmin,
            usesPlatformStripeAccount:
                context
                    .usesPlatformStripeAccount,
            company: {
                id:
                    context.company.id,
                company_name:
                    context.company
                        .company_name,
                billing_email:
                    context.company
                        .billing_email ||
                    null,
            },
            status,
        });
    } catch (error) {
        return handle(error);
    }
}

export async function POST(
    request: Request,
) {
    try {
        let body: Record<
            string,
            unknown
        > = {};

        try {
            body =
                await request.json();
        } catch {
            body = {};
        }

        const companyId =
            typeof body.companyId ===
            "string"
                ? body.companyId
                : null;
        const context =
            await requireStripeCompany(
                companyId,
            );

        if (
            context
                .usesPlatformStripeAccount
        ) {
            return response({
                success: true,
                url: null,
                message:
                    "The RegiGo platform company already uses the platform Stripe account.",
            });
        }

        const url =
            await createOnboardingLink(
                {
                    request,
                    context,
                },
            );

        return response({
            success: true,
            url,
        });
    } catch (error) {
        return handle(error);
    }
}

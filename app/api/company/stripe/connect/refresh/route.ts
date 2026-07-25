import {
    NextResponse,
} from "next/server";
import {
    createOnboardingLink,
    requireStripeCompany,
} from "@/lib/company-stripe-connect";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";

export async function GET(
    request: Request,
) {
    try {
        const url =
            new URL(request.url);
        const companyId =
            url.searchParams.get(
                "companyId",
            );
        const context =
            await requireStripeCompany(
                companyId,
            );
        const next =
            await createOnboardingLink(
                {
                    request,
                    context,
                },
            );

        return NextResponse.redirect(
            next,
        );
    } catch (error) {
        const target =
            new URL(
                "/dashboard/payment-setup",
                request.url,
            );
        target.searchParams.set(
            "error",
            error instanceof Error
                ? error.message
                : "Unable to refresh Stripe onboarding.",
        );

        return NextResponse.redirect(
            target,
        );
    }
}

import {
    NextResponse,
} from "next/server";
import {
    createStripeDashboardUrl,
    requireStripeCompany,
    StripeConnectError,
} from "@/lib/company-stripe-connect";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";

export async function POST(
    request: Request,
) {
    try {
        const body =
            (await request.json()) as {
                companyId?:
                    | string
                    | null;
            };
        const context =
            await requireStripeCompany(
                body.companyId,
            );
        const url =
            await createStripeDashboardUrl(
                context,
            );

        return NextResponse.json({
            success: true,
            url,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof
                    Error
                        ? error.message
                        : "Unable to open Stripe.",
            },
            {
                status:
                    error instanceof
                    StripeConnectError
                        ? error.status
                        : 500,
            },
        );
    }
}

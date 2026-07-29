import { NextResponse } from "next/server";
import {
    ZoomConnectError,
    requireZoomCompany,
} from "@/lib/company-zoom";
import { verifyZoomCredentials } from "@/lib/zoom";
import {
    decryptZoomSecret,
    encryptZoomSecret,
} from "@/lib/company-zoom-crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function reply(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage the Zoom connection.",
        },
        error instanceof ZoomConnectError
            ? error.status
            : 500,
    );
}

function text(value: unknown, max = 200) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

export async function GET(
    request: Request,
) {
    try {
        const companyId = new URL(
            request.url,
        ).searchParams.get("companyId");
        const { company } =
            await requireZoomCompany(
                companyId,
            );

        return reply({
            success: true,
            companyId: company.id,
            connected:
                company.zoom_connected,
            accountId:
                company.zoom_account_id,
            clientId:
                company.zoom_client_id,
            connectedAt:
                company.zoom_connected_at,
        });
    } catch (error) {
        return fail(error);
    }
}

export async function POST(
    request: Request,
) {
    try {
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const { actor, company } =
            await requireZoomCompany(
                text(body.companyId),
            );

        const accountId = text(
            body.accountId,
            255,
        );
        const clientId = text(
            body.clientId,
            255,
        );
        const clientSecret =
            typeof body.clientSecret ===
            "string"
                ? body.clientSecret.trim()
                : "";

        if (!accountId) {
            throw new ZoomConnectError(
                "Enter your Zoom Account ID.",
            );
        }

        if (!clientId) {
            throw new ZoomConnectError(
                "Enter your Zoom Client ID.",
            );
        }

        let secretToVerify = clientSecret;
        let encryptedSecret: string;

        if (!secretToVerify) {
            if (
                !company.zoom_client_secret_encrypted
            ) {
                throw new ZoomConnectError(
                    "Enter your Zoom Client Secret.",
                );
            }

            encryptedSecret =
                company.zoom_client_secret_encrypted;
            secretToVerify =
                decryptZoomSecret(
                    encryptedSecret,
                );
        } else {
            encryptedSecret =
                encryptZoomSecret(
                    secretToVerify,
                );
        }

        try {
            await verifyZoomCredentials({
                accountId,
                clientId,
                clientSecret:
                    secretToVerify,
            });
        } catch (verifyError) {
            throw new ZoomConnectError(
                verifyError instanceof
                    Error
                    ? verifyError.message
                    : "Could not connect to Zoom with those credentials.",
            );
        }

        const { error } =
            await actor.admin
                .from("companies")
                .update({
                    zoom_account_id:
                        accountId,
                    zoom_client_id:
                        clientId,
                    zoom_client_secret_encrypted:
                        encryptedSecret,
                    zoom_connected: true,
                    zoom_connected_at:
                        new Date().toISOString(),
                })
                .eq(
                    "id",
                    company.id,
                );

        if (error) {
            throw new ZoomConnectError(
                error.message,
            );
        }

        return reply({
            success: true,
            message:
                "Zoom account connected.",
        });
    } catch (error) {
        return fail(error);
    }
}

export async function DELETE(
    request: Request,
) {
    try {
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const { actor, company } =
            await requireZoomCompany(
                text(body.companyId),
            );

        const { error } =
            await actor.admin
                .from("companies")
                .update({
                    zoom_connected: false,
                })
                .eq(
                    "id",
                    company.id,
                );

        if (error) {
            throw new ZoomConnectError(
                error.message,
            );
        }

        return reply({
            success: true,
            message:
                "Zoom account disconnected.",
        });
    } catch (error) {
        return fail(error);
    }
}

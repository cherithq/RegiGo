import "server-only";

import {
    CompanyModuleError,
    getCompanyActor,
    requireCompanyPermission,
} from "@/lib/company-module-server";
import { decryptZoomSecret } from "@/lib/company-zoom-crypto";
import { type ZoomCredentials } from "@/lib/zoom";

export class ZoomConnectError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "ZoomConnectError";
        this.status = status;
    }
}

function cleanCompanyId(
    value?: string | null,
) {
    return value?.trim() || "";
}

type CompanyRow = {
    id: string;
    company_name: string;
    zoom_account_id: string | null;
    zoom_client_id: string | null;
    zoom_client_secret_encrypted:
        | string
        | null;
    zoom_connected: boolean;
    zoom_connected_at: string | null;
};

// Company-scoped access check for anything Zoom-related, mirroring
// lib/company-stripe-connect.ts's requireStripeCompany — company admins
// manage their own company's connection, platform admins can act on any.
export async function requireZoomCompany(
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
            throw new ZoomConnectError(
                "Choose an event company before configuring Zoom.",
            );
        }

        await requireCompanyPermission({
            actor,
            companyId,
            permission: "zoom_setup",
            message:
                "Your Company Admin role does not have access to Zoom Setup.",
        });

        const { data: company, error } =
            await actor.admin
                .from("companies")
                .select(
                    "id, company_name, zoom_account_id, zoom_client_id, zoom_client_secret_encrypted, zoom_connected, zoom_connected_at",
                )
                .eq("id", companyId)
                .maybeSingle();

        if (error) {
            throw new ZoomConnectError(
                error.message,
            );
        }

        if (!company) {
            throw new ZoomConnectError(
                "The event company could not be found.",
                404,
            );
        }

        return {
            actor,
            company:
                company as CompanyRow,
        };
    } catch (error) {
        if (
            error instanceof
            ZoomConnectError
        ) {
            throw error;
        }

        if (
            error instanceof
            CompanyModuleError
        ) {
            throw new ZoomConnectError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

// Resolves a company's decrypted Zoom credentials for use against the Zoom
// API — throws a clear error rather than letting a null client secret reach
// getZoomAccessToken as an empty string.
export function resolveZoomCredentials(
    company: CompanyRow,
): ZoomCredentials {
    if (
        !company.zoom_connected ||
        !company.zoom_account_id ||
        !company.zoom_client_id ||
        !company.zoom_client_secret_encrypted
    ) {
        throw new ZoomConnectError(
            "Connect a Zoom account for this company first (Zoom Setup).",
            400,
        );
    }

    return {
        accountId:
            company.zoom_account_id,
        clientId:
            company.zoom_client_id,
        clientSecret: decryptZoomSecret(
            company
                .zoom_client_secret_encrypted,
        ),
    };
}

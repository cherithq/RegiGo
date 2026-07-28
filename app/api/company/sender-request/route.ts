import { NextResponse } from "next/server";
import {
    CompanyModuleError,
    assertCompanyScope,
    getCompanyActor,
} from "@/lib/company-module-server";
import {
    buildCompanySmtpTransporter,
    type ResolvedCompanySmtp,
} from "@/lib/company-sender";
import {
    decryptSmtpPassword,
    encryptSmtpPassword,
} from "@/lib/company-smtp-crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function reply(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage the custom sender request.",
        },
        error instanceof CompanyModuleError ? error.status : 500,
    );
}

function text(value: unknown, max = 200) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
    try {
        const actor = await getCompanyActor();
        const body = (await request.json()) as Record<string, unknown>;

        const companyId =
            text(body.companyId) ||
            (actor.isPlatformAdmin ? "" : actor.profile.company_id || "");

        if (!companyId) {
            throw new CompanyModuleError("Choose a company.");
        }

        assertCompanyScope({ actor, companyId });

        const smtpHost = text(body.smtpHost, 255);
        const smtpUsername = text(body.smtpUsername, 255);
        const smtpPassword =
            typeof body.smtpPassword === "string"
                ? body.smtpPassword.trim()
                : "";
        const smtpFromAddress = text(body.smtpFromAddress, 320).toLowerCase();
        const smtpPort = Number(body.smtpPort);
        const smtpSecure = Boolean(body.smtpSecure);

        if (!smtpHost) {
            throw new CompanyModuleError("Enter your SMTP server host.");
        }

        if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
            throw new CompanyModuleError(
                "Enter a valid SMTP port (1-65535).",
            );
        }

        if (!smtpUsername) {
            throw new CompanyModuleError("Enter your SMTP username.");
        }

        if (!isValidEmail(smtpFromAddress)) {
            throw new CompanyModuleError(
                "Enter a valid from-address on your own domain.",
            );
        }

        let passwordToVerify = smtpPassword;
        let encryptedPassword: string;

        if (!passwordToVerify) {
            const { data: existing } = await actor.admin
                .from("companies")
                .select("custom_smtp_password_encrypted")
                .eq("id", companyId)
                .maybeSingle();

            if (!existing?.custom_smtp_password_encrypted) {
                throw new CompanyModuleError("Enter your SMTP password.");
            }

            encryptedPassword = existing.custom_smtp_password_encrypted;
            passwordToVerify = decryptSmtpPassword(encryptedPassword);
        } else {
            encryptedPassword = encryptSmtpPassword(passwordToVerify);
        }

        const smtpConfig: ResolvedCompanySmtp = {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            username: smtpUsername,
            password: passwordToVerify,
            fromAddress: smtpFromAddress,
        };

        try {
            const transporter = buildCompanySmtpTransporter(smtpConfig);
            await transporter.verify();
        } catch (verifyError) {
            throw new CompanyModuleError(
                `Could not connect to that SMTP server: ${
                    verifyError instanceof Error
                        ? verifyError.message
                        : "Unknown error"
                }`,
            );
        }

        const { error } = await actor.admin
            .from("companies")
            .update({
                custom_sender_status: "pending",
                custom_sender_requested_at: new Date().toISOString(),
                custom_sender_reviewed_at: null,
                custom_sender_review_note: null,
                custom_smtp_host: smtpHost,
                custom_smtp_port: smtpPort,
                custom_smtp_secure: smtpSecure,
                custom_smtp_username: smtpUsername,
                custom_smtp_password_encrypted: encryptedPassword,
                custom_smtp_from_address: smtpFromAddress,
            })
            .eq("id", companyId);

        if (error) {
            throw new CompanyModuleError(error.message);
        }

        return reply({
            success: true,
            message:
                "Custom domain sending request submitted and verified. A RegiGo admin will review it shortly.",
        });
    } catch (error) {
        return fail(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const actor = await getCompanyActor();

        if (!actor.isPlatformAdmin) {
            throw new CompanyModuleError(
                "Only the platform super admin can review custom sender requests.",
                403,
            );
        }

        const body = (await request.json()) as Record<string, unknown>;
        const companyId = text(body.companyId);
        const action = text(body.action);

        if (!companyId) {
            throw new CompanyModuleError("Choose a company.");
        }

        if (action !== "approve" && action !== "reject") {
            throw new CompanyModuleError("Choose a valid review action.");
        }

        const reviewNote = text(body.reviewNote, 500);

        if (action === "approve") {
            const { data: company } = await actor.admin
                .from("companies")
                .select(
                    "custom_smtp_host, custom_smtp_port, custom_smtp_secure, custom_smtp_username, custom_smtp_password_encrypted, custom_smtp_from_address",
                )
                .eq("id", companyId)
                .maybeSingle();

            if (!company?.custom_smtp_host) {
                throw new CompanyModuleError(
                    "This company has not submitted SMTP details to approve.",
                );
            }

            try {
                const transporter = buildCompanySmtpTransporter({
                    host: company.custom_smtp_host,
                    port: Number(company.custom_smtp_port),
                    secure: Boolean(company.custom_smtp_secure),
                    username: company.custom_smtp_username || "",
                    password: decryptSmtpPassword(
                        company.custom_smtp_password_encrypted || "",
                    ),
                    fromAddress: company.custom_smtp_from_address || "",
                });
                await transporter.verify();
            } catch (verifyError) {
                throw new CompanyModuleError(
                    `Could not verify this company's SMTP server before approving: ${
                        verifyError instanceof Error
                            ? verifyError.message
                            : "Unknown error"
                    }`,
                );
            }
        }

        const { error } = await actor.admin
            .from("companies")
            .update({
                custom_sender_status:
                    action === "approve" ? "approved" : "rejected",
                custom_sender_reviewed_at: new Date().toISOString(),
                custom_sender_review_note: reviewNote || null,
            })
            .eq("id", companyId);

        if (error) {
            throw new CompanyModuleError(error.message);
        }

        return reply({
            success: true,
            message:
                action === "approve"
                    ? "Custom domain sending approved. Future emails for this company will send from their own domain."
                    : "Custom sender request rejected.",
        });
    } catch (error) {
        return fail(error);
    }
}

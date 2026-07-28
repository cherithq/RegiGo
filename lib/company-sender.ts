import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { decryptSmtpPassword } from "@/lib/company-smtp-crypto";

export type ResolvedCompanySmtp = {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
};

export type ResolvedCompanySender = {
    fromName: string;
    smtp: ResolvedCompanySmtp | null;
};

export async function resolveCompanySender({
    admin,
    companyId,
    defaultFromName,
}: {
    admin: SupabaseClient;
    companyId: string | null | undefined;
    defaultFromName: string;
}): Promise<ResolvedCompanySender> {
    if (!companyId) {
        return {
            fromName: defaultFromName,
            smtp: null,
        };
    }

    const { data: company } = await admin
        .from("companies")
        .select(
            "company_name, custom_sender_status, custom_smtp_host, custom_smtp_port, custom_smtp_secure, custom_smtp_username, custom_smtp_password_encrypted, custom_smtp_from_address",
        )
        .eq("id", companyId)
        .maybeSingle();

    if (
        company?.custom_sender_status !== "approved" ||
        !company.custom_smtp_host ||
        !company.custom_smtp_port ||
        !company.custom_smtp_username ||
        !company.custom_smtp_password_encrypted ||
        !company.custom_smtp_from_address
    ) {
        return {
            fromName: defaultFromName,
            smtp: null,
        };
    }

    try {
        return {
            fromName: company.company_name || defaultFromName,
            smtp: {
                host: company.custom_smtp_host,
                port: Number(company.custom_smtp_port),
                secure: Boolean(company.custom_smtp_secure),
                username: company.custom_smtp_username,
                password: decryptSmtpPassword(
                    company.custom_smtp_password_encrypted,
                ),
                fromAddress: company.custom_smtp_from_address,
            },
        };
    } catch {
        return {
            fromName: defaultFromName,
            smtp: null,
        };
    }
}

export function buildCompanySmtpTransporter(smtp: ResolvedCompanySmtp) {
    return nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.username,
            pass: smtp.password,
        },
    });
}

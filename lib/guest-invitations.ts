import "server-only";

import {
    createHash,
    randomBytes,
} from "node:crypto";
import nodemailer from "nodemailer";
import {
    createClient,
} from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type InvitationStatus =
    | "pending"
    | "opened"
    | "accepted"
    | "declined"
    | "cancelled"
    | "expired";

export class InvitationError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "InvitationError";
        this.status = status;
    }
}

export function getSupabaseAdminClient() {
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new InvitationError(
            "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.",
            500,
        );
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}

export function createInvitationToken() {
    return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export function getSiteUrl() {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

export function formatEventDate(
    value: string | null | undefined,
) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

export function formatEventTime(
    value: string | null | undefined,
) {
    if (!value) return "-";

    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("en-SG", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(parsed);
    }

    return value;
}

export function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function plainTextToHtml(value: string) {
    return escapeHtml(value)
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br />");
}

export function replaceTemplateVariables(
    template: string,
    values: Record<string, string>,
) {
    let result = template;

    for (const [key, value] of Object.entries(values)) {
        result = result.replace(
            new RegExp(
                `{{\\s*${key}\\s*}}`,
                "gi",
            ),
            value,
        );
    }

    return result;
}

export function buildInvitationEmailHtml({
    eventName,
    body,
    inviteUrl,
    primaryColor = "#4F46E5",
    secondaryColor = "#EC4899",
}: {
    eventName: string;
    body: string;
    inviteUrl: string;
    primaryColor?: string;
    secondaryColor?: string;
}) {
    return `
        <!doctype html>
        <html>
            <body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
                    <div style="overflow:hidden;border-radius:28px;background:white;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
                        <div style="padding:30px;background:linear-gradient(135deg,${escapeHtml(primaryColor)},${escapeHtml(secondaryColor)});color:white;">
                            <p style="margin:0;font-size:13px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;">
                                RegiGo Invitation
                            </p>
                            <h1 style="margin:12px 0 0;font-size:30px;line-height:1.2;">
                                ${escapeHtml(eventName)}
                            </h1>
                        </div>

                        <div style="padding:32px;font-size:15px;line-height:1.75;color:#334155;">
                            <div>
                                ${plainTextToHtml(body)}
                            </div>

                            <div style="margin-top:28px;text-align:center;">
                                <a
                                    href="${escapeHtml(inviteUrl)}"
                                    style="display:inline-block;border-radius:14px;background:${escapeHtml(primaryColor)};padding:15px 24px;color:white;text-decoration:none;font-weight:900;"
                                >
                                    Respond to Invitation
                                </a>
                            </div>

                            <p style="margin:24px 0 0;font-size:12px;color:#64748B;word-break:break-all;">
                                If the button does not work, open:<br />
                                ${escapeHtml(inviteUrl)}
                            </p>
                        </div>

                        <div style="padding:20px 32px;background:#F8FAFC;font-size:12px;color:#64748B;">
                            This invitation was sent through RegiGo.
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;
}

export function createSmtpTransport() {
    const user =
        process.env.EVENT_SMTP_USER ||
        process.env.GMAIL_SMTP_USER ||
        process.env.SMTP_USER;

    const pass =
        process.env.EVENT_SMTP_APP_PASSWORD ||
        process.env.GMAIL_SMTP_APP_PASSWORD ||
        process.env.SMTP_PASS;

    if (!user || !pass) {
        throw new InvitationError(
            "SMTP is not configured. Set EVENT_SMTP_USER and EVENT_SMTP_APP_PASSWORD.",
            500,
        );
    }

    const host =
        process.env.EVENT_SMTP_HOST ||
        process.env.SMTP_HOST ||
        "smtp.gmail.com";

    const port = Number(
        process.env.EVENT_SMTP_PORT ||
        process.env.SMTP_PORT ||
        587,
    );

    return {
        transporter: nodemailer.createTransport({
            host,
            port,
            secure:
                process.env.SMTP_SECURE === "true" ||
                port === 465,
            auth: {
                user,
                pass,
            },
        }),
        fromAddress:
            process.env.EMAIL_FROM_ADDRESS || user,
        fromName:
            process.env.EVENT_EMAIL_FROM_NAME ||
            process.env.EMAIL_FROM_NAME ||
            "RegiGo",
    };
}

export async function requireInvitationManager(
    eventId: string,
) {
    const supabaseServer =
        await createSupabaseServerClient();

    const {
        data: {
            user,
        },
        error: authError,
    } =
        await supabaseServer.auth.getUser();

    if (
        authError ||
        !user
    ) {
        throw new InvitationError(
            "You must be logged in.",
            401,
        );
    }

    const admin =
        getSupabaseAdminClient();

    const {
        data: event,
        error: eventError,
    } = await admin
        .from("events")
        .select(
            "id, company_id, event_name, event_slug, event_date, event_time, venue, rsvp_deadline, allow_rsvp_changes",
        )
        .eq("id", eventId)
        .maybeSingle();

    if (eventError) {
        throw new InvitationError(
            eventError.message,
        );
    }

    if (!event) {
        throw new InvitationError(
            "The event could not be found.",
            404,
        );
    }

    let profile:
        | Record<
              string,
              unknown
          >
        | null = null;

    const profileWithPlatform =
        await admin
            .from("profiles")
            .select(
                "id, role, platform_role, company_id, full_name, email",
            )
            .eq("id", user.id)
            .maybeSingle();

    if (
        profileWithPlatform.error &&
        String(
            profileWithPlatform
                .error
                .code ||
                "",
        ) === "42703"
    ) {
        const fallback =
            await admin
                .from("profiles")
                .select(
                    "id, role, company_id, full_name, email",
                )
                .eq("id", user.id)
                .maybeSingle();

        if (fallback.error) {
            throw new InvitationError(
                fallback.error
                    .message,
            );
        }

        profile =
            fallback.data;
    } else if (
        profileWithPlatform.error
    ) {
        throw new InvitationError(
            profileWithPlatform
                .error
                .message,
        );
    } else {
        profile =
            profileWithPlatform.data;
    }

    const normalizeRole = (
        value: unknown,
    ) =>
        String(value || "")
            .trim()
            .toLowerCase();

    const platformRole =
        normalizeRole(
            profile
                ?.platform_role,
        );
    const profileRole =
        normalizeRole(
            profile?.role,
        );
    const eventCompanyId =
        String(
            event.company_id ||
                "",
        );
    const profileCompanyId =
        String(
            profile
                ?.company_id ||
                "",
        );

    const isPlatformAdmin =
        [
            "super_admin",
            "super-admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            platformRole,
        );

    let membership:
        | Record<
              string,
              unknown
          >
        | null = null;

    if (eventCompanyId) {
        const membershipResult =
            await admin
                .from(
                    "company_members",
                )
                .select(
                    "company_id, company_role, status",
                )
                .eq(
                    "user_id",
                    user.id,
                )
                .eq(
                    "company_id",
                    eventCompanyId,
                )
                .maybeSingle();

        if (
            membershipResult.error &&
            ![
                "42P01",
                "42703",
                "PGRST200",
                "PGRST204",
                "PGRST205",
            ].includes(
                String(
                    membershipResult
                        .error
                        .code ||
                        "",
                ),
            )
        ) {
            throw new InvitationError(
                membershipResult
                    .error
                    .message,
            );
        }

        membership =
            membershipResult.data;
    }

    const membershipRole =
        normalizeRole(
            membership
                ?.company_role,
        );
    const membershipStatus =
        normalizeRole(
            membership
                ?.status ||
                "active",
        );

    const sameCompany =
        eventCompanyId.length >
            0 &&
        (
            profileCompanyId ===
                eventCompanyId ||
            String(
                membership
                    ?.company_id ||
                    "",
            ) ===
                eventCompanyId
        );

    const isCompanyAdmin =
        sameCompany &&
        (
            [
                "admin",
                "administrator",
                "company_admin",
                "company-admin",
                "owner",
            ].includes(
                profileRole,
            ) ||
            [
                "admin",
                "administrator",
                "company_admin",
                "company-admin",
                "owner",
            ].includes(
                membershipRole,
            )
        ) &&
        membershipStatus !==
            "inactive" &&
        membershipStatus !==
            "suspended";

    const isOrganizer =
        sameCompany &&
        (
            [
                "organizer",
                "organiser",
                "manager",
                "event_manager",
                "event-manager",
            ].includes(
                profileRole,
            ) ||
            [
                "organizer",
                "organiser",
                "manager",
                "event_manager",
                "event-manager",
            ].includes(
                membershipRole,
            )
        ) &&
        membershipStatus !==
            "inactive" &&
        membershipStatus !==
            "suspended";

    let assigned =
        false;

    if (isOrganizer) {
        const assignmentResult =
            await admin
                .from(
                    "event_members",
                )
                .select(
                    "event_id",
                )
                .eq(
                    "event_id",
                    eventId,
                )
                .eq(
                    "profile_id",
                    user.id,
                )
                .maybeSingle();

        if (
            assignmentResult.error &&
            ![
                "42P01",
                "42703",
                "PGRST200",
                "PGRST204",
                "PGRST205",
            ].includes(
                String(
                    assignmentResult
                        .error
                        .code ||
                        "",
                ),
            )
        ) {
            throw new InvitationError(
                assignmentResult
                    .error
                    .message,
            );
        }

        assigned =
            Boolean(
                assignmentResult.data,
            );
    }

    if (
        !isPlatformAdmin &&
        !isCompanyAdmin &&
        !(
            isOrganizer &&
            assigned
        )
    ) {
        throw new InvitationError(
            "You do not have permission to manage invitations for this event.",
            403,
        );
    }

    return {
        userId:
            user.id,
        profile,
        event,
        admin,
        isPlatformAdmin,
        isCompanyAdmin,
        isOrganizer,
    };
}

export async function getPublicInvitation({
    slug,
    token,
    markOpened = false,
}: {
    slug: string;
    token: string;
    markOpened?: boolean;
}) {
    const admin = getSupabaseAdminClient();
    const tokenHash = hashInvitationToken(token);

    const { data: invitation, error } = await admin
        .from("event_invitations")
        .select(
            "id, event_id, registration_id, status, sent_at, opened_at, responded_at, expires_at, decline_reason, events!inner(id, company_id, event_name, event_slug, event_date, event_time, venue, rsvp_deadline, allow_rsvp_changes, event_branding(*)), registrations!inner(id, full_name, email, rsvp_status)",
        )
        .eq("token_hash", tokenHash)
        .eq("events.event_slug", slug)
        .maybeSingle();

    if (error) {
        throw new InvitationError(
            error.message,
            400,
        );
    }

    if (!invitation) {
        throw new InvitationError(
            "This invitation link is invalid or has been replaced.",
            404,
        );
    }

    const expired =
        invitation.expires_at &&
        new Date(invitation.expires_at).getTime() <
            Date.now();

    if (
        expired &&
        invitation.status !== "accepted" &&
        invitation.status !== "declined"
    ) {
        await admin
            .from("event_invitations")
            .update({
                status: "expired",
            })
            .eq("id", invitation.id);

        invitation.status = "expired";
    }

    if (
        markOpened &&
        invitation.status === "pending"
    ) {
        const openedAt = new Date().toISOString();

        await admin
            .from("event_invitations")
            .update({
                status: "opened",
                opened_at: openedAt,
            })
            .eq("id", invitation.id);

        invitation.status = "opened";
        invitation.opened_at = openedAt;
    }

    return {
        admin,
        invitation,
    };
}

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmailType = "confirmation" | "reminder" | "update" | "thank_you";

type Registration = {
    id: string;
    event_id: string;
    full_name: string | null;
    email: string | null;
    phone?: string | null;
    department?: string | null;
    registration_status?: string | null;
    ticket_type_id?: string | null;
    custom_answers?: Record<string, unknown> | null;
};

type EventRecord = {
    id: string;
    event_name?: string | null;
    title?: string | null;
    name?: string | null;
    slug?: string | null;
    event_date?: string | null;
    event_time?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
    location?: string | null;
};

type EmailTemplate = {
    id?: string;
    event_id?: string;
    email_type?: string;
    subject?: string | null;
    body?: string | null;
    body_html?: string | null;
    content?: string | null;
};

type QrTicket = {
    id: string;
    registration_id: string;
    event_id: string;
    qr_token: string | null;
    qr_code_url?: string | null;
    is_active?: boolean | null;
};

function normaliseEmailType(type: string): EmailType {
    if (type === "event_update") return "update";
    if (type === "thankyou") return "thank_you";
    if (type === "thank-you") return "thank_you";

    if (
        type === "confirmation" ||
        type === "reminder" ||
        type === "update" ||
        type === "thank_you"
    ) {
        return type;
    }

    return "confirmation";
}

function getEventName(event: EventRecord) {
    return event.event_name || event.title || event.name || "Event";
}

function getSiteUrl() {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");
}

function formatDate(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatTime(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString("en-SG", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function plainTextToHtml(value: string) {
    return escapeHtml(value)
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br />");
}

function replaceVariables(
    template: string,
    variables: Record<string, string>
) {
    let output = template;

    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
        output = output.replace(regex, value || "");
    }

    return output;
}

function getDefaultSubject(emailType: EmailType, eventName: string) {
    if (emailType === "confirmation") {
        return `Registration confirmed: ${eventName}`;
    }

    if (emailType === "reminder") {
        return `Reminder: ${eventName}`;
    }

    if (emailType === "update") {
        return `Update: ${eventName}`;
    }

    return `Thank you for attending ${eventName}`;
}

function getDefaultBody(emailType: EmailType) {
    if (emailType === "confirmation") {
        return `Dear {{name}},

Thank you for registering for {{event_name}}.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

{{qr_code}}

Please show your QR code during check-in.

Regards,
RegiGo`;
    }

    if (emailType === "reminder") {
        return `Dear {{name}},

This is a reminder that {{event_name}} is coming soon.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Please bring your QR pass from your confirmation email.

Regards,
RegiGo`;
    }

    if (emailType === "update") {
        return `Dear {{name}},

There is an update for {{event_name}}.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Regards,
RegiGo`;
    }

    return `Dear {{name}},

Thank you for attending {{event_name}}.

We hope you enjoyed the event.

Regards,
RegiGo`;
}

function buildPassUrl(event: EventRecord, registrationId: string) {
    const siteUrl = getSiteUrl();
    const slug = event.slug || event.id;

    return `${siteUrl}/event/${slug}/pass?registration=${registrationId}`;
}

function buildQrHtml(qrCid: string, passUrl: string) {
    return `
        <div style="margin:24px 0;padding:20px;border-radius:20px;background:#F7F5FF;text-align:center;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:#4F46E5;">
                Your QR Pass
            </p>
            <img src="cid:${qrCid}" alt="QR Code" style="width:180px;height:180px;border-radius:16px;background:white;padding:12px;" />
            <p style="margin:14px 0 0;font-size:12px;color:#64748B;">
                Show this QR code during check-in.
            </p>
            <p style="margin:10px 0 0;font-size:12px;">
                <a href="${passUrl}" style="color:#4F46E5;font-weight:800;text-decoration:none;">
                    Open QR Pass
                </a>
            </p>
        </div>
    `;
}

function buildEmailHtml({
    bodyHtml,
    eventName,
}: {
    bodyHtml: string;
    eventName: string;
}) {
    return `
        <!doctype html>
        <html>
            <body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
                    <div style="background:white;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
                        <div style="padding:28px;background:linear-gradient(135deg,#4F46E5,#EC4899);color:white;">
                            <p style="margin:0;font-size:13px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;">
                                RegiGo
                            </p>
                            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">
                                ${escapeHtml(eventName)}
                            </h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">
                                Register. Manage. Go.
                            </p>
                        </div>

                        <div style="padding:30px;font-size:15px;line-height:1.7;color:#334155;">
                            <p>${bodyHtml}</p>
                        </div>

                        <div style="padding:22px 30px;background:#F8FAFC;font-size:12px;color:#64748B;">
                            This email was sent by RegiGo.
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;
}

async function getOrCreateQrTicket({
    supabaseServer,
    eventId,
    registrationId,
}: {
    supabaseServer: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    eventId: string;
    registrationId: string;
}) {
    const { data: existingTicket, error: existingError } = await supabaseServer
        .from("qr_tickets")
        .select("*")
        .eq("event_id", eventId)
        .eq("registration_id", registrationId)
        .maybeSingle();

    if (existingError) {
        throw new Error(existingError.message);
    }

    if (existingTicket) {
        return existingTicket as QrTicket;
    }

    const token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${registrationId}-${Date.now()}`;

    const { data: newTicket, error: insertError } = await supabaseServer
        .from("qr_tickets")
        .insert({
            event_id: eventId,
            registration_id: registrationId,
            qr_token: token,
            is_active: true,
        })
        .select("*")
        .single();

    if (insertError) {
        throw new Error(insertError.message);
    }

    return newTicket as QrTicket;
}

async function getRegistrations({
    supabaseServer,
    eventId,
    registrationId,
    registrationIds,
    checkedInOnly,
}: {
    supabaseServer: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    eventId: string;
    registrationId?: string;
    registrationIds?: string[];
    checkedInOnly?: boolean;
}) {
    let query = supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId);

    if (registrationId) {
        query = query.eq("id", registrationId);
    }

    if (registrationIds && registrationIds.length > 0) {
        query = query.in("id", registrationIds);
    }

    if (checkedInOnly) {
        query = query.in("registration_status", ["checked_in", "attended"]);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return (data || []) as Registration[];
}

async function getTemplate({
    supabaseServer,
    eventId,
    emailType,
}: {
    supabaseServer: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    eventId: string;
    emailType: EmailType;
}) {
    const { data, error } = await supabaseServer
        .from("email_templates")
        .select("*")
        .eq("event_id", eventId)
        .eq("email_type", emailType)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data as EmailTemplate | null;
}

export async function POST(request: Request) {
    try {
        await requirePermission("can_manage_guests");

        const body = await request.json();

        const eventId = body.eventId || body.event_id;
        const registrationId = body.registrationId || body.registration_id;
        const registrationIds = body.registrationIds || body.registration_ids;
        const checkedInOnly = Boolean(body.checkedInOnly || body.checked_in_only);
        const emailType = normaliseEmailType(body.type || body.emailType || "confirmation");

        if (!eventId) {
            return NextResponse.json(
                { error: "Missing eventId." },
                { status: 400 }
            );
        }

        const supabaseServer = await createSupabaseServerClient();

        const { data: event, error: eventError } = await supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json(
                { error: eventError?.message || "Event not found." },
                { status: 404 }
            );
        }

        const eventRecord = event as EventRecord;
        const eventName = getEventName(eventRecord);

        const registrations = await getRegistrations({
            supabaseServer,
            eventId,
            registrationId,
            registrationIds,
            checkedInOnly,
        });

        const validRegistrations = registrations.filter(
            (registration) => registration.email
        );

        if (validRegistrations.length === 0) {
            return NextResponse.json(
                { error: "No guests with email found." },
                { status: 400 }
            );
        }

        const template = await getTemplate({
            supabaseServer,
            eventId,
            emailType,
        });

        const subjectTemplate =
            template?.subject || getDefaultSubject(emailType, eventName);

        const rawBodyTemplate =
            template?.body ||
            template?.body_html ||
            template?.content ||
            getDefaultBody(emailType);

        const smtpUser =
            process.env.EVENT_SMTP_USER ||
            process.env.GMAIL_SMTP_USER ||
            process.env.SMTP_USER;

        const smtpPass =
            process.env.EVENT_SMTP_APP_PASSWORD ||
            process.env.GMAIL_SMTP_APP_PASSWORD ||
            process.env.SMTP_PASS;

        const smtpHost =
            process.env.SMTP_HOST ||
            process.env.EVENT_SMTP_HOST ||
            "smtp.gmail.com";

        const smtpPort = Number(
            process.env.SMTP_PORT || process.env.EVENT_SMTP_PORT || 587
        );

        const smtpSecure =
            process.env.SMTP_SECURE === "true" || smtpPort === 465;

        const fromName =
            process.env.EVENT_EMAIL_FROM_NAME ||
            process.env.EMAIL_FROM_NAME ||
            "RegiGo";

        if (!smtpUser || !smtpPass) {
            return NextResponse.json(
                {
                    error:
                        "SMTP is not configured. Please set EVENT_SMTP_USER and EVENT_SMTP_APP_PASSWORD.",
                },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        const results: {
            registrationId: string;
            email: string;
            status: "sent" | "failed";
            error?: string;
        }[] = [];

        for (const registration of validRegistrations) {
            try {
                const passUrl = buildPassUrl(eventRecord, registration.id);

                let qrHtml = "";
                let qrAttachment:
                    | {
                          filename: string;
                          content: Buffer;
                          cid: string;
                      }
                    | undefined;

                if (emailType === "confirmation") {
                    await getOrCreateQrTicket({
                        supabaseServer,
                        eventId,
                        registrationId: registration.id,
                    });

                    const qrCid = `qr-${registration.id}@regigo`;
                    const qrBuffer = await QRCode.toBuffer(passUrl, {
                        type: "png",
                        width: 320,
                        margin: 1,
                    });

                    qrHtml = buildQrHtml(qrCid, passUrl);

                    qrAttachment = {
                        filename: `qr-pass-${registration.id}.png`,
                        content: qrBuffer,
                        cid: qrCid,
                    };
                }

                const variables: Record<string, string> = {
                    name: registration.full_name || "Guest",
                    full_name: registration.full_name || "Guest",
                    email: registration.email || "",
                    event_name: eventName,
                    event_date:
                        formatDate(eventRecord.event_date) ||
                        formatDate(eventRecord.start_time),
                    event_time:
                        eventRecord.event_time ||
                        formatTime(eventRecord.start_time),
                    venue: eventRecord.venue || eventRecord.location || "",
                    location: eventRecord.location || eventRecord.venue || "",
                    company: "RegiGo",
                    qr_code: qrHtml,
                    qr_image: qrHtml,
                    qr_link: passUrl,
                    pass_url: passUrl,
                };

                const subject = replaceVariables(subjectTemplate, variables);

                let bodyContent = replaceVariables(rawBodyTemplate, variables);

                if (
                    emailType === "confirmation" &&
                    !bodyContent.includes(qrHtml) &&
                    !rawBodyTemplate.includes("{{qr_code}}") &&
                    !rawBodyTemplate.includes("{{ qr_code }}")
                ) {
                    bodyContent += `\n\n${qrHtml}`;
                }

                const bodyHtml = bodyContent.includes("<")
                    ? bodyContent
                    : plainTextToHtml(bodyContent);

                const html = buildEmailHtml({
                    bodyHtml,
                    eventName,
                });

                await transporter.sendMail({
                    from: `"${fromName}" <${smtpUser}>`,
                    to: registration.email!,
                    subject,
                    html,
                    attachments: qrAttachment ? [qrAttachment] : [],
                });

                results.push({
                    registrationId: registration.id,
                    email: registration.email!,
                    status: "sent",
                });
            } catch (error: any) {
                results.push({
                    registrationId: registration.id,
                    email: registration.email || "",
                    status: "failed",
                    error: error?.message || "Failed to send email.",
                });
            }
        }

        const sent = results.filter((result) => result.status === "sent").length;
        const failed = results.filter((result) => result.status === "failed").length;

        return NextResponse.json({
            success: failed === 0,
            message:
                failed === 0
                    ? `${sent} email${sent === 1 ? "" : "s"} sent.`
                    : `${sent} sent, ${failed} failed.`,
            sent,
            failed,
            results,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error:
                    error?.message ||
                    "Failed to send templated email. Please try again.",
            },
            { status: 500 }
        );
    }
}
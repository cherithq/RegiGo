import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type EmailType = "confirmation" | "reminder" | "update" | "thank_you";

function clean(value: unknown) {
    return String(value || "").trim();
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function mapEmailType(type: string): EmailType {
    if (type === "event_update") return "update";
    if (type === "update") return "update";
    if (type === "thank_you") return "thank_you";
    if (type === "reminder") return "reminder";
    return "confirmation";
}

function getSiteUrl() {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
    ).replace(/\/$/, "");
}

function getGuestEmail(guest: any) {
    return clean(
        guest.email ||
        guest.custom_answers?.email ||
        guest.custom_answers?.Email ||
        guest.custom_answers?.["Email Address"]
    );
}

function getGuestName(guest: any) {
    return clean(
        guest.full_name ||
        guest.custom_answers?.full_name ||
        guest.custom_answers?.name ||
        getGuestEmail(guest) ||
        "Guest"
    );
}

function getQrToken(guest: any) {
    return clean(
        guest.__qr_ticket?.qr_token ||
        guest.qr_token ||
        guest.qr_code ||
        guest.qr_code_url
    );
}

function getPassUrl(guest: any) {
    return `${getSiteUrl()}/pass?registration=${guest.id}`;
}

function getQrValue(guest: any) {
    const qrToken = getQrToken(guest);
    return qrToken || getPassUrl(guest);
}

function shouldIncludeQr(emailType: EmailType, rawBody: string) {
    const bodyHasQr =
        rawBody.includes("{{qr_code}}") ||
        rawBody.includes("{{qr_image}}");

    if (emailType === "thank_you") {
        return false;
    }

    if (emailType === "confirmation") {
        return true;
    }

    return bodyHasQr;
}

function isCheckedIn(guest: any) {
    const ticket = guest.__qr_ticket || {};

    return Boolean(
        guest.registration_status === "checked_in" ||
        guest.registration_status === "attended" ||
        ticket.is_active === false
    );
}

function getEventDetails(event: any) {
    return {
        eventName: clean(event.event_name || event.title || event.name || "Event"),
        eventDate: clean(event.event_date || event.date || event.start_date || "-"),
        eventTime: clean(event.event_time || event.time || event.start_time || "-"),
        venue: clean(event.venue || event.location || "-"),
    };
}

function replaceVariables(text: string, event: any, guest: any) {
    const { eventName, eventDate, eventTime, venue } = getEventDetails(event);

    const table = clean(
        guest.table_name ||
        guest.table_number ||
        guest.table_no ||
        guest.custom_answers?.table ||
        guest.custom_answers?.Table ||
        "-"
    );

    const qrValue = getQrValue(guest);
    const passUrl = getPassUrl(guest);

    return text
        .replaceAll("{{name}}", getGuestName(guest))
        .replaceAll("{{full_name}}", getGuestName(guest))
        .replaceAll("{{email}}", getGuestEmail(guest))
        .replaceAll("{{event_name}}", eventName)
        .replaceAll("{{event_date}}", eventDate)
        .replaceAll("{{event_time}}", eventTime)
        .replaceAll("{{venue}}", venue)
        .replaceAll("{{table}}", table)
        .replaceAll("{{company}}", "RegiGo")
        .replaceAll("{{qr_code}}", qrValue)
        .replaceAll("{{qr_image}}", qrValue)
        .replaceAll("{{qr_link}}", passUrl)
        .replaceAll("{{pass_url}}", passUrl);
}

function renderQrBlock(guest: any, qrCid: string) {
    const passUrl = getPassUrl(guest);

    return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0; page-break-inside:avoid; break-inside:avoid;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:300px; width:100%; background:#f8fafc; border:1px solid #e2e8f0; border-radius:18px; page-break-inside:avoid; break-inside:avoid;">
                        <tr>
                            <td align="center" style="padding:18px;">
                                <div style="font-family:Arial, sans-serif; font-size:13px; font-weight:800; color:#64748b; margin-bottom:10px;">
                                    Your QR Code
                                </div>

                                <img
                                    src="cid:${qrCid}"
                                    alt="QR Code"
                                    width="180"
                                    height="180"
                                    style="display:block; width:180px; height:180px; max-width:180px; border:1px solid #e2e8f0; border-radius:14px; background:#ffffff; padding:8px;"
                                />

                                <div style="font-family:Arial, sans-serif; font-size:12px; line-height:18px; color:#64748b; margin-top:12px;">
                                    Please show this QR code during check-in.
                                </div>

                                <a
                                    href="${escapeHtml(passUrl)}"
                                    style="display:inline-block; margin-top:12px; padding:10px 16px; border-radius:999px; background:#4F46E5; color:#ffffff; text-decoration:none; font-family:Arial, sans-serif; font-size:12px; font-weight:800;"
                                >
                                    Open QR Pass
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
}

function renderBodyHtml(
    rawBody: string,
    event: any,
    guest: any,
    qrCid: string,
    emailType: EmailType
) {
    const includeQr = shouldIncludeQr(emailType, rawBody);
    const hasQrVariable =
        rawBody.includes("{{qr_code}}") || rawBody.includes("{{qr_image}}");

    let html = rawBody
        .split(/\r?\n/)
        .map((line) => {
            if (line.includes("{{qr_code}}") || line.includes("{{qr_image}}")) {
                if (!includeQr) return "";
                return renderQrBlock(guest, qrCid);
            }

            const renderedLine = replaceVariables(line, event, guest);

            if (!renderedLine.trim()) {
                return `<div style="height:10px; line-height:10px;">&nbsp;</div>`;
            }

            return `
                <div style="font-family:Arial, sans-serif; font-size:14px; line-height:22px; color:#0f172a; margin:0 0 7px; word-break:break-word;">
                    ${escapeHtml(renderedLine)}
                </div>
            `;
        })
        .join("");

    if (emailType === "confirmation" && includeQr && !hasQrVariable) {
        html += renderQrBlock(guest, qrCid);
    }

    return html;
}

function toHtml(
    rawBody: string,
    event: any,
    guest: any,
    qrCid: string,
    emailType: EmailType
) {
    return `
        <!doctype html>
        <html>
            <body style="margin:0; padding:0; background:#f8fafc;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f8fafc;">
                    <tr>
                        <td align="center" style="padding:12px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:540px; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; page-break-inside:avoid; break-inside:avoid;">
                                <tr>
                                    <td style="padding:22px 22px; background:#4F46E5; border-radius:18px 18px 0 0;">
                                        <div style="font-family:Arial, sans-serif; color:#ffffff; font-size:26px; font-weight:900; letter-spacing:-0.5px;">
                                            RegiGo
                                        </div>
                                        <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.9); font-size:13px; font-weight:700; margin-top:5px;">
                                            Register. Manage. Go.
                                        </div>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:22px; font-family:Arial, sans-serif;">
                                        ${renderBodyHtml(rawBody, event, guest, qrCid, emailType)}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;
}

async function sendEmail({
    to,
    subject,
    textBody,
    htmlBody,
    qrBuffer,
    qrCid,
    includeQr,
}: {
    to: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    qrBuffer?: Buffer;
    qrCid: string;
    includeQr: boolean;
}) {
    const smtpUser = process.env.EVENT_SMTP_USER;
    const smtpPassword = process.env.EVENT_SMTP_APP_PASSWORD;
    const fromName = process.env.EVENT_EMAIL_FROM_NAME || "RegiGo";

    if (!smtpUser || !smtpPassword) {
        throw new Error(
            "Missing EVENT_SMTP_USER or EVENT_SMTP_APP_PASSWORD in .env.local."
        );
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: smtpUser,
            pass: smtpPassword.replace(/\s/g, ""),
        },
    });

    await transporter.verify();

    const attachments =
        includeQr && qrBuffer
            ? [
                {
                    filename: "regigo-qr-code.png",
                    content: qrBuffer,
                    cid: qrCid,
                    contentType: "image/png",
                },
            ]
            : [];

    return transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to,
        subject,
        text: textBody,
        html: htmlBody,
        attachments,
    });
}

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const body = await req.json();

        const eventId = clean(body.eventId);
        const registrationId = clean(body.registrationId);
        const emailType = mapEmailType(clean(body.type));
        const checkedInOnly = Boolean(body.checkedInOnly);

        if (!eventId) {
            return NextResponse.json(
                { error: "eventId is required." },
                { status: 400 }
            );
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "You must be logged in." },
                { status: 401 }
            );
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json(
                { error: "Only admins can send emails." },
                { status: 403 }
            );
        }

        const { data: event, error: eventError } = await supabase
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

        const { data: template, error: templateError } = await supabase
            .from("email_templates")
            .select("*")
            .eq("event_id", eventId)
            .eq("email_type", emailType)
            .maybeSingle();

        if (templateError) {
            return NextResponse.json(
                { error: templateError.message },
                { status: 500 }
            );
        }

        if (!template) {
            return NextResponse.json(
                {
                    error: `No ${emailType} email template found. Please create it in Email Centre first.`,
                },
                { status: 404 }
            );
        }

        let guests: any[] = [];

        if (registrationId) {
            const { data: guest, error: guestError } = await supabase
                .from("registrations")
                .select("*")
                .eq("id", registrationId)
                .eq("event_id", eventId)
                .single();

            if (guestError || !guest) {
                return NextResponse.json(
                    { error: guestError?.message || "Guest not found." },
                    { status: 404 }
                );
            }

            guests = [guest];
        } else {
            const { data: registrations, error: registrationsError } =
                await supabase
                    .from("registrations")
                    .select("*")
                    .eq("event_id", eventId);

            if (registrationsError) {
                return NextResponse.json(
                    { error: registrationsError.message },
                    { status: 500 }
                );
            }

            guests = registrations || [];
        }

        const totalGuests = guests.length;
        const registrationIds = guests.map((guest) => guest.id);

        if (registrationIds.length > 0) {
            const { data: qrTickets } = await supabase
                .from("qr_tickets")
                .select("*")
                .in("registration_id", registrationIds);

            const qrTicketMap = new Map();

            for (const ticket of qrTickets || []) {
                const existing = qrTicketMap.get(ticket.registration_id);

                if (!existing) {
                    qrTicketMap.set(ticket.registration_id, ticket);
                    continue;
                }

                if (ticket.is_active === false && existing.is_active !== false) {
                    qrTicketMap.set(ticket.registration_id, ticket);
                }
            }

            guests = guests.map((guest) => ({
                ...guest,
                __qr_ticket: qrTicketMap.get(guest.id) || null,
            }));
        }

        if (checkedInOnly) {
            guests = guests.filter((guest) => isCheckedIn(guest));
        }

        const checkedInGuests = guests.length;

        guests = guests.filter((guest) => getGuestEmail(guest));

        if (guests.length === 0) {
            if (checkedInOnly) {
                return NextResponse.json(
                    {
                        error: `No checked-in guests with email addresses found. Total guests: ${totalGuests}. Checked-in guests found: ${checkedInGuests}.`,
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                {
                    error: `No guests with email addresses found. Total guests: ${totalGuests}.`,
                },
                { status: 400 }
            );
        }

        let sent = 0;
        let failed = 0;

        for (const guest of guests) {
            const recipientEmail = getGuestEmail(guest);
            const rawBody = template.body || "";
            const includeQr = shouldIncludeQr(emailType, rawBody);

            let qrBuffer: Buffer | undefined;

            if (includeQr) {
                const qrValue = getQrValue(guest);

                qrBuffer = await QRCode.toBuffer(qrValue, {
                    width: 220,
                    margin: 2,
                });
            }

            const qrCid = `regigo-qr-${guest.id}@regigo`;

            const subject = replaceVariables(
                template.subject || "",
                event,
                guest
            );

            const textBody = replaceVariables(rawBody, event, guest);

            const htmlBody = toHtml(
                rawBody,
                event,
                guest,
                qrCid,
                emailType
            );

            try {
                await sendEmail({
                    to: recipientEmail,
                    subject,
                    textBody,
                    htmlBody,
                    qrBuffer,
                    qrCid,
                    includeQr,
                });

                await supabase.from("email_logs").insert({
                    event_id: eventId,
                    registration_id: guest.id,
                    email_type: emailType,
                    recipient_email: recipientEmail,
                    subject,
                    status: "sent",
                });

                sent += 1;
            } catch (error: any) {
                await supabase.from("email_logs").insert({
                    event_id: eventId,
                    registration_id: guest.id,
                    email_type: emailType,
                    recipient_email: recipientEmail,
                    subject,
                    status: "failed",
                    error_message: error?.message || "Failed to send email.",
                });

                failed += 1;
            }
        }

        return NextResponse.json({
            success: true,
            message: registrationId
                ? "Email sent successfully."
                : `Bulk email completed. Sent: ${sent}. Failed: ${failed}.`,
            sent,
            failed,
        });
    } catch (error: any) {
        console.error("Template email error:", error);

        return NextResponse.json(
            { error: error?.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
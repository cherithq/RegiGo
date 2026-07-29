import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";
import {
    buildCompanySmtpTransporter,
    resolveCompanySender,
} from "@/lib/company-sender";

type EmailTemplate = {
    subject: string | null;
    body: string | null;
};

type TemplateValues = Record<string, string>;

function escapeHtml(value: unknown) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderTemplate(template: string, values: TemplateValues) {
    let output = template;

    Object.entries(values).forEach(([key, value]) => {
        output = output.replaceAll(`{{${key}}}`, value ?? "");
    });

    return output;
}

function textToHtml(text: string) {
    return escapeHtml(text).replace(/\n/g, "<br />");
}

function getDefaultSubject(emailType: string, eventName: string) {
    if (emailType === "table_assignment") {
        return `Your table has been assigned for ${eventName}`;
    }

    if (emailType === "event_update" || emailType === "update") {
        return `Event update for ${eventName}`;
    }

    if (emailType === "reminder") {
        return `Reminder: ${eventName} is coming up`;
    }

    return `Registration confirmed for ${eventName}`;
}

function getDefaultBody(emailType: string) {
    if (emailType === "table_assignment") {
        return `Hi {{name}},

Your table has been assigned for {{event_name}}. Your details are below.

You may view your QR pass here:
{{pass_url}}`;
    }

    if (emailType === "event_update" || emailType === "update") {
        return `Hi {{name}},

There has been an update for {{event_name}}. The latest details are below.

You may view your QR pass here:
{{pass_url}}`;
    }

    if (emailType === "reminder") {
        return `Hi {{name}},

This is a reminder that {{event_name}} is coming up soon. Your details are below.

You may view your QR pass here:
{{pass_url}}`;
    }

    return `Hi {{name}},

Thank you for registering for {{event_name}}. Your details are below.

You may view your QR pass here:
{{pass_url}}`;
}

async function queueTomorrowReminders(
    admin: ReturnType<typeof getSupabaseAdminClient>,
) {
    // The worker runs once/day (see vercel.json), so "tomorrow" is computed
    // once per invocation from the SGT wall-clock date.
    const sgtNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const tomorrow = new Date(sgtNow);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);

    const { data: events } = await admin
        .from("events")
        .select("id")
        .eq("event_date", tomorrowDate)
        .eq("status", "published");

    if (!events || events.length === 0) return;

    for (const event of events) {
        const { data: existingReminder } = await admin
            .from("email_jobs")
            .select("id")
            .eq("event_id", event.id)
            .eq("email_type", "reminder")
            .limit(1)
            .maybeSingle();

        if (existingReminder) continue;

        const { data: registrations } = await admin
            .from("registrations")
            .select("id, email")
            .eq("event_id", event.id);

        const rows = (registrations || [])
            .filter((registration) => registration.email)
            .map((registration) => ({
                event_id: event.id,
                registration_id: registration.id,
                recipient_email: registration.email,
                email_type: "reminder",
                status: "pending",
                attempts: 0,
                last_error: null,
                sent_at: null,
            }));

        if (rows.length > 0) {
            await admin.from("email_jobs").insert(rows);
        }
    }
}

async function runEmailWorker(req: Request) {
    try {
        const url = new URL(req.url);
        const secret =
            req.headers.get("x-worker-secret") || url.searchParams.get("secret");

        if (!process.env.EMAIL_WORKER_SECRET) {
            return NextResponse.json(
                {
                    error:
                        "Missing EMAIL_WORKER_SECRET. Add it to .env.local and restart npm run dev.",
                },
                { status: 500 },
            );
        }

        if (secret !== process.env.EMAIL_WORKER_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = getSupabaseAdminClient();

        await queueTomorrowReminders(admin);

        const { data: jobs, error: jobsError } = await admin
            .from("email_jobs")
            .select("*")
            .eq("status", "pending")
            .neq("email_type", "glitter_games_access")
            .lt("attempts", 3)
            .order("created_at", { ascending: true })
            .limit(10);

        if (jobsError) {
            return NextResponse.json({ error: jobsError.message }, { status: 500 });
        }

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ message: "No pending email jobs." });
        }

        const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
        const smtpPort = Number(process.env.SMTP_PORT || 587);
        const smtpUser = (process.env.SMTP_USER || "").trim();
        const smtpPass = (process.env.SMTP_PASS || "").replace(/\s/g, "");
        const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

        if (!smtpUser || !smtpPass) {
            return NextResponse.json(
                {
                    error:
                        "Missing SMTP_USER or SMTP_PASS. Check your .env.local file and restart npm run dev.",
                },
                { status: 500 },
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

        await transporter.verify();

        const results: Array<Record<string, unknown>> = [];
        const companyTransporters = new Map<
            string,
            ReturnType<typeof buildCompanySmtpTransporter>
        >();

        for (const job of jobs) {
            try {
                await admin
                    .from("email_jobs")
                    .update({
                        status: "processing",
                        attempts: Number(job.attempts || 0) + 1,
                        last_error: null,
                    })
                    .eq("id", job.id);

                const { data: registration, error: registrationError } =
                    await admin
                        .from("registrations")
                        .select("*")
                        .eq("id", job.registration_id)
                        .maybeSingle();

                if (registrationError) throw new Error(registrationError.message);
                if (!registration) throw new Error("Registration not found.");

                const { data: event, error: eventError } = await admin
                    .from("events")
                    .select("*")
                    .eq("id", registration.event_id)
                    .maybeSingle();

                if (eventError) throw new Error(eventError.message);
                if (!event) throw new Error("Event not found.");

                const siteUrl = (
                    process.env.NEXT_PUBLIC_SITE_URL ||
                    process.env.NEXT_PUBLIC_APP_URL ||
                    "http://localhost:3000"
                ).replace(/\/$/, "");

                const passUrl = `${siteUrl}/event/${event.event_slug}/pass?registration=${registration.id}`;

                const ticketResult = await admin
                    .from("qr_tickets")
                    .select("*")
                    .eq("registration_id", registration.id)
                    .eq("is_active", true)
                    .limit(1)
                    .maybeSingle();

                if (ticketResult.error) {
                    throw new Error(ticketResult.error.message);
                }

                const ticket =
                    ticketResult.data as Record<string, unknown> | null;

                let ticketName = "-";

                if (registration.ticket_type_id) {
                    const { data: ticketType } = await admin
                        .from("ticket_types")
                        .select("*")
                        .eq("id", registration.ticket_type_id)
                        .maybeSingle();

                    ticketName = ticketType?.ticket_name || "-";
                }

                let tableName = "-";

                const { data: tableAssignment } = await admin
                    .from("table_assignments")
                    .select("*")
                    .eq("registration_id", registration.id)
                    .maybeSingle();

                if (tableAssignment?.table_id) {
                    const { data: table } = await admin
                        .from("event_tables")
                        .select("*")
                        .eq("id", tableAssignment.table_id)
                        .maybeSingle();

                    tableName = table?.table_name || "-";
                }

                const actionUrl = passUrl;
                let qrBase64: string | null = null;

                if (ticket) {
                    const qrDataUrl = await QRCode.toDataURL(actionUrl, {
                        width: 320,
                        margin: 2,
                        errorCorrectionLevel: "M",
                    });

                    qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
                }

                const templateValues: TemplateValues = {
                    name: registration.full_name || "Guest",
                    full_name: registration.full_name || "Guest",
                    email: registration.email || job.recipient_email || "",
                    event_name: event.event_name || "-",
                    event_date: event.event_date || "-",
                    event_time: event.event_time || "-",
                    venue: event.venue || "-",
                    ticket_type: ticketName,
                    table_name: tableName,
                    table: tableName,
                    pass_url: passUrl,
                    qr_link: actionUrl,
                    game_url: "",
                    games_url: "",
                    qr_code: "Your QR code is displayed below.",
                    qr_image: "Your QR code is displayed below.",
                    company: "RegiGo",
                };

                const { data: savedTemplate } = await admin
                    .from("email_templates")
                    .select("subject, body")
                    .eq("event_id", event.id)
                    .eq("email_type", job.email_type)
                    .maybeSingle();

                const template = savedTemplate as EmailTemplate | null;
                const subject = renderTemplate(
                    template?.subject ||
                        getDefaultSubject(job.email_type, event.event_name || "your event"),
                    templateValues,
                );
                const body = renderTemplate(
                    template?.body || getDefaultBody(job.email_type),
                    templateValues,
                );

                const defaultFromAddress =
                    process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || smtpUser;
                const defaultFromName = process.env.EMAIL_FROM_NAME || "RegiGo";
                const sender = await resolveCompanySender({
                    admin,
                    companyId: event.company_id,
                    defaultFromName,
                });

                let activeTransporter = transporter;
                let fromAddress = defaultFromAddress;

                if (sender.smtp && event.company_id) {
                    if (!companyTransporters.has(event.company_id)) {
                        companyTransporters.set(
                            event.company_id,
                            buildCompanySmtpTransporter(sender.smtp),
                        );
                    }

                    activeTransporter = companyTransporters.get(
                        event.company_id,
                    )!;
                    fromAddress = sender.smtp.fromAddress;
                }

                const qrCid = "qrpass@regigo";
                const attachments = qrBase64
                    ? [
                          {
                              filename: "qr-pass.png",
                              content: qrBase64,
                              encoding: "base64" as const,
                              cid: qrCid,
                              contentType: "image/png",
                          },
                      ]
                    : [];

                const informationCard = `
                    <div style="background:#F7F5FF;border-radius:20px;padding:20px;margin-top:24px">
                      <p><b>Date:</b> ${escapeHtml(event.event_date || "-")}</p>
                      <p><b>Time:</b> ${escapeHtml(event.event_time || "-")}</p>
                      <p><b>Venue:</b> ${escapeHtml(event.venue || "-")}</p>
                      ${
                          tableName !== "-"
                              ? `<p><b>Table:</b> ${escapeHtml(tableName)}</p>`
                              : ""
                      }
                    </div>
                  `;

                await activeTransporter.sendMail({
                    from: `"${sender.fromName}" <${fromAddress}>`,
                    to: job.recipient_email,
                    subject,
                    html: `<!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>${escapeHtml(subject)}</title>
                      </head>
                      <body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,sans-serif">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5FF;padding:32px 16px">
                          <tr>
                            <td align="center">
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:28px">
                                <tr>
                                  <td style="background:linear-gradient(135deg,#4F46E5,#EC4899);padding:32px;color:#ffffff;border-radius:28px 28px 0 0">
                                    <p style="font-weight:bold;margin:0;opacity:.85">RegiGo</p>
                                    <h1 style="margin:12px 0 0;font-size:28px;line-height:1.3">${escapeHtml(subject)}</h1>
                                    <p style="margin:8px 0 0;opacity:.9">${escapeHtml(event.event_name || "")}</p>
                                  </td>
                                </tr>

                                <tr>
                                  <td style="padding:32px">
                                    <div style="font-size:15px;line-height:1.7;color:#334155">
                                      ${textToHtml(body)}
                                    </div>
                                  </td>
                                </tr>

                                ${
                                    qrBase64
                                        ? `
                                            <tr>
                                              <td align="center" style="padding:0 32px 28px">
                                                <table role="presentation" cellpadding="0" cellspacing="0">
                                                  <tr>
                                                    <td style="background:#ffffff;padding:12px;border:1px solid #E2E8F0;border-radius:20px">
                                                      <img
                                                        src="cid:${qrCid}"
                                                        alt="QR Code"
                                                        width="220"
                                                        height="220"
                                                        style="display:block;width:220px;height:220px;max-width:100%;border:0"
                                                      />
                                                    </td>
                                                  </tr>
                                                </table>
                                              </td>
                                            </tr>
                                          `
                                        : ""
                                }

                                <tr>
                                  <td style="padding:0 32px 32px">
                                    ${informationCard}

                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
                                      <tr>
                                        <td align="center">
                                          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#4F46E5;color:#ffffff;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:bold">
                                            View QR Pass
                                          </a>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </body>
                    </html>
                    `,
                    attachments,
                });

                await admin
                    .from("email_jobs")
                    .update({
                        status: "sent",
                        sent_at: new Date().toISOString(),
                        last_error: null,
                    })
                    .eq("id", job.id);

                results.push({
                    id: job.id,
                    email: job.recipient_email,
                    type: job.email_type,
                    status: "sent",
                });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "Failed to send email";

                await admin
                    .from("email_jobs")
                    .update({
                        status: "pending",
                        last_error: message,
                    })
                    .eq("id", job.id);

                results.push({
                    id: job.id,
                    email: job.recipient_email,
                    type: job.email_type,
                    status: "failed",
                    error: message,
                });
            }
        }

        return NextResponse.json({ processed: results });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Email worker failed",
            },
            { status: 500 },
        );
    }
}

export async function POST(req: Request) {
    return runEmailWorker(req);
}

export async function GET(req: Request) {
    return runEmailWorker(req);
}

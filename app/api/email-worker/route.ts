import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type EmailTemplate = {
    subject: string | null;
    body: string | null;
};

type TemplateValues = {
    name: string;
    full_name: string;
    email: string;
    event_name: string;
    event_date: string;
    event_time: string;
    venue: string;
    ticket_type: string;
    table_name: string;
    pass_url: string;
};

function escapeHtml(value: any) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderTemplate(template: string, values: Record<string, any>) {
    let output = template;

    Object.entries(values).forEach(([key, value]) => {
        output = output.replaceAll(`{{${key}}}`, String(value ?? ""));
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

    if (emailType === "event_update") {
        return `Event update for ${eventName}`;
    }

    return `Registration confirmed for ${eventName}`;
}

function getDefaultBody(emailType: string) {
    if (emailType === "table_assignment") {
        return `Hi {{name}},

Your table has been assigned for {{event_name}}.

Table: {{table_name}}

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

You may view your QR pass here:
{{pass_url}}`;
    }

    if (emailType === "event_update") {
        return `Hi {{name}},

There has been an update for {{event_name}}.

Updated Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Your current table assignment:
Table: {{table_name}}

You may view your QR pass here:
{{pass_url}}`;
    }

    return `Hi {{name}},

Thank you for registering for {{event_name}}.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}
Ticket Type: {{ticket_type}}
Table: {{table_name}}

You may view your QR pass here:
{{pass_url}}`;
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
                { status: 500 }
            );
        }

        if (secret !== process.env.EMAIL_WORKER_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseServer = await createSupabaseServerClient();

        const { data: jobs, error: jobsError } = await supabaseServer
            .from("email_jobs")
            .select("*")
            .eq("status", "pending")
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

        await transporter.verify();

        const results = [];

        for (const job of jobs) {
            try {
                await supabaseServer
                    .from("email_jobs")
                    .update({
                        status: "processing",
                        attempts: Number(job.attempts || 0) + 1,
                        last_error: null,
                    })
                    .eq("id", job.id);

                const { data: registration, error: registrationError } =
                    await supabaseServer
                        .from("registrations")
                        .select("*")
                        .eq("id", job.registration_id)
                        .maybeSingle();

                if (registrationError) {
                    throw new Error(registrationError.message);
                }

                if (!registration) {
                    throw new Error("Registration not found.");
                }

                const { data: event, error: eventError } = await supabaseServer
                    .from("events")
                    .select("*")
                    .eq("id", registration.event_id)
                    .maybeSingle();

                if (eventError) {
                    throw new Error(eventError.message);
                }

                if (!event) {
                    throw new Error("Event not found.");
                }

                const { data: ticket, error: ticketError } = await supabaseServer
                    .from("qr_tickets")
                    .select("*")
                    .eq("registration_id", registration.id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (ticketError) {
                    throw new Error(ticketError.message);
                }

                let ticketName = "-";

                if (registration.ticket_type_id) {
                    const { data: ticketType } = await supabaseServer
                        .from("ticket_types")
                        .select("*")
                        .eq("id", registration.ticket_type_id)
                        .maybeSingle();

                    ticketName = ticketType?.ticket_name || "-";
                }

                let tableName = "-";

                const { data: tableAssignment } = await supabaseServer
                    .from("table_assignments")
                    .select("*")
                    .eq("registration_id", registration.id)
                    .maybeSingle();

                if (tableAssignment?.table_id) {
                    const { data: table } = await supabaseServer
                        .from("event_tables")
                        .select("*")
                        .eq("id", tableAssignment.table_id)
                        .maybeSingle();

                    tableName = table?.table_name || "-";
                }

                const siteUrl =
                    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

                const passUrl = `${siteUrl}/event/${event.event_slug}/pass?registration=${registration.id}`;

                let qrBase64: string | null = null;

                if (ticket) {
                    const qrDataUrl = await QRCode.toDataURL(passUrl, {
                        width: 300,
                        margin: 2,
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
                    pass_url: passUrl,
                };

                const { data: savedTemplate } = await supabaseServer
                    .from("email_templates")
                    .select("subject, body")
                    .eq("event_id", event.id)
                    .eq("email_type", job.email_type)
                    .maybeSingle();

                const template = savedTemplate as EmailTemplate | null;

                const subject = renderTemplate(
                    template?.subject ||
                    getDefaultSubject(job.email_type, event.event_name || "your event"),
                    templateValues
                );

                const body = renderTemplate(
                    template?.body || getDefaultBody(job.email_type),
                    templateValues
                );

                const fromAddress =
                    process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || smtpUser;

                const fromName = process.env.EMAIL_FROM_NAME || "RegiGo";

                const attachments = qrBase64
                    ? [
                        {
                            filename: "qr-pass.png",
                            content: qrBase64,
                            encoding: "base64" as const,
                            cid: "qrpass@regigo",
                            contentType: "image/png",
                        },
                    ]
                    : [];

                await transporter.sendMail({
                    from: `"${fromName}" <${fromAddress}>`,
                    to: job.recipient_email,
                    subject,
                    html: `
            <div style="font-family:Arial,sans-serif;background:#F7F5FF;padding:32px">
              <div style="max-width:640px;margin:auto;background:white;border-radius:28px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#4F46E5,#EC4899);padding:32px;color:white">
                  <p style="font-weight:bold;margin:0;opacity:.85">RegiGo</p>
                  <h1 style="margin:12px 0 0;font-size:30px">${escapeHtml(
                        subject
                    )}</h1>
                  <p style="margin:8px 0 0;opacity:.9">${escapeHtml(
                        event.event_name || ""
                    )}</p>
                </div>

                <div style="padding:32px">
                  <div style="font-size:15px;line-height:1.7;color:#334155">
                    ${textToHtml(body)}
                  </div>

                  ${qrBase64
                            ? `
                        <div style="text-align:center;margin:28px 0">
                          <img
                            src="cid:qrpass@regigo"
                            alt="QR Code"
                            width="220"
                            height="220"
                            style="display:block;margin:auto;width:220px;height:220px;border:0"
                          />
                        </div>
                      `
                            : ""
                        }

                  <div style="background:#F7F5FF;border-radius:20px;padding:20px;margin-top:24px">
                    <p><b>Date:</b> ${escapeHtml(event.event_date || "-")}</p>
                    <p><b>Time:</b> ${escapeHtml(event.event_time || "-")}</p>
                    <p><b>Venue:</b> ${escapeHtml(event.venue || "-")}</p>
                    <p><b>Ticket Type:</b> ${escapeHtml(ticketName)}</p>
                    <p><b>Table:</b> ${escapeHtml(tableName)}</p>
                  </div>

                  <div style="text-align:center;margin-top:28px">
                    <a href="${escapeHtml(
                            passUrl
                        )}" style="display:inline-block;background:#4F46E5;color:white;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:bold">
                      View QR Pass
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `,
                    attachments,
                });

                await supabaseServer
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
            } catch (error: any) {
                await supabaseServer
                    .from("email_jobs")
                    .update({
                        status: "pending",
                        last_error: error.message || "Failed to send email",
                    })
                    .eq("id", job.id);

                results.push({
                    id: job.id,
                    email: job.recipient_email,
                    type: job.email_type,
                    status: "failed",
                    error: error.message,
                });
            }
        }

        return NextResponse.json({ processed: results });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Email worker failed" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    return runEmailWorker(req);
}

export async function GET(req: Request) {
    return runEmailWorker(req);
}
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function runEmailWorker(req: Request) {
    try {
        const url = new URL(req.url);
        const secret =
            req.headers.get("x-worker-secret") || url.searchParams.get("secret");

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
        const smtpSecure =
            process.env.SMTP_SECURE === "true" || smtpPort === 465;

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

                if (!ticket) {
                    throw new Error("QR ticket not found.");
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
                        .from("tables")
                        .select("*")
                        .eq("id", tableAssignment.table_id)
                        .maybeSingle();

                    tableName = table?.table_name || "-";
                }

                const siteUrl =
                    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

                const passUrl = `${siteUrl}/event/${event.event_slug}/pass?registration=${registration.id}`;

                const qrDataUrl = await QRCode.toDataURL(passUrl, {
                    width: 300,
                    margin: 2,
                });

                const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

                const fromAddress =
                    process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || smtpUser;

                const fromName = process.env.EMAIL_FROM_NAME || "RegiGo";

                await transporter.sendMail({
                    from: `"${fromName}" <${fromAddress}>`,
                    to: job.recipient_email,
                    subject: `Registration confirmed for ${event.event_name}`,
                    html: `
            <div style="font-family:Arial,sans-serif;background:#F7F5FF;padding:32px">
              <div style="max-width:640px;margin:auto;background:white;border-radius:28px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#4F46E5,#EC4899);padding:32px;color:white">
                  <p style="font-weight:bold;margin:0;opacity:.85">RegiGo QR Pass</p>
                  <h1 style="margin:12px 0 0;font-size:32px">Registration Confirmed</h1>
                  <p style="margin:8px 0 0;opacity:.9">${event.event_name}</p>
                </div>

                <div style="padding:32px">
                  <p>Hi <b>${registration.full_name || "Guest"}</b>,</p>
                  <p>Thank you for registering. Please show this QR code during check-in.</p>

                  <div style="text-align:center;margin:28px 0">
                    <img
                      src="cid:qrpass@regigo"
                      alt="QR Code"
                      width="220"
                      height="220"
                      style="display:block;margin:auto;width:220px;height:220px;border:0"
                    />
                  </div>

                  <div style="background:#F7F5FF;border-radius:20px;padding:20px">
                    <p><b>Date:</b> ${event.event_date || "-"}</p>
                    <p><b>Time:</b> ${event.event_time || "-"}</p>
                    <p><b>Venue:</b> ${event.venue || "-"}</p>
                    <p><b>Ticket Type:</b> ${ticketName}</p>
                    <p><b>Table:</b> ${tableName}</p>
                  </div>

                  <div style="text-align:center;margin-top:28px">
                    <a href="${passUrl}" style="display:inline-block;background:#4F46E5;color:white;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:bold">
                      View QR Pass
                    </a>
                  </div>

                  <p style="margin-top:28px;color:#64748b;font-size:14px">
                    If the QR image does not show, click View QR Pass.
                  </p>
                </div>
              </div>
            </div>
          `,
                    attachments: [
                        {
                            filename: "qr-pass.png",
                            content: qrBase64,
                            encoding: "base64",
                            cid: "qrpass@regigo",
                            contentType: "image/png",
                        },
                    ],
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
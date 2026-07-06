import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

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

function safeSubject(value: string) {
    return value.replace(/[\r\n]/g, " ").slice(0, 120);
}

export async function POST(req: Request) {
    try {
        const supabaseServer = await createSupabaseServerClient();
        const body = await req.json();

        const fullName = clean(body.full_name);
        const companyName = clean(body.company_name);
        const email = clean(body.email);
        const phone = clean(body.phone);
        const eventType = clean(body.event_type);
        const estimatedGuests = clean(body.estimated_guests);
        const eventDate = clean(body.event_date);
        const message = clean(body.message);

        if (!fullName) {
            return NextResponse.json(
                { error: "Full name is required." },
                { status: 400 }
            );
        }

        if (!email) {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            );
        }

        const combinedMessage = [
            `Estimated Guests: ${estimatedGuests || "-"}`,
            `Event Date: ${eventDate || "-"}`,
            "",
            "Event Details:",
            message || "-",
        ].join("\n");

        const { error: insertError } = await supabaseServer
            .from("enquiries")
            .insert({
                full_name: fullName,
                company_name: companyName || null,
                email,
                phone: phone || null,
                event_type: eventType || null,
                message: combinedMessage,
                status: "new",
            });

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        const smtpUser = process.env.GMAIL_SMTP_USER;
        const smtpPassword = process.env.GMAIL_SMTP_APP_PASSWORD;
        const receiverEmail =
            process.env.ENQUIRY_RECEIVER_EMAIL || "regigo.noreply@gmail.com";

        if (!smtpUser || !smtpPassword) {
            return NextResponse.json(
                {
                    error:
                        "Enquiry saved to Supabase, but email was not sent. Check GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in .env.local.",
                },
                { status: 500 }
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

        const subject = safeSubject(
            `New RegiGo Enquiry - ${companyName || fullName}`
        );

        const text = `
New RegiGo Enquiry

Full Name: ${fullName}
Company / Organisation: ${companyName || "-"}
Email: ${email}
Phone: ${phone || "-"}
Event Type: ${eventType || "-"}
Estimated Guests: ${estimatedGuests || "-"}
Event Date: ${eventDate || "-"}

Event Details:
${message || "-"}
`;

        const html = `
      <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; overflow:hidden;">
          <div style="padding:24px; background:linear-gradient(135deg,#4F46E5,#EC4899); color:#ffffff;">
            <h1 style="margin:0; font-size:24px;">New RegiGo Enquiry</h1>
            <p style="margin:8px 0 0; opacity:0.9;">Register. Manage. Go.</p>
          </div>

          <div style="padding:24px;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Full Name</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(fullName)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Company</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(companyName || "-")}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Email</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(email)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Phone</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(phone || "-")}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Event Type</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(eventType || "-")}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Estimated Guests</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(estimatedGuests || "-")}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#64748b; font-weight:bold;">Event Date</td>
                <td style="padding:10px 0; color:#0f172a;">${escapeHtml(eventDate || "-")}</td>
              </tr>
            </table>

            <div style="margin-top:20px;">
              <p style="margin:0 0 8px; color:#64748b; font-weight:bold;">Event Details</p>
              <div style="white-space:pre-wrap; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; color:#0f172a;">
${escapeHtml(message || "-")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

        const info = await transporter.sendMail({
            from: `"RegiGo Website" <${smtpUser}>`,
            to: receiverEmail,
            replyTo: email,
            subject,
            text,
            html,
        });

        console.log("RegiGo enquiry email sent:", info.messageId);

        return NextResponse.json({
            success: true,
            message: "Enquiry saved and email sent successfully.",
        });
    } catch (error: any) {
        console.error("RegiGo enquiry email error:", error);

        return NextResponse.json(
            {
                error:
                    error?.message ||
                    "Enquiry may have been saved, but email failed to send.",
            },
            { status: 500 }
        );
    }
}
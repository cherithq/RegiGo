import { NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { supabaseServer } from "@/lib/supabase-server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { registrationId, slug } = await req.json();

        if (!registrationId || !slug) {
            return NextResponse.json(
                { error: "Missing registrationId or slug" },
                { status: 400 }
            );
        }

        const { data: registration } = await supabaseServer
            .from("registrations")
            .select(`
        *,
        ticket_types(*),
        table_assignments(
          *,
          event_tables(*)
        )
      `)
            .eq("id", registrationId)
            .single();

        const { data: event } = await supabaseServer
            .from("events")
            .select("*")
            .eq("event_slug", slug)
            .single();

        const { data: ticket } = await supabaseServer
            .from("qr_tickets")
            .select("*")
            .eq("registration_id", registrationId)
            .single();

        if (!registration || !event || !ticket) {
            return NextResponse.json(
                { error: "Registration, event, or QR ticket not found" },
                { status: 404 }
            );
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const passUrl = `${siteUrl}/event/${slug}/pass?registration=${registrationId}`;

        const qrDataUrl = await QRCode.toDataURL(ticket.qr_token, {
            width: 240,
            margin: 2,
        });

        const tableAssignment = Array.isArray(registration.table_assignments)
            ? registration.table_assignments[0]
            : registration.table_assignments;

        const tableName = tableAssignment?.event_tables?.table_name || "-";
        const ticketName = registration.ticket_types?.ticket_name || "-";

        const { error } = await resend.emails.send({
            from: "RegiGo <onboarding@resend.dev>",
            to: registration.email,
            subject: `Registration confirmed for ${event.event_name}`,
            html: `
        <div style="font-family:Arial,sans-serif;background:#F7F5FF;padding:32px">
            <div style="max-width:640px;margin:auto;background:#ffffff;border-radius:28px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#4F46E5,#EC4899);padding:32px;color:white">
                <p style="font-weight:bold;margin:0;opacity:.85">RegiGo QR Pass</p>
                <h1 style="margin:12px 0 0;font-size:32px">Registration Confirmed</h1>
                <p style="margin:8px 0 0;opacity:.9">${event.event_name}</p>
            </div>

            <div style="padding:32px">
                <p>Hi <b>${registration.full_name}</b>,</p>
                <p>Thank you for registering. Please show this QR code during check-in.</p>

                <div style="text-align:center;margin:28px 0">
                <img src="${qrDataUrl}" alt="QR Code" style="width:220px;height:220px" />
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
                See you at the event.
            </p>
            </div>
        </div>
        </div>
    `,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to send registration email" },
            { status: 500 }
        );
    }
}
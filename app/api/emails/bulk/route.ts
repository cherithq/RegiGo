import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { EventEmailType, sendEventEmail } from "@/lib/send-event-email";

export const runtime = "nodejs";

const allowedBulkTypes: EventEmailType[] = [
    "reminder",
    "thank_you",
    "event_update",
];

function clean(value: unknown) {
    return String(value || "").trim();
}

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const body = await req.json();

        const eventId = clean(body.eventId);
        const type = clean(body.type) as EventEmailType;
        const customMessage = clean(body.customMessage);
        const checkedInOnly = Boolean(body.checkedInOnly);

        if (!eventId) {
            return NextResponse.json(
                { error: "eventId is required." },
                { status: 400 }
            );
        }

        if (!allowedBulkTypes.includes(type)) {
            return NextResponse.json(
                { error: "Invalid bulk email type." },
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
                { error: "Only admins can send bulk emails." },
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

        const { data: registrations, error: registrationsError } = await supabase
            .from("registrations")
            .select("*")
            .eq("event_id", eventId);

        if (registrationsError) {
            return NextResponse.json(
                { error: registrationsError.message },
                { status: 500 }
            );
        }

        const guests = (registrations || []).filter((guest: any) => {
            if (!guest.email) return false;

            if (!checkedInOnly) return true;

            return Boolean(
                guest.checked_in ||
                guest.checked_in_at ||
                guest.check_in_time ||
                guest.attendance_status === "checked_in"
            );
        });

        let sent = 0;
        let failed = 0;

        for (const guest of guests) {
            try {
                const result = await sendEventEmail({
                    type,
                    guest,
                    event,
                    customMessage,
                });

                await supabase.from("email_logs").insert({
                    event_id: eventId,
                    registration_id: guest.id,
                    email_type: type,
                    recipient_email: result.recipientEmail,
                    subject: result.subject,
                    status: "sent",
                });

                sent += 1;
            } catch (emailError: any) {
                await supabase.from("email_logs").insert({
                    event_id: eventId,
                    registration_id: guest.id,
                    email_type: type,
                    recipient_email: guest.email,
                    subject: `${type} email`,
                    status: "failed",
                    error_message: emailError?.message || "Failed to send email.",
                });

                failed += 1;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Bulk email completed. Sent: ${sent}. Failed: ${failed}.`,
            sent,
            failed,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
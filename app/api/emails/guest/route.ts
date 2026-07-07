import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { EventEmailType, sendEventEmail } from "@/lib/send-event-email";

export const runtime = "nodejs";

const allowedTypes: EventEmailType[] = [
    "confirmation",
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

        const registrationId = clean(body.registrationId);
        const type = clean(body.type) as EventEmailType;
        const customMessage = clean(body.customMessage);

        if (!registrationId) {
            return NextResponse.json(
                { error: "registrationId is required." },
                { status: 400 }
            );
        }

        if (!allowedTypes.includes(type)) {
            return NextResponse.json(
                { error: "Invalid email type." },
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

        const { data: registration, error: registrationError } = await supabase
            .from("registrations")
            .select("*")
            .eq("id", registrationId)
            .single();

        if (registrationError || !registration) {
            return NextResponse.json(
                { error: registrationError?.message || "Registration not found." },
                { status: 404 }
            );
        }

        const eventId = registration.event_id;

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

        try {
            const result = await sendEventEmail({
                type,
                guest: registration,
                event,
                customMessage,
            });

            await supabase.from("email_logs").insert({
                event_id: eventId,
                registration_id: registrationId,
                email_type: type,
                recipient_email: result.recipientEmail,
                subject: result.subject,
                status: "sent",
            });

            return NextResponse.json({
                success: true,
                message: "Email sent successfully.",
            });
        } catch (emailError: any) {
            await supabase.from("email_logs").insert({
                event_id: eventId,
                registration_id: registrationId,
                email_type: type,
                recipient_email: registration.email,
                subject: `${type} email`,
                status: "failed",
                error_message: emailError?.message || "Failed to send email.",
            });

            return NextResponse.json(
                { error: emailError?.message || "Failed to send email." },
                { status: 500 }
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
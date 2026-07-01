import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
    const supabaseServer = await createSupabaseServerClient();
    try {
        const { eventId, answers } = await req.json();

        if (!eventId || !answers) {
            return NextResponse.json(
                { error: "Missing eventId or answers." },
                { status: 400 }
            );
        }

        const { data: event, error: eventError } = await supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle();

        if (eventError || !event) {
            return NextResponse.json(
                { error: "Event not found." },
                { status: 404 }
            );
        }

        const fullName =
            answers.full_name || answers.name || answers.guest_name || "";

        const email = answers.email || "";

        if (!fullName || !email) {
            return NextResponse.json(
                { error: "Full name and email are required." },
                { status: 400 }
            );
        }

        if (event.enable_ticket_types && !answers.ticket_type_id) {
            return NextResponse.json(
                { error: "Ticket type is required." },
                { status: 400 }
            );
        }

        const { data: registration, error: regError } = await supabaseServer
            .from("registrations")
            .insert({
                event_id: event.id,
                full_name: fullName,
                email,
                phone: answers.phone || null,
                country_code: answers.country_code || "+65",
                department: answers.department || null,
                dietary_request: answers.dietary_request || null,
                require_transport: answers.require_transport || null,
                ticket_type_id: event.enable_ticket_types
                    ? answers.ticket_type_id
                    : null,
                custom_answers: answers,
                registration_status: "confirmed",
                email_verified: false,
            })
            .select("*")
            .single();

        if (regError || !registration) {
            return NextResponse.json(
                { error: regError?.message || "Unable to create registration." },
                { status: 500 }
            );
        }

        const qrToken = crypto.randomUUID();

        const { error: qrError } = await supabaseServer.from("qr_tickets").insert({
            registration_id: registration.id,
            event_id: event.id,
            qr_token: qrToken,
            is_active: true,
        });

        if (qrError) {
            return NextResponse.json({ error: qrError.message }, { status: 500 });
        }

        const { error: emailJobError } = await supabaseServer
            .from("email_jobs")
            .insert({
                event_id: event.id,
                registration_id: registration.id,
                recipient_email: email,
                email_type: "registration_confirmation",
                status: "pending",
            });

        if (emailJobError) {
            console.error("Email job error:", emailJobError.message);
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

        await fetch(
            `${siteUrl}/api/email-worker?secret=${process.env.EMAIL_WORKER_SECRET}`,
            {
                method: "POST",
            }
        ).catch((error) => {
            console.error("Email worker trigger failed:", error);
        });

        return NextResponse.json({
            success: true,
            registrationId: registration.id,
            passUrl: `/event/${event.event_slug}/pass?registration=${registration.id}`,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Registration failed." },
            { status: 500 }
        );
    }
}
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function triggerEmailWorker(req: Request) {
    try {
        const triggerUrl = new URL("/api/email-worker/trigger", req.url);

        const response = await fetch(triggerUrl, {
            method: "POST",
            cache: "no-store",
        });

        const text = await response.text();

        let result: any = {};

        try {
            result = text ? JSON.parse(text) : {};
        } catch {
            result = { raw: text };
        }

        if (!response.ok) {
            console.error("Email worker trigger failed:", result);
            return {
                success: false,
                error: result,
            };
        }

        return {
            success: true,
            result,
        };
    } catch (error: any) {
        console.error("Email worker trigger failed:", error);
        return {
            success: false,
            error: error?.message || "Email worker trigger failed.",
        };
    }
}

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
            return NextResponse.json({ error: "Event not found." }, { status: 404 });
        }

        if (event.registration_open === false) {
            return NextResponse.json(
                { error: "Registration is currently closed for this event." },
                { status: 400 }
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
                attempts: 0,
                last_error: null,
                sent_at: null,
            });

        let emailTriggered = false;

        if (emailJobError) {
            console.error("Email job error:", emailJobError.message);
        } else {
            const triggerResult = await triggerEmailWorker(req);
            emailTriggered = triggerResult.success;
        }

        return NextResponse.json({
            success: true,
            registrationId: registration.id,
            passUrl: `/event/${event.event_slug}/pass?registration=${registration.id}`,
            emailQueued: !emailJobError,
            emailTriggered,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Registration failed." },
            { status: 500 }
        );
    }
}
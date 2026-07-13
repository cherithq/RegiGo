import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckInSource = "camera" | "manual";

type CheckInBody = {
    scannedValue?: unknown;
    registrationId?: unknown;
    qrToken?: unknown;
    source?: unknown;
};

type RegistrationRecord = {
    id: string;
    event_id: string;
    full_name?: string | null;
    email?: string | null;
    registration_status?: string | null;
};

type TicketRecord = {
    id: string;
    registration_id: string;
    event_id: string;
    qr_token?: string | null;
    is_active?: boolean | null;
};

function jsonNoStore(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function parseScannedValue(value: string) {
    const rawValue = value.trim();
    let registrationId = "";
    let qrToken = "";

    try {
        const url = new URL(rawValue);
        registrationId =
            url.searchParams.get("registration") ||
            url.searchParams.get("registration_id") ||
            url.searchParams.get("registrationId") ||
            "";
        qrToken =
            url.searchParams.get("qr_token") ||
            url.searchParams.get("qrToken") ||
            url.searchParams.get("token") ||
            url.searchParams.get("ticket") ||
            "";
    } catch {
        // The scanner may return a raw registration ID or QR token.
    }

    return {
        rawValue,
        registrationId,
        qrToken,
    };
}

async function triggerEmailWorker(request: Request) {
    try {
        const response = await fetch(new URL("/api/email-worker/trigger", request.url), {
            method: "POST",
            cache: "no-store",
        });

        const text = await response.text();
        let result: unknown = {};

        try {
            result = text ? JSON.parse(text) : {};
        } catch {
            result = { raw: text };
        }

        return {
            success: response.ok,
            result,
        };
    } catch (error) {
        console.error("Unable to trigger email worker:", error);
        return {
            success: false,
            result: null,
        };
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { eventId } = await context.params;
        const { supabaseServer } = await requirePermission("can_scan_qr");
        const body = (await request.json()) as CheckInBody;

        const source: CheckInSource = body.source === "manual" ? "manual" : "camera";
        const explicitRegistrationId = cleanString(body.registrationId);
        const explicitQrToken = cleanString(body.qrToken);
        const scannedValue = cleanString(body.scannedValue);
        const parsed = parseScannedValue(scannedValue);

        let registrationId = explicitRegistrationId || parsed.registrationId;
        let qrToken = explicitQrToken || parsed.qrToken;
        let ticket: TicketRecord | null = null;

        async function findTicketByRegistration(id: string) {
            const { data, error } = await supabaseServer
                .from("qr_tickets")
                .select("id,registration_id,event_id,qr_token,is_active")
                .eq("event_id", eventId)
                .eq("registration_id", id)
                .limit(1)
                .maybeSingle();

            if (error) throw new Error(error.message);
            return (data as TicketRecord | null) || null;
        }

        async function findTicketByToken(token: string) {
            const { data, error } = await supabaseServer
                .from("qr_tickets")
                .select("id,registration_id,event_id,qr_token,is_active")
                .eq("event_id", eventId)
                .eq("qr_token", token)
                .limit(1)
                .maybeSingle();

            if (error) throw new Error(error.message);
            return (data as TicketRecord | null) || null;
        }

        if (registrationId) {
            ticket = await findTicketByRegistration(registrationId);
        }

        if (!ticket && qrToken) {
            ticket = await findTicketByToken(qrToken);
            registrationId = ticket?.registration_id || registrationId;
        }

        // A raw UUID may be either the registration ID or the QR token.
        if (!ticket && scannedValue && isUuid(scannedValue)) {
            ticket = await findTicketByRegistration(scannedValue);

            if (ticket) {
                registrationId = ticket.registration_id;
            } else {
                ticket = await findTicketByToken(scannedValue);
                registrationId = ticket?.registration_id || registrationId;
                qrToken = scannedValue;
            }
        }

        // A manual check-in can still work for registrations created without a QR ticket.
        if (!registrationId && ticket?.registration_id) {
            registrationId = ticket.registration_id;
        }

        if (!registrationId) {
            return jsonNoStore(
                {
                    error: "This QR code does not match a registration for this event.",
                },
                404,
            );
        }

        const { data: registration, error: registrationError } =
            await supabaseServer
                .from("registrations")
                .select("id,event_id,full_name,email,registration_status")
                .eq("id", registrationId)
                .eq("event_id", eventId)
                .maybeSingle();

        if (registrationError) {
            return jsonNoStore({ error: registrationError.message }, 400);
        }

        if (!registration) {
            return jsonNoStore(
                { error: "Guest registration was not found for this event." },
                404,
            );
        }

        const guest = registration as RegistrationRecord;

        const { data: existingCheckIn, error: existingCheckInError } =
            await supabaseServer
                .from("check_ins")
                .select("id")
                .eq("registration_id", guest.id)
                .eq("event_id", eventId)
                .eq("scan_result", "checked_in")
                .limit(1)
                .maybeSingle();

        if (existingCheckInError) {
            return jsonNoStore({ error: existingCheckInError.message }, 400);
        }

        const statusAlreadyCheckedIn =
            guest.registration_status === "checked_in" ||
            guest.registration_status === "attended";
        const alreadyCheckedIn = Boolean(existingCheckIn) || statusAlreadyCheckedIn;
        let createdCheckIn = false;

        if (!alreadyCheckedIn) {
            const { error: insertError } = await supabaseServer
                .from("check_ins")
                .insert({
                    registration_id: guest.id,
                    event_id: eventId,
                    qr_ticket_id: ticket?.id || null,
                    checked_in_by: "Admin",
                    device_name:
                        source === "camera"
                            ? "Web Camera Scanner"
                            : "Manual Search",
                    scan_result: "checked_in",
                });

            if (insertError && insertError.code !== "23505") {
                return jsonNoStore({ error: insertError.message }, 400);
            }

            createdCheckIn = !insertError;
        }

        const { error: registrationUpdateError } = await supabaseServer
            .from("registrations")
            .update({ registration_status: "checked_in" })
            .eq("id", guest.id)
            .eq("event_id", eventId);

        if (registrationUpdateError) {
            return jsonNoStore({ error: registrationUpdateError.message }, 400);
        }

        const { error: ticketUpdateError } = await supabaseServer
            .from("qr_tickets")
            .update({ is_active: false })
            .eq("registration_id", guest.id)
            .eq("event_id", eventId);

        if (ticketUpdateError) {
            return jsonNoStore({ error: ticketUpdateError.message }, 400);
        }

        let emailQueued = false;
        let emailWorkerTriggered = false;
        let emailMessage = "";

        // Only the first successful check-in automatically sends the game pass.
        if (createdCheckIn) {
            if (!guest.email) {
                emailMessage =
                    "Guest checked in, but no email address is saved for the game pass.";
            } else {
                const { data: existingJob, error: existingJobError } =
                    await supabaseServer
                        .from("email_jobs")
                        .select("id,status")
                        .eq("event_id", eventId)
                        .eq("registration_id", guest.id)
                        .eq("email_type", "glitter_games_access")
                        .in("status", ["pending", "processing", "sent"])
                        .limit(1)
                        .maybeSingle();

                if (existingJobError) {
                    console.error(
                        "Unable to check existing Glitter Games email job:",
                        existingJobError,
                    );
                    emailMessage =
                        "Guest checked in, but the game pass email could not be queued.";
                } else if (existingJob) {
                    emailMessage =
                        "Guest checked in. A Glitter Games pass email already exists for this guest.";
                } else {
                    const { data: accessToken, error: accessTokenError } =
                        await supabaseServer.rpc(
                            "get_or_create_glitter_game_access_token_v1",
                            {
                                p_event_id: String(eventId),
                                p_registration_id: String(guest.id),
                            },
                        );

                    if (accessTokenError || !accessToken) {
                        console.error(
                            "Unable to create Glitter Games access token:",
                            accessTokenError,
                        );
                        emailMessage =
                            "Guest checked in, but the game pass QR could not be created.";
                    } else {
                        const { data: emailJob, error: emailJobError } =
                            await supabaseServer
                                .from("email_jobs")
                                .insert({
                                    event_id: eventId,
                                    registration_id: guest.id,
                                    recipient_email: guest.email,
                                    email_type: "glitter_games_access",
                                    game_access_token: accessToken,
                                    status: "pending",
                                    attempts: 0,
                                    last_error: null,
                                    sent_at: null,
                                })
                                .select("id")
                                .single();

                        if (emailJobError || !emailJob) {
                            console.error(
                                "Unable to queue Glitter Games email:",
                                emailJobError,
                            );
                            emailMessage =
                                "Guest checked in, but the game pass email could not be queued.";
                        } else {
                            emailQueued = true;
                            const workerResult = await triggerEmailWorker(request);
                            emailWorkerTriggered = workerResult.success;
                            emailMessage = workerResult.success
                                ? "Glitter Games pass email queued and the email worker was triggered."
                                : "Glitter Games pass email queued. The email worker can send it on its next run.";
                        }
                    }
                }
            }
        } else {
            emailMessage =
                "Guest was already checked in, so no duplicate Glitter Games email was sent.";
        }

        return jsonNoStore({
            success: true,
            duplicate: !createdCheckIn,
            message: createdCheckIn
                ? "Checked in successfully."
                : "Guest already checked in. Check-in status has been synced.",
            guest: {
                id: guest.id,
                full_name: guest.full_name || "Guest",
                email: guest.email || null,
            },
            emailQueued,
            emailWorkerTriggered,
            emailMessage,
        });
    } catch (error) {
        console.error("Check-in request failed:", error);

        return jsonNoStore(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to check in this guest.",
            },
            500,
        );
    }
}

import { NextResponse } from "next/server";
import {
    InvitationError,
    buildInvitationEmailHtml,
    createInvitationToken,
    createSmtpTransport,
    formatEventDate,
    formatEventTime,
    getSiteUrl,
    hashInvitationToken,
    replaceTemplateVariables,
    requireInvitationManager,
} from "@/lib/guest-invitations";
import {
    buildCompanySmtpTransporter,
    resolveCompanySender,
} from "@/lib/company-sender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function response(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function handleError(error: unknown) {
    if (error instanceof InvitationError) {
        return response(
            { error: error.message },
            error.status,
        );
    }

    console.error("Invitation API error:", error);

    return response(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage invitations.",
        },
        500,
    );
}

function cleanIds(value: unknown) {
    if (!Array.isArray(value)) return [];

    return Array.from(
        new Set(
            value
                .filter(
                    (item): item is string =>
                        typeof item === "string" &&
                        item.trim().length > 0,
                )
                .map((item) => item.trim()),
        ),
    );
}

function invitationExpiry(event: {
    rsvp_deadline?: string | null;
    event_date?: string | null;
}) {
    if (event.rsvp_deadline) {
        return event.rsvp_deadline;
    }

    if (event.event_date) {
        const eventDate = new Date(
            `${event.event_date}T23:59:59+08:00`,
        );

        if (
            !Number.isNaN(eventDate.getTime()) &&
            eventDate.getTime() > Date.now()
        ) {
            return eventDate.toISOString();
        }
    }

    return new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{ eventId: string }>;
    },
) {
    try {
        const { eventId } = await params;
        const { event, admin } =
            await requireInvitationManager(eventId);

        const { data: registrations, error } =
            await admin
                .from("registrations")
                .select(
                    "id, full_name, email, phone, department, dietary_request, selected_ticket_quantity, registration_status, rsvp_status, invitation_sent_at, invitation_opened_at, rsvp_responded_at, created_at",
                )
                .eq("event_id", eventId)
                .order("created_at", {
                    ascending: false,
                });

        if (error) {
            throw new InvitationError(error.message);
        }

        // Every event_invitations row already carries this event's
        // event_id, so scoping by event_id alone is sufficient — do not
        // also filter by .in("registration_id", registrationIds): for an
        // event with a large guest list that serializes hundreds of UUIDs
        // into the request URL, which can exceed Supabase's gateway
        // URL-length limit and get rejected with a raw, non-JSON
        // "Bad Request" before it ever reaches PostgREST.
        const { data: invitationData, error: invitationError } =
            await admin
                .from("event_invitations")
                .select(
                    "id, registration_id, status, sent_at, opened_at, responded_at, expires_at, decline_reason, updated_at",
                )
                .eq("event_id", eventId);

        if (invitationError) {
            throw new InvitationError(
                invitationError.message,
            );
        }

        const invitationRows = invitationData || [];

        const invitationMap = new Map(
            invitationRows.map((item) => [
                String(item.registration_id),
                item,
            ]),
        );

        const guests = (registrations || []).map(
            (registration) => ({
                ...registration,
                invitation:
                    invitationMap.get(
                        String(registration.id),
                    ) || null,
            }),
        );

        // Stats reflect total headcount (party size), not the number of
        // invitation/registration records — one invite can bring more than
        // one guest, so sum selected_ticket_quantity instead of counting
        // rows. Same fallback-to-1 rule as the party-size badge in the
        // guest table below.
        const partySize = (guest: {
            selected_ticket_quantity: number | null;
        }) =>
            Math.max(
                1,
                Number(
                    guest.selected_ticket_quantity ||
                        1,
                ),
            );
        const sumPartySize = (
            list: typeof guests,
        ) =>
            list.reduce(
                (sum, guest) =>
                    sum + partySize(guest),
                0,
            );

        const stats = {
            total: sumPartySize(guests),
            notInvited: sumPartySize(
                guests.filter(
                    (guest) =>
                        !guest.invitation ||
                        guest.rsvp_status ===
                            "not_invited",
                ),
            ),
            pending: sumPartySize(
                guests.filter((guest) =>
                    ["pending", "opened"].includes(
                        String(
                            guest.invitation
                                ?.status ||
                                guest.rsvp_status,
                        ),
                    ),
                ),
            ),
            accepted: sumPartySize(
                guests.filter(
                    (guest) =>
                        guest.rsvp_status ===
                        "accepted",
                ),
            ),
            declined: sumPartySize(
                guests.filter(
                    (guest) =>
                        guest.rsvp_status ===
                        "declined",
                ),
            ),
        };

        return response({
            success: true,
            event,
            stats,
            guests,
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(
    request: Request,
    {
        params,
    }: {
        params: Promise<{ eventId: string }>;
    },
) {
    try {
        const { eventId } = await params;
        const {
            userId,
            event,
            admin,
        } = await requireInvitationManager(eventId);

        const body = (await request.json()) as Record<
            string,
            unknown
        >;

        const action = String(
            body.action || "send",
        ).toLowerCase();

        const registrationIds = cleanIds(
            body.registrationIds,
        );

        if (registrationIds.length === 0) {
            throw new InvitationError(
                "Select at least one guest.",
            );
        }

        const { data: registrations, error } =
            await admin
                .from("registrations")
                .select(
                    "id, full_name, email, rsvp_status",
                )
                .eq("event_id", eventId)
                .in("id", registrationIds);

        if (error) {
            throw new InvitationError(error.message);
        }

        if (
            !registrations ||
            registrations.length === 0
        ) {
            throw new InvitationError(
                "No matching guests were found.",
                404,
            );
        }

        if (action === "cancel") {
            const { error: cancelError } =
                await admin
                    .from("event_invitations")
                    .update({
                        status: "cancelled",
                        responded_at: null,
                    })
                    .eq("event_id", eventId)
                    .in(
                        "registration_id",
                        registrations.map(
                            (row) => row.id,
                        ),
                    )
                    .in("status", [
                        "pending",
                        "opened",
                    ]);

            if (cancelError) {
                throw new InvitationError(
                    cancelError.message,
                );
            }

            return response({
                success: true,
                message:
                    "Selected pending invitations were cancelled.",
            });
        }

        if (
            action !== "send" &&
            action !== "remind"
        ) {
            throw new InvitationError(
                "Choose a valid invitation action.",
            );
        }

        const validGuests = registrations.filter(
            (registration) =>
                String(registration.email || "")
                    .trim()
                    .includes("@"),
        );

        if (validGuests.length === 0) {
            throw new InvitationError(
                "The selected guests do not have valid email addresses.",
            );
        }

        const templateType =
            action === "remind"
                ? "invitation_reminder"
                : "invitation";

        const { data: template } = await admin
            .from("email_templates")
            .select("subject, body")
            .eq("event_id", eventId)
            .eq("email_type", templateType)
            .maybeSingle();

        const defaultSubject =
            action === "remind"
                ? `RSVP reminder for ${event.event_name}`
                : `You are invited to ${event.event_name}`;

        const defaultBody =
            action === "remind"
                ? `Dear {{name}},

This is a reminder to respond to your invitation for {{event_name}}.

Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Respond here:
{{invite_url}}

RSVP deadline: {{rsvp_deadline}}

Regards,
RegiGo`
                : `Dear {{name}},

You are invited to {{event_name}}.

Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Accept or decline here:
{{invite_url}}

RSVP deadline: {{rsvp_deadline}}

Regards,
RegiGo`;

        const {
            transporter: platformTransporter,
            fromAddress: platformFromAddress,
            fromName,
        } = createSmtpTransport();

        const sender = await resolveCompanySender({
            admin,
            companyId: event.company_id,
            defaultFromName: fromName,
        });

        const transporter = sender.smtp
            ? buildCompanySmtpTransporter(sender.smtp)
            : platformTransporter;
        const fromAddress = sender.smtp?.fromAddress || platformFromAddress;

        const siteUrl = getSiteUrl();
        const expiresAt = invitationExpiry(event);
        const results: {
            registrationId: string;
            email: string;
            status: "sent" | "skipped" | "failed";
            error?: string;
        }[] = [];

        for (const guest of validGuests) {
            const currentRsvp = String(
                guest.rsvp_status || "not_invited",
            );

            if (
                action === "remind" &&
                !["pending", "opened"].includes(
                    currentRsvp,
                )
            ) {
                results.push({
                    registrationId: guest.id,
                    email: guest.email,
                    status: "skipped",
                    error:
                        "Only pending or opened invitations receive reminders.",
                });
                continue;
            }

            if (
                action === "send" &&
                ["accepted", "declined"].includes(
                    currentRsvp,
                )
            ) {
                results.push({
                    registrationId: guest.id,
                    email: guest.email,
                    status: "skipped",
                    error:
                        "This guest has already responded.",
                });
                continue;
            }

            try {
                const token =
                    createInvitationToken();
                const tokenHash =
                    hashInvitationToken(token);
                const sentAt =
                    new Date().toISOString();
                const inviteUrl =
                    `${siteUrl}/event/${encodeURIComponent(
                        event.event_slug,
                    )}/invite/${encodeURIComponent(
                        token,
                    )}`;

                const { error: upsertError } =
                    await admin
                        .from("event_invitations")
                        .upsert(
                            {
                                event_id: eventId,
                                registration_id:
                                    guest.id,
                                token_hash: tokenHash,
                                status: "pending",
                                sent_at: sentAt,
                                opened_at: null,
                                responded_at: null,
                                expires_at:
                                    expiresAt,
                                decline_reason: null,
                                created_by: userId,
                            },
                            {
                                onConflict:
                                    "registration_id",
                            },
                        );

                if (upsertError) {
                    throw new Error(
                        upsertError.message,
                    );
                }

                const values = {
                    name:
                        guest.full_name || "Guest",
                    full_name:
                        guest.full_name || "Guest",
                    email:
                        guest.email || "",
                    event_name:
                        event.event_name || "Event",
                    event_date:
                        formatEventDate(
                            event.event_date,
                        ),
                    event_time:
                        formatEventTime(
                            event.event_time,
                        ),
                    venue:
                        event.venue || "-",
                    invite_url: inviteUrl,
                    accept_url: inviteUrl,
                    decline_url: inviteUrl,
                    rsvp_deadline:
                        formatEventDate(
                            event.rsvp_deadline ||
                                expiresAt,
                        ),
                };

                const subject =
                    replaceTemplateVariables(
                        template?.subject ||
                            defaultSubject,
                        values,
                    );

                const renderedBody =
                    replaceTemplateVariables(
                        template?.body ||
                            defaultBody,
                        values,
                    );

                await transporter.sendMail({
                    from: `"${sender.fromName}" <${fromAddress}>`,
                    to: guest.email,
                    subject,
                    html: buildInvitationEmailHtml({
                        eventName:
                            event.event_name ||
                            "Event",
                        body: renderedBody,
                        inviteUrl,
                    }),
                });

                await admin
                    .from("email_logs")
                    .insert({
                        event_id: eventId,
                        registration_id:
                            guest.id,
                        email_to: guest.email,
                        email_type:
                            templateType,
                        status: "sent",
                        sent_at: sentAt,
                        error_message: null,
                    });

                results.push({
                    registrationId: guest.id,
                    email: guest.email,
                    status: "sent",
                });
            } catch (caught) {
                const message =
                    caught instanceof Error
                        ? caught.message
                        : "Unable to send invitation.";

                await admin
                    .from("email_logs")
                    .insert({
                        event_id: eventId,
                        registration_id:
                            guest.id,
                        email_to: guest.email,
                        email_type:
                            templateType,
                        status: "failed",
                        sent_at: null,
                        error_message: message,
                    });

                results.push({
                    registrationId: guest.id,
                    email: guest.email,
                    status: "failed",
                    error: message,
                });
            }
        }

        const sent = results.filter(
            (result) =>
                result.status === "sent",
        ).length;

        const failed = results.filter(
            (result) =>
                result.status === "failed",
        ).length;

        const skipped = results.filter(
            (result) =>
                result.status === "skipped",
        ).length;

        return response({
            success: sent > 0,
            sent,
            failed,
            skipped,
            results,
            message:
                `${sent} email${sent === 1 ? "" : "s"} sent` +
                (failed
                    ? `, ${failed} failed`
                    : "") +
                (skipped
                    ? `, ${skipped} skipped`
                    : "") +
                ".",
        });
    } catch (error) {
        return handleError(error);
    }
}

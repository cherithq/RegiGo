import { NextResponse } from "next/server";
import {
    CheckInPrintingError,
    requireCheckInPrintingManager,
} from "@/lib/checkin-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(
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

function handle(error: unknown) {
    return json(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage browser printing.",
        },
        error instanceof CheckInPrintingError
            ? error.status
            : 500,
    );
}

function text(value: unknown) {
    return typeof value === "string"
        ? value.trim()
        : "";
}

function integer(
    value: unknown,
    fallback: number,
) {
    const parsed = Number(value);

    return Number.isInteger(parsed)
        ? parsed
        : fallback;
}

async function buildPayload(eventId: string) {
    const configuration =
        await requireCheckInPrintingManager(
            eventId,
        );
    const admin =
        configuration.actor.admin;

    const [
        settingsResult,
        templatesResult,
        registrationsResult,
        requestsResult,
    ] = await Promise.all([
        admin
            .from(
                "badge_browser_print_settings",
            )
            .select(
                "enabled, template_id, copies, print_once_per_registration, max_manual_reprints, successful_scan_values",
            )
            .eq("event_id", eventId)
            .maybeSingle(),

        admin
            .from("badge_templates")
            .select(
                "id, template_name, is_default, is_active",
            )
            .eq("event_id", eventId)
            .eq("is_active", true)
            .order("is_default", {
                ascending: false,
            })
            .order("updated_at", {
                ascending: false,
            }),

        admin
            .from("registrations")
            .select(
                "id, full_name, email, department, rsvp_status, payment_status, created_at",
            )
            .eq("event_id", eventId)
            .order("full_name", {
                ascending: true,
            })
            .limit(1000),

        admin
            .from(
                "badge_browser_print_requests",
            )
            .select(
                "id, registration_id, request_kind, copies, status, reason, badge_job_id, source_check_in_id, claimed_at, lease_expires_at, printed_at, created_at, registrations(full_name, email)",
            )
            .eq("event_id", eventId)
            .order("created_at", {
                ascending: false,
            })
            .limit(150),
    ]);

    for (const result of [
        settingsResult,
        templatesResult,
        registrationsResult,
        requestsResult,
    ]) {
        if (result.error) {
            throw new CheckInPrintingError(
                result.error.message,
            );
        }
    }

    return {
        configuration,
        settings:
            settingsResult.data,
        templates:
            templatesResult.data || [],
        registrations:
            registrationsResult.data ||
            [],
        requests:
            requestsResult.data || [],
    };
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } =
            await params;
        const payload =
            await buildPayload(eventId);

        return json({
            success: true,
            event:
                payload.configuration.event,
            settings:
                payload.settings,
            templates:
                payload.templates,
            registrations:
                payload.registrations,
            requests:
                payload.requests,
        });
    } catch (error) {
        return handle(error);
    }
}

export async function PATCH(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } =
            await params;
        const configuration =
            await requireCheckInPrintingManager(
                eventId,
            );
        const body = (await request.json()) as Record<
            string,
            unknown
        >;

        const templateId =
            text(body.templateId) ||
            null;
        const copies = integer(
            body.copies,
            1,
        );
        const maxManualReprints =
            integer(
                body.maxManualReprints,
                3,
            );

        if (
            copies < 1 ||
            copies > 20
        ) {
            throw new CheckInPrintingError(
                "Copies must be between 1 and 20.",
            );
        }

        if (
            maxManualReprints < 0 ||
            maxManualReprints > 50
        ) {
            throw new CheckInPrintingError(
                "Manual reprint limit must be between 0 and 50. Use 0 for unlimited.",
            );
        }

        if (
            body.enabled === true &&
            !templateId
        ) {
            throw new CheckInPrintingError(
                "Choose a badge template before enabling the print station.",
            );
        }

        const admin =
            configuration.actor.admin;

        if (templateId) {
            const {
                data,
                error,
            } = await admin
                .from("badge_templates")
                .select("id")
                .eq("id", templateId)
                .eq("event_id", eventId)
                .eq("is_active", true)
                .maybeSingle();

            if (error || !data) {
                throw new CheckInPrintingError(
                    error?.message ||
                        "The selected badge template is unavailable.",
                    404,
                );
            }
        }

        const { error } = await admin
            .from(
                "badge_browser_print_settings",
            )
            .upsert(
                {
                    event_id: eventId,
                    enabled:
                        body.enabled ===
                        true,
                    template_id:
                        templateId,
                    copies,
                    print_once_per_registration:
                        body.printOncePerRegistration !==
                        false,
                    max_manual_reprints:
                        maxManualReprints,
                },
                {
                    onConflict:
                        "event_id",
                },
            );

        if (error) {
            throw new CheckInPrintingError(
                error.message,
            );
        }

        return json({
            success: true,
            message:
                "Browser print settings saved.",
        });
    } catch (error) {
        return handle(error);
    }
}

export async function POST(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    try {
        const { eventId } =
            await params;
        const configuration =
            await requireCheckInPrintingManager(
                eventId,
            );
        const admin =
            configuration.actor.admin;
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const action = text(
            body.action,
        );

        if (action === "reprint") {
            const registrationId =
                text(
                    body.registrationId,
                );

            if (!registrationId) {
                throw new CheckInPrintingError(
                    "Choose a guest to print.",
                );
            }

            const {
                data,
                error,
            } = await admin.rpc(
                "regigo_queue_browser_badge_v1",
                {
                    p_event_id:
                        eventId,
                    p_registration_id:
                        registrationId,
                    p_request_kind:
                        "manual",
                    p_source_check_in_id:
                        null,
                    p_requested_by:
                        configuration.actor
                            .userId,
                },
            );

            if (error) {
                throw new CheckInPrintingError(
                    error.message,
                    409,
                );
            }

            const result =
                Array.isArray(data)
                    ? data[0]
                    : data;

            return json({
                success: true,
                request: result,
                message:
                    "Badge added to the browser print queue.",
            });
        }

        if (action === "retry") {
            const requestId =
                text(
                    body.requestId,
                );

            if (!requestId) {
                throw new CheckInPrintingError(
                    "Choose a failed print request.",
                );
            }

            const { error } =
                await admin
                    .from(
                        "badge_browser_print_requests",
                    )
                    .update({
                        status: "pending",
                        reason: null,
                        claimed_at: null,
                        lease_expires_at:
                            null,
                        printed_at: null,
                    })
                    .eq("id", requestId)
                    .eq("event_id", eventId)
                    .in("status", [
                        "failed",
                        "cancelled",
                        "presented",
                    ]);

            if (error) {
                throw new CheckInPrintingError(
                    error.message,
                );
            }

            return json({
                success: true,
                message:
                    "Badge returned to the browser print queue.",
            });
        }

        if (action === "cancel") {
            const requestId =
                text(
                    body.requestId,
                );

            if (!requestId) {
                throw new CheckInPrintingError(
                    "Choose a print request.",
                );
            }

            const { error } =
                await admin
                    .from(
                        "badge_browser_print_requests",
                    )
                    .update({
                        status:
                            "cancelled",
                        reason:
                            "Cancelled by event staff.",
                        lease_expires_at:
                            null,
                    })
                    .eq("id", requestId)
                    .eq("event_id", eventId)
                    .in("status", [
                        "pending",
                        "claimed",
                    ]);

            if (error) {
                throw new CheckInPrintingError(
                    error.message,
                );
            }

            return json({
                success: true,
                message:
                    "Print request cancelled.",
            });
        }

        throw new CheckInPrintingError(
            "Choose a valid browser printing action.",
        );
    } catch (error) {
        return handle(error);
    }
}

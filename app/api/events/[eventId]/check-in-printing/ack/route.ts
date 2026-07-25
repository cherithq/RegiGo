import { NextResponse } from "next/server";
import {
    CheckInPrintingError,
    requireCheckInPrintingManager,
} from "@/lib/checkin-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown) {
    return typeof value === "string"
        ? value.trim()
        : "";
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
        const body = (await request.json()) as Record<
            string,
            unknown
        >;
        const requestId =
            text(body.requestId);
        const status =
            body.status === "failed"
                ? "failed"
                : body.status ===
                    "completed"
                  ? "completed"
                  : "presented";
        const reason =
            text(body.reason) ||
            null;

        if (!requestId) {
            throw new CheckInPrintingError(
                "The browser print request is missing.",
            );
        }

        const admin =
            configuration.actor.admin;

        const {
            data: printRequest,
            error,
        } = await admin
            .from(
                "badge_browser_print_requests",
            )
            .select(
                "id, badge_job_id",
            )
            .eq("id", requestId)
            .eq("event_id", eventId)
            .maybeSingle();

        if (error || !printRequest) {
            throw new CheckInPrintingError(
                error?.message ||
                    "The browser print request could not be found.",
                404,
            );
        }

        const now =
            new Date().toISOString();

        const {
            error: requestError,
        } = await admin
            .from(
                "badge_browser_print_requests",
            )
            .update({
                status,
                reason:
                    status === "failed"
                        ? reason ||
                          "The browser print page reported a failure."
                        : null,
                printed_at:
                    status === "completed"
                        ? now
                        : null,
                lease_expires_at:
                    null,
            })
            .eq("id", requestId)
            .eq("event_id", eventId);

        if (requestError) {
            throw new CheckInPrintingError(
                requestError.message,
            );
        }

        if (
            printRequest.badge_job_id
        ) {
            await admin
                .from(
                    "badge_print_jobs",
                )
                .update({
                    status:
                        status === "failed"
                            ? "failed"
                            : status ===
                                "completed"
                              ? "completed"
                              : "ready",
                    completed_at:
                        status ===
                        "completed"
                            ? now
                            : null,
                    error_message:
                        status ===
                        "failed"
                            ? reason ||
                              "Browser printing failed."
                            : null,
                })
                .eq(
                    "id",
                    printRequest.badge_job_id,
                );
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to update the print request.",
            },
            {
                status:
                    error instanceof
                    CheckInPrintingError
                        ? error.status
                        : 500,
            },
        );
    }
}

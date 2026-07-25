import { NextResponse } from "next/server";
import {
    CheckInPrintingError,
    requireCheckInPrintingManager,
} from "@/lib/checkin-printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
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
        const configuration =
            await requireCheckInPrintingManager(
                eventId,
            );
        const {
            data,
            error,
        } = await configuration.actor.admin.rpc(
            "regigo_claim_browser_badge_v1",
            {
                p_event_id:
                    eventId,
                p_lease_seconds: 180,
            },
        );

        if (error) {
            throw new CheckInPrintingError(
                error.message,
            );
        }

        const request =
            Array.isArray(data)
                ? data[0]
                : data;

        if (!request?.request_id) {
            return NextResponse.json({
                success: true,
                job: null,
            });
        }

        return NextResponse.json({
            success: true,
            job: {
                requestId:
                    request.request_id,
                badgeJobId:
                    request.badge_job_id,
                registrationId:
                    request.registration_id,
                requestKind:
                    request.request_kind,
                copies:
                    request.copies || 1,
                printUrl:
                    `/dashboard/events/${eventId}/badges/jobs/${request.badge_job_id}/print?requestId=${request.request_id}&copies=${request.copies || 1}`,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to claim the next badge.",
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

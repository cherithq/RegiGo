import { NextResponse } from "next/server";
import {
    ZoomBroadcastError,
    createEventZoomMeeting,
    requireZoomBroadcastManager,
} from "@/lib/event-zoom-broadcast";

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
                    : "Unable to manage the Zoom broadcast.",
        },
        error instanceof ZoomBroadcastError
            ? error.status
            : 500,
    );
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
        const { eventId } = await params;
        const configuration =
            await requireZoomBroadcastManager(
                eventId,
            );
        const admin =
            configuration.actor.admin;

        const { data: meeting, error } =
            await admin
                .from(
                    "event_zoom_meetings",
                )
                .select("*")
                .eq("event_id", eventId)
                .maybeSingle();

        if (error) {
            throw new ZoomBroadcastError(
                error.message,
            );
        }

        const { data: company } =
            await admin
                .from("companies")
                .select("zoom_connected")
                .eq(
                    "id",
                    configuration.actor
                        .event.company_id,
                )
                .maybeSingle();

        return json({
            success: true,
            zoomConnected: Boolean(
                company?.zoom_connected,
            ),
            meeting: meeting || null,
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
        const { eventId } = await params;
        const configuration =
            await requireZoomBroadcastManager(
                eventId,
            );

        const body = await request
            .json()
            .catch(() => ({}) as Record<string, unknown>);

        const meeting =
            await createEventZoomMeeting({
                configuration,
                userId:
                    configuration.actor
                        .userId,
                settings: {
                    joinBeforeHost:
                        typeof body.joinBeforeHost ===
                        "boolean"
                            ? body.joinBeforeHost
                            : undefined,
                    waitingRoom:
                        typeof body.waitingRoom ===
                        "boolean"
                            ? body.waitingRoom
                            : undefined,
                    muteUponEntry:
                        typeof body.muteUponEntry ===
                        "boolean"
                            ? body.muteUponEntry
                            : undefined,
                },
            });

        return json({
            success: true,
            message:
                "Zoom meeting created.",
            meeting,
        });
    } catch (error) {
        return handle(error);
    }
}

import {
    NextResponse,
} from "next/server";
import {
    EventConfigurationError,
    loadEventConfiguration,
    saveEventConfiguration,
} from "@/lib/event-configuration";

export const runtime = "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

function reply(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store",
        },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage event settings.",
        },
        error instanceof
        EventConfigurationError
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
        const { eventId } =
            await params;
        const current =
            await loadEventConfiguration(
                eventId,
            );

        return reply({
            success: true,
            event:
                current.event,
            settings:
                current.settings,
        });
    } catch (error) {
        return fail(error);
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
        const body =
            (await request.json()) as Record<
                string,
                any
            >;
        const current =
            await saveEventConfiguration(
                {
                    eventId,
                    body: {
                        enabledModules:
                            body.enabled_modules,
                        registration: {
                            mode:
                                body.registration_mode,
                            isOpen:
                                body.registration_is_open,
                            closedMessage:
                                body.registration_closed_message,
                        },
                    },
                },
            );

        return reply({
            success: true,
            settings:
                current.settings,
        });
    } catch (error) {
        return fail(error);
    }
}

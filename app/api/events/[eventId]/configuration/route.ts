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
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to manage event configuration.",
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
        const configuration =
            await loadEventConfiguration(
                eventId,
            );

        return reply({
            success: true,
            event:
                configuration.event,
            settings:
                configuration.settings,
            companyModules:
                configuration.companyModules,
            moduleCatalog:
                configuration.moduleCatalog,
            addons:
                configuration.addons,
            access:
                configuration.access,
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
        const updated =
            await saveEventConfiguration(
                {
                    eventId,
                    body,
                },
            );

        return reply({
            success: true,
            message:
                "Guest access method, event settings and add-ons saved.",
            event:
                updated.event,
            settings:
                updated.settings,
            companyModules:
                updated.companyModules,
            moduleCatalog:
                updated.moduleCatalog,
            addons:
                updated.addons,
            access:
                updated.access,
        });
    } catch (error) {
        return fail(error);
    }
}

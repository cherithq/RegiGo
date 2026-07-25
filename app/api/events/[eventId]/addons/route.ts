import {
    NextResponse,
} from "next/server";
import {
    eventAddonDefinitions,
    EventConfigurationError,
    loadEventConfiguration,
    type EventAddonKey,
    updateSingleAddon,
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
                    : "Unable to manage event add-ons.",
        },
        error instanceof
        EventConfigurationError
            ? error.status
            : 500,
    );
}

function isAddonKey(
    value: unknown,
): value is EventAddonKey {
    return eventAddonDefinitions.some(
        (item) =>
            item.key === value,
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
            isPlatformAdmin:
                current.access
                    .isPlatformAdmin,
            canManage:
                current.access
                    .canManageAddons,
            addons:
                current.addons.map(
                    (addon) => ({
                        key:
                            addon.key,
                        name:
                            addon.name,
                        description:
                            addon.description,
                        plannedRoute:
                            addon.route,
                        allowed:
                            addon.allowed,
                        enabled:
                            addon.enabled,
                        updatedAt:
                            addon.updatedAt,
                    }),
                ),
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
                unknown
            >;

        if (
            !isAddonKey(
                body.addonKey,
            )
        ) {
            throw new EventConfigurationError(
                "Choose a valid add-on.",
            );
        }

        if (
            typeof body.enabled !==
            "boolean"
        ) {
            throw new EventConfigurationError(
                "Enabled must be true or false.",
            );
        }

        const updated =
            await updateSingleAddon({
                eventId,
                addonKey:
                    body.addonKey,
                enabled:
                    body.enabled,
            });

        return reply({
            success: true,
            message:
                body.enabled
                    ? "Add-on enabled."
                    : "Add-on disabled.",
            addons:
                updated.addons.map(
                    (addon) => ({
                        key:
                            addon.key,
                        name:
                            addon.name,
                        description:
                            addon.description,
                        plannedRoute:
                            addon.route,
                        allowed:
                            addon.allowed,
                        enabled:
                            addon.enabled,
                        updatedAt:
                            addon.updatedAt,
                    }),
                ),
        });
    } catch (error) {
        return fail(error);
    }
}

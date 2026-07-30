import "server-only";

import {
    EventAddonError,
    getEventAddonConfiguration,
} from "@/lib/event-addons";
import { decryptZoomSecret } from "@/lib/company-zoom-crypto";
import {
    createZoomMeeting,
    getZoomAccessToken,
} from "@/lib/zoom";

export class ZoomBroadcastError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "ZoomBroadcastError";
        this.status = status;
    }
}

export async function requireZoomBroadcastManager(
    eventId: string,
) {
    try {
        const configuration =
            await getEventAddonConfiguration(
                eventId,
            );

        const addon =
            configuration.addons.find(
                (item) =>
                    item.key ===
                    "zoom_broadcast",
            );

        if (
            !addon ||
            !addon.allowed ||
            !addon.enabled
        ) {
            throw new ZoomBroadcastError(
                "Zoom Broadcast is not enabled for this event.",
                403,
            );
        }

        if (
            !configuration.actor.canManage
        ) {
            throw new ZoomBroadcastError(
                "You do not have permission to manage this event's Zoom broadcast.",
                403,
            );
        }

        return configuration;
    } catch (error) {
        if (
            error instanceof
            ZoomBroadcastError
        ) {
            throw error;
        }

        if (
            error instanceof
            EventAddonError
        ) {
            throw new ZoomBroadcastError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

// Creates (or replaces) the Zoom meeting for an event, using the company's
// connected Zoom account. Called from the "Create Zoom Meeting"/"Regenerate"
// action on the event's broadcast page.
export type ZoomMeetingSettingsInput = {
    joinBeforeHost?: boolean;
    waitingRoom?: boolean;
    muteUponEntry?: boolean;
};

export async function createEventZoomMeeting({
    configuration,
    userId,
    settings,
}: {
    configuration: Awaited<
        ReturnType<
            typeof requireZoomBroadcastManager
        >
    >;
    userId: string;
    settings?: ZoomMeetingSettingsInput;
}) {
    const admin = configuration.actor.admin;
    const event = configuration.actor.event;

    const { data: company, error: companyError } =
        await admin
            .from("companies")
            .select(
                "zoom_account_id, zoom_client_id, zoom_client_secret_encrypted, zoom_connected",
            )
            .eq("id", event.company_id)
            .maybeSingle();

    if (companyError) {
        throw new ZoomBroadcastError(
            companyError.message,
        );
    }

    if (
        !company?.zoom_connected ||
        !company.zoom_account_id ||
        !company.zoom_client_id ||
        !company.zoom_client_secret_encrypted
    ) {
        throw new ZoomBroadcastError(
            "Connect this company's Zoom account first (Zoom Setup) before creating a broadcast meeting.",
        );
    }

    const accessToken =
        await getZoomAccessToken({
            accountId:
                company.zoom_account_id,
            clientId:
                company.zoom_client_id,
            clientSecret:
                decryptZoomSecret(
                    company.zoom_client_secret_encrypted,
                ),
        });

    const { data: eventDetails } = await admin
        .from("events")
        .select("event_name, event_date, event_time")
        .eq("id", event.id)
        .maybeSingle();

    const startTime = buildZoomStartTime(
        eventDetails?.event_date || null,
        eventDetails?.event_time || null,
    );

    // Regenerating without explicitly changing the toggles should keep
    // whatever was configured last, not silently reset to the defaults —
    // so fall back to the existing row's saved settings before the
    // historical hardcoded defaults (true/false/false).
    const { data: existingMeeting } = await admin
        .from("event_zoom_meetings")
        .select(
            "join_before_host, waiting_room, mute_upon_entry",
        )
        .eq("event_id", event.id)
        .maybeSingle();

    const resolvedSettings = {
        joinBeforeHost:
            settings?.joinBeforeHost ??
            existingMeeting?.join_before_host ??
            true,
        waitingRoom:
            settings?.waitingRoom ??
            existingMeeting?.waiting_room ??
            false,
        muteUponEntry:
            settings?.muteUponEntry ??
            existingMeeting?.mute_upon_entry ??
            false,
    };

    const meeting = await createZoomMeeting({
        accessToken,
        topic:
            eventDetails?.event_name ||
            event.event_name,
        startTime,
        joinBeforeHost:
            resolvedSettings.joinBeforeHost,
        waitingRoom:
            resolvedSettings.waitingRoom,
        muteUponEntry:
            resolvedSettings.muteUponEntry,
    });

    const baseRow = {
        event_id: event.id,
        zoom_meeting_id: String(meeting.id),
        topic: meeting.topic,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        start_time: startTime,
        created_by: userId,
        updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } =
        await admin
            .from("event_zoom_meetings")
            .upsert(
                {
                    ...baseRow,
                    join_before_host:
                        resolvedSettings.joinBeforeHost,
                    waiting_room:
                        resolvedSettings.waitingRoom,
                    mute_upon_entry:
                        resolvedSettings.muteUponEntry,
                },
                { onConflict: "event_id" },
            )
            .select("*")
            .single();

    // The join_before_host/waiting_room/mute_upon_entry columns are a
    // newer addition — if they don't exist in this database yet, retry
    // without them rather than blocking meeting creation entirely (the
    // Zoom meeting itself was already created with the requested
    // settings above; only persisting them locally is affected).
    if (
        saveError &&
        (saveError.message.includes(
            "does not exist",
        ) ||
            saveError.message.includes(
                "schema cache",
            ) ||
            saveError.message.includes(
                "could not find",
            ))
    ) {
        const {
            data: fallbackSaved,
            error: fallbackError,
        } = await admin
            .from("event_zoom_meetings")
            .upsert(baseRow, {
                onConflict: "event_id",
            })
            .select("*")
            .single();

        if (fallbackError) {
            throw new ZoomBroadcastError(
                fallbackError.message,
            );
        }

        return fallbackSaved;
    }

    if (saveError) {
        throw new ZoomBroadcastError(
            saveError.message,
        );
    }

    return saved;
}

function buildZoomStartTime(
    eventDate: string | null,
    eventTime: string | null,
): string | null {
    if (!eventDate) return null;

    const time = eventTime || "09:00";
    const combined = new Date(
        `${eventDate}T${time}`,
    );

    if (Number.isNaN(combined.getTime())) {
        return null;
    }

    return combined.toISOString();
}

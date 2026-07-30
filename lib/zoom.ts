import "server-only";

export class ZoomApiError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "ZoomApiError";
        this.status = status;
    }
}

export type ZoomCredentials = {
    accountId: string;
    clientId: string;
    clientSecret: string;
};

async function readZoomError(response: Response) {
    try {
        const body = await response.json();

        return (
            body?.message ||
            body?.reason ||
            `Zoom API request failed (${response.status}).`
        );
    } catch {
        return `Zoom API request failed (${response.status}).`;
    }
}

// Server-to-Server OAuth (account_credentials grant) — the account-level
// automation flow Zoom requires now that JWT apps are retired. No user
// consent/redirect step: the client id/secret pair alone is enough to mint
// short-lived access tokens scoped to the connected Zoom account.
export async function getZoomAccessToken({
    accountId,
    clientId,
    clientSecret,
}: ZoomCredentials): Promise<string> {
    const basicAuth = Buffer.from(
        `${clientId}:${clientSecret}`,
    ).toString("base64");

    const response = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
            accountId,
        )}`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${basicAuth}`,
            },
            cache: "no-store",
        },
    );

    if (!response.ok) {
        throw new ZoomApiError(
            `Unable to authenticate with Zoom: ${await readZoomError(
                response,
            )}`,
            response.status === 401 ? 401 : 502,
        );
    }

    const data = (await response.json()) as {
        access_token?: string;
    };

    if (!data.access_token) {
        throw new ZoomApiError(
            "Zoom did not return an access token.",
            502,
        );
    }

    return data.access_token;
}

// Throws (via getZoomAccessToken) if the credentials don't work — used to
// verify a company's Zoom connection before saving it, same as the SMTP
// connect route verifies via transporter.verify().
export async function verifyZoomCredentials(
    credentials: ZoomCredentials,
): Promise<void> {
    await getZoomAccessToken(credentials);
}

// Zoom's own "type" values for GET /users/me — 1 is Basic/Free, which caps
// meetings with 3+ participants at 40 minutes; 2 (Licensed) and 3 (On-prem)
// have no such default cap. Used only to warn the organiser, never to
// block anything — a lookup failure just means the warning can't be shown.
export async function getZoomAccountPlanType({
    accessToken,
}: {
    accessToken: string;
}): Promise<"basic" | "licensed" | "on_prem" | "unknown"> {
    try {
        const response = await fetch(
            "https://api.zoom.us/v2/users/me",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                cache: "no-store",
            },
        );

        if (!response.ok) {
            // Swallowed everywhere else so a lookup failure never breaks
            // the page — but silently returning "unknown" makes this
            // impossible to diagnose from the outside, so log the actual
            // Zoom error server-side. The most likely cause: the
            // Server-to-Server OAuth app is missing a user-read scope
            // (e.g. "View a user"/user:read:user:admin) — meeting scopes
            // alone are enough to create meetings but not to read plan
            // type via GET /users/me.
            console.error(
                "getZoomAccountPlanType: GET /users/me failed —",
                await readZoomError(response),
                `(scope likely missing on the Server-to-Server app; status ${response.status})`,
            );
            return "unknown";
        }

        const data = (await response.json()) as {
            type?: number;
        };

        if (data.type === 1) return "basic";
        if (data.type === 2) return "licensed";
        if (data.type === 3) return "on_prem";

        console.error(
            "getZoomAccountPlanType: unrecognized user type in response —",
            data,
        );
        return "unknown";
    } catch (error) {
        console.error(
            "getZoomAccountPlanType: request failed —",
            error,
        );
        return "unknown";
    }
}

export type ZoomMeeting = {
    id: number;
    topic: string;
    join_url: string;
    start_url: string;
    start_time: string | null;
};

export async function createZoomMeeting({
    accessToken,
    topic,
    startTime,
    timezone,
    joinBeforeHost = true,
    waitingRoom = false,
    muteUponEntry = false,
}: {
    accessToken: string;
    topic: string;
    startTime: string | null;
    timezone?: string;
    joinBeforeHost?: boolean;
    waitingRoom?: boolean;
    muteUponEntry?: boolean;
}): Promise<ZoomMeeting> {
    const response = await fetch(
        "https://api.zoom.us/v2/users/me/meetings",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
                topic,
                type: startTime ? 2 : 3,
                start_time: startTime || undefined,
                timezone: startTime
                    ? timezone || "UTC"
                    : undefined,
                settings: {
                    // When waiting_room is on, Zoom ignores
                    // join_before_host — guests wait in the room
                    // regardless, so it's safe to pass both as given.
                    join_before_host: joinBeforeHost,
                    approval_type: 2,
                    waiting_room: waitingRoom,
                    mute_upon_entry: muteUponEntry,
                },
            }),
        },
    );

    if (!response.ok) {
        throw new ZoomApiError(
            `Unable to create the Zoom meeting: ${await readZoomError(
                response,
            )}`,
            502,
        );
    }

    return (await response.json()) as ZoomMeeting;
}

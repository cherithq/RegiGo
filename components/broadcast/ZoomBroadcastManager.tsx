"use client";

import Link from "next/link";
import {
    Calendar,
    CircleAlert,
    Copy,
    Loader2,
    RefreshCw,
    Video,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type Meeting = {
    zoom_meeting_id: string;
    topic: string | null;
    join_url: string;
    start_time: string | null;
    updated_at: string;
    join_before_host?: boolean | null;
    waiting_room?: boolean | null;
    mute_upon_entry?: boolean | null;
};

type Payload = {
    zoomConnected: boolean;
    zoomAccountPlan?:
        | "basic"
        | "licensed"
        | "on_prem"
        | "unknown"
        | null;
    meeting: Meeting | null;
};

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error:
                text ||
                "The server returned an invalid response.",
        };
    }
}

export default function ZoomBroadcastManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(null);
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState(false);
    const [message, setMessage] =
        useState("");
    const [error, setError] = useState("");
    const [requireHostStart, setRequireHostStart] =
        useState(false);
    const [waitingRoom, setWaitingRoom] =
        useState(false);
    const [muteUponEntry, setMuteUponEntry] =
        useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/zoom-meeting`,
                { cache: "no-store" },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to load the Zoom broadcast.",
                );
            }

            setData(result as Payload);
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to load the Zoom broadcast.",
            );
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!data?.meeting) return;

        setRequireHostStart(
            data.meeting.join_before_host === false,
        );
        setWaitingRoom(
            Boolean(data.meeting.waiting_room),
        );
        setMuteUponEntry(
            Boolean(data.meeting.mute_upon_entry),
        );
    }, [data]);

    async function createMeeting() {
        setWorking(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/zoom-meeting`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        joinBeforeHost:
                            !requireHostStart,
                        waitingRoom,
                        muteUponEntry,
                    }),
                },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to create the Zoom meeting.",
                );
            }

            setMessage(
                result.message ||
                    "Zoom meeting created.",
            );
            await load();
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to create the Zoom meeting.",
            );
        } finally {
            setWorking(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-10">
                <Loader2
                    className="animate-spin text-[#4F46E5]"
                    size={22}
                />
            </div>
        );
    }

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {error && (
                <div className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    <CircleAlert
                        size={16}
                        className="mt-0.5 shrink-0"
                    />
                    {error}
                </div>
            )}

            {message && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {message}
                </div>
            )}

            {data && !data.zoomConnected && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                    <p className="font-black">
                        Connect a Zoom account first
                    </p>
                    <p className="mt-1">
                        This event company hasn&apos;t connected a
                        Zoom account yet.
                    </p>
                    <Link
                        href="/dashboard/zoom-setup"
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 font-black text-white"
                    >
                        Go to Zoom Setup
                    </Link>
                </div>
            )}

            {data?.zoomConnected &&
                data.zoomAccountPlan === "basic" && (
                    <div className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        <CircleAlert
                            size={16}
                            className="mt-0.5 shrink-0"
                        />
                        <span>
                            <span className="font-black">
                                This Zoom account is on the
                                Free/Basic plan.
                            </span>{" "}
                            Zoom automatically ends meetings
                            with 3 or more participants after{" "}
                            <span className="font-black">
                                40 minutes
                            </span>
                            . Upgrade to a paid Zoom plan
                            (Pro or above) to remove this
                            limit for your event broadcast.
                        </span>
                    </div>
                )}

            {data?.zoomConnected && (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-black text-slate-700">
                        Meeting Settings
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Applied the next time you create or
                        regenerate the meeting below.
                    </p>

                    <div className="mt-4 space-y-3">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={requireHostStart}
                                onChange={(event) =>
                                    setRequireHostStart(
                                        event.target.checked,
                                    )
                                }
                                className="mt-1 h-4 w-4 accent-[#4F46E5]"
                            />
                            <span>
                                <span className="block text-sm font-black">
                                    Only start once the host
                                    starts the meeting
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    When on, guests wait until
                                    you start the meeting from
                                    Zoom. When off, guests can
                                    join and start talking
                                    before you arrive.
                                </span>
                            </span>
                        </label>

                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={waitingRoom}
                                onChange={(event) =>
                                    setWaitingRoom(
                                        event.target.checked,
                                    )
                                }
                                className="mt-1 h-4 w-4 accent-[#4F46E5]"
                            />
                            <span>
                                <span className="block text-sm font-black">
                                    Enable waiting room
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    Guests wait in a virtual
                                    lobby until you admit them.
                                </span>
                            </span>
                        </label>

                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={muteUponEntry}
                                onChange={(event) =>
                                    setMuteUponEntry(
                                        event.target.checked,
                                    )
                                }
                                className="mt-1 h-4 w-4 accent-[#4F46E5]"
                            />
                            <span>
                                <span className="block text-sm font-black">
                                    Mute participants on entry
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    Guests join muted and can
                                    unmute themselves.
                                </span>
                            </span>
                        </label>
                    </div>
                </div>
            )}

            {data?.zoomConnected &&
                !data.meeting && (
                    <div className="rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-6 text-center">
                        <Video
                            className="mx-auto text-[#4F46E5]"
                            size={28}
                        />
                        <p className="mt-3 font-black text-slate-900">
                            No Zoom meeting yet
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Create one to start sending the join link
                            in confirmation emails.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                void createMeeting()
                            }
                            disabled={working}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {working ? (
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                            ) : (
                                <Video
                                    size={16}
                                />
                            )}
                            Create Zoom Meeting
                        </button>
                    </div>
                )}

            {data?.meeting && (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-sm font-black uppercase tracking-[0.1em] text-emerald-700">
                            Meeting created
                        </p>
                        <p className="mt-2 text-lg font-black text-slate-900">
                            {data.meeting.topic ||
                                "Zoom Broadcast"}
                        </p>

                        {data.meeting
                            .start_time && (
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                                <Calendar
                                    size={14}
                                />
                                {new Date(
                                    data.meeting.start_time,
                                ).toLocaleString(
                                    undefined,
                                    {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "numeric",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        hour12: true,
                                    },
                                )}
                            </p>
                        )}

                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                                {
                                    data.meeting
                                        .join_url
                                }
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    void navigator.clipboard.writeText(
                                        data.meeting!
                                            .join_url,
                                    )
                                }
                                className="shrink-0 rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                                title="Copy join link"
                            >
                                <Copy
                                    size={16}
                                />
                            </button>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-slate-500">
                            This link is sent automatically in the
                            confirmation email for every guest who
                            registers or accepts an RSVP invitation.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void createMeeting()
                        }
                        disabled={working}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {working ? (
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                        ) : (
                            <RefreshCw
                                size={16}
                            />
                        )}
                        Regenerate Meeting
                    </button>
                </div>
            )}
        </section>
    );
}

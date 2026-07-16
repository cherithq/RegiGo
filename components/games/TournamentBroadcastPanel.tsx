"use client";

import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    History,
    Info,
    Loader2,
    Megaphone,
    MonitorUp,
    PanelTop,
    PartyPopper,
    Send,
    Trash2,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type BroadcastTone =
    | "info"
    | "warning"
    | "celebration";

type BroadcastMode =
    | "banner"
    | "takeover";

type BroadcastHistoryItem = {
    id: string;
    title: string;
    message: string;
    tone: BroadcastTone;
    displayMode: BroadcastMode;
    active: boolean;
    createdAt?: string | null;
    expiresAt?: string | null;
    clearedAt?: string | null;
};

type BroadcastState = {
    tournamentStatus?: string;
    broadcastActive?: boolean;
    broadcastId?: string | null;
    broadcastTitle?: string | null;
    broadcastMessage?: string | null;
    broadcastTone?: BroadcastTone | null;
    broadcastDisplayMode?: BroadcastMode | null;
    broadcastSecondsRemaining?: number | null;
    broadcastExpiresAt?: string | null;
    history?: BroadcastHistoryItem[];
};

const PRESETS = [
    {
        label: "Stay on Page",
        title: "Please Keep This Page Open",
        message:
            "The next round will begin shortly. Keep your phone connected and wait for the organiser.",
        tone: "info" as BroadcastTone,
        displayMode: "banner" as BroadcastMode,
        durationSeconds: 30,
    },
    {
        label: "Technical Pause",
        title: "Technical Pause",
        message:
            "Please stand by while the event team checks the tournament connection.",
        tone: "warning" as BroadcastTone,
        displayMode: "takeover" as BroadcastMode,
        durationSeconds: 0,
    },
    {
        label: "Finalists Prepare",
        title: "Finalists, Please Get Ready",
        message:
            "The live final will begin shortly. Keep your phone open and watch the audience screen.",
        tone: "celebration" as BroadcastTone,
        displayMode: "takeover" as BroadcastMode,
        durationSeconds: 45,
    },
];

async function readPayload(
    response: Response
): Promise<Record<string, any>> {
    const text = await response.text();

    if (!text.trim()) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            "Broadcast API returned an invalid response."
        );
    }
}

export default function TournamentBroadcastPanel({
    eventId,
}: {
    eventId: string;
}) {
    const [state, setState] =
        useState<BroadcastState>({});
    const [title, setTitle] =
        useState("");
    const [message, setMessage] =
        useState("");
    const [tone, setTone] =
        useState<BroadcastTone>("info");
    const [displayMode, setDisplayMode] =
        useState<BroadcastMode>("banner");
    const [
        durationSeconds,
        setDurationSeconds,
    ] = useState(30);
    const [working, setWorking] =
        useState("");
    const [feedback, setFeedback] =
        useState("");

    const reload = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/broadcast`,
                {
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to load host broadcasts."
                );
            }

            setState(data.broadcast || {});
        } catch (error) {
            setFeedback(
                error instanceof Error
                    ? error.message
                    : "Unable to load host broadcasts."
            );
        }
    }, [eventId]);

    useEffect(() => {
        void reload();

        const timer = window.setInterval(
            () => void reload(),
            1000
        );

        return () =>
            window.clearInterval(timer);
    }, [reload]);

    const canUseTakeover = ![
        "countdown",
        "active",
    ].includes(
        state.tournamentStatus || ""
    );

    useEffect(() => {
        if (
            !canUseTakeover &&
            displayMode === "takeover"
        ) {
            setDisplayMode("banner");
        }
    }, [canUseTakeover, displayMode]);

    const currentToneClasses = useMemo(
        () =>
            state.broadcastTone ===
            "warning"
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : state.broadcastTone ===
                    "celebration"
                  ? "border-pink-200 bg-pink-50 text-pink-900"
                  : "border-indigo-200 bg-[#F7F5FF] text-indigo-900",
        [state.broadcastTone]
    );

    async function perform(
        action: "publish" | "clear"
    ) {
        setWorking(action);
        setFeedback("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/broadcast`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        action,
                        title,
                        message,
                        tone,
                        displayMode,
                        durationSeconds,
                    }),
                    cache: "no-store",
                }
            );
            const data =
                await readPayload(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to update the broadcast."
                );
            }

            setState(data.broadcast || {});

            if (action === "publish") {
                setFeedback(
                    displayMode === "takeover"
                        ? "Full-screen broadcast published."
                        : "Broadcast banner published."
                );
            } else {
                setFeedback(
                    "Current broadcast cleared."
                );
            }
        } catch (error) {
            setFeedback(
                error instanceof Error
                    ? error.message
                    : "Unable to update the broadcast."
            );
        } finally {
            setWorking("");
        }
    }

    function applyPreset(
        preset: (typeof PRESETS)[number]
    ) {
        setTitle(preset.title);
        setMessage(preset.message);
        setTone(preset.tone);
        setDisplayMode(
            preset.displayMode === "takeover" &&
                !canUseTakeover
                ? "banner"
                : preset.displayMode
        );
        setDurationSeconds(
            preset.durationSeconds
        );
        setFeedback(
            "Preset loaded. Review it, then publish."
        );
    }

    const history = state.history || [];

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                            <Megaphone size={21} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
                                Host Broadcast
                            </p>
                            <h2 className="mt-1 text-2xl font-black">
                                Message every tournament screen
                            </h2>
                        </div>
                    </div>

                    <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-500">
                        Use a banner during gameplay. Use a full-screen takeover
                        during a pause, lobby, result reveal or intermission.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                                applyPreset(preset)
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {state.broadcastActive && (
                <div
                    className={`mt-6 rounded-2xl border p-5 ${currentToneClasses}`}
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] opacity-65">
                                {state.broadcastDisplayMode ===
                                "takeover" ? (
                                    <MonitorUp
                                        size={15}
                                    />
                                ) : (
                                    <PanelTop
                                        size={15}
                                    />
                                )}
                                Live{" "}
                                {state.broadcastDisplayMode ||
                                    "banner"}
                            </p>
                            <h3 className="mt-2 text-xl font-black">
                                {state.broadcastTitle}
                            </h3>
                            <p className="mt-2 text-sm font-bold leading-6 opacity-75">
                                {state.broadcastMessage}
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                            {state.broadcastSecondsRemaining !==
                                null &&
                                state.broadcastSecondsRemaining !==
                                    undefined && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-black">
                                        <Clock3
                                            size={14}
                                        />
                                        {
                                            state.broadcastSecondsRemaining
                                        }s
                                    </span>
                                )}

                            <button
                                type="button"
                                onClick={() =>
                                    void perform(
                                        "clear"
                                    )
                                }
                                disabled={Boolean(
                                    working
                                )}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black shadow-sm disabled:opacity-50"
                            >
                                {working === "clear" ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Trash2
                                        size={16}
                                    />
                                )}
                                Clear Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_340px]">
                <div className="grid gap-4">
                    <label>
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            Title
                        </span>
                        <input
                            value={title}
                            onChange={(event) =>
                                setTitle(
                                    event.target.value
                                )
                            }
                            maxLength={80}
                            placeholder="Round starts shortly"
                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white"
                        />
                    </label>

                    <label>
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            Message
                        </span>
                        <textarea
                            value={message}
                            onChange={(event) =>
                                setMessage(
                                    event.target.value
                                )
                            }
                            maxLength={500}
                            rows={4}
                            placeholder="Keep your tournament page open and wait for the organiser."
                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 outline-none transition focus:border-indigo-300 focus:bg-white"
                        />
                        <span className="mt-1 block text-right text-xs font-bold text-slate-400">
                            {message.length}/500
                        </span>
                    </label>

                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            Tone
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                            <ToneButton
                                selected={
                                    tone === "info"
                                }
                                icon={
                                    <Info size={17} />
                                }
                                label="Information"
                                onClick={() =>
                                    setTone("info")
                                }
                            />
                            <ToneButton
                                selected={
                                    tone === "warning"
                                }
                                icon={
                                    <AlertTriangle
                                        size={17}
                                    />
                                }
                                label="Warning"
                                onClick={() =>
                                    setTone(
                                        "warning"
                                    )
                                }
                            />
                            <ToneButton
                                selected={
                                    tone ===
                                    "celebration"
                                }
                                icon={
                                    <PartyPopper
                                        size={17}
                                    />
                                }
                                label="Celebration"
                                onClick={() =>
                                    setTone(
                                        "celebration"
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="grid content-start gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            Display
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <ModeButton
                                selected={
                                    displayMode ===
                                    "banner"
                                }
                                icon={
                                    <PanelTop
                                        size={18}
                                    />
                                }
                                label="Banner"
                                onClick={() =>
                                    setDisplayMode(
                                        "banner"
                                    )
                                }
                            />
                            <ModeButton
                                selected={
                                    displayMode ===
                                    "takeover"
                                }
                                disabled={
                                    !canUseTakeover
                                }
                                icon={
                                    <MonitorUp
                                        size={18}
                                    />
                                }
                                label="Takeover"
                                onClick={() =>
                                    setDisplayMode(
                                        "takeover"
                                    )
                                }
                            />
                        </div>

                        {!canUseTakeover && (
                            <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                                Pause the active round before using a full-screen
                                takeover.
                            </p>
                        )}
                    </div>

                    <label>
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            Duration
                        </span>
                        <select
                            value={durationSeconds}
                            onChange={(event) =>
                                setDurationSeconds(
                                    Number(
                                        event.target
                                            .value
                                    )
                                )
                            }
                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none"
                        >
                            <option value={15}>
                                15 seconds
                            </option>
                            <option value={30}>
                                30 seconds
                            </option>
                            <option value={45}>
                                45 seconds
                            </option>
                            <option value={60}>
                                1 minute
                            </option>
                            <option value={120}>
                                2 minutes
                            </option>
                            <option value={0}>
                                Until cleared
                            </option>
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={() =>
                            void perform("publish")
                        }
                        disabled={
                            Boolean(working) ||
                            !title.trim() ||
                            !message.trim()
                        }
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 text-sm font-black text-white shadow-lg disabled:opacity-45"
                    >
                        {working === "publish" ? (
                            <Loader2
                                size={18}
                                className="animate-spin"
                            />
                        ) : (
                            <Send size={18} />
                        )}
                        Publish Broadcast
                    </button>
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-700">
                        <History size={17} />
                        Recent Broadcasts
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {history
                            .slice(0, 6)
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-black text-slate-900">
                                            {item.title}
                                        </p>
                                        {item.active ? (
                                            <CheckCircle2
                                                size={17}
                                                className="text-emerald-600"
                                            />
                                        ) : null}
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-500">
                                        {item.message}
                                    </p>
                                    <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                        {item.displayMode} ·{" "}
                                        {item.tone}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {feedback && (
                <p className="mt-5 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-[#4F46E5]">
                    {feedback}
                </p>
            )}
        </section>
    );
}

function ToneButton({
    selected,
    icon,
    label,
    onClick,
}: {
    selected: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black transition ${
                selected
                    ? "border-indigo-300 bg-[#F7F5FF] text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

function ModeButton({
    selected,
    disabled = false,
    icon,
    label,
    onClick,
}: {
    selected: boolean;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
                selected
                    ? "border-indigo-300 bg-[#F7F5FF] text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

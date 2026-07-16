"use client";

import {
    CheckCircle2,
    CircleDot,
    Loader2,
    Radio,
    UserRoundCheck,
    UserRoundX,
    Wifi,
    WifiOff,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type ReadyPlayer = {
    id: string;
    name: string;
    email?: string | null;
    ready: boolean;
    online: boolean;
    readyAt?: string | null;
    lastSeenAt?: string | null;
};

type ReadyState = {
    tournamentStatus?: string;
    readyTargetRound?: number;
    readyCount?: number;
    readyTotal?: number;
    onlineCount?: number;
    allReady?: boolean;
    readyOpen?: boolean;
    nextGameKey?: string;
    nextGameTitle?: string;
    players?: ReadyPlayer[];
};

export default function TournamentReadyPanel({
    eventId,
}: {
    eventId: string;
}) {
    const [state, setState] =
        useState<ReadyState>({});
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");

    const reload = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/ready`,
                { cache: "no-store" }
            );
            const text = await response.text();
            const data = text.trim()
                ? JSON.parse(text)
                : {};

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to load ready check."
                );
            }

            setState(data.ready || {});
            setError("");
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to load ready check."
            );
        } finally {
            setLoading(false);
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

    const players = state.players || [];
    const notReady = players.filter(
        (player) => !player.ready
    );
    const canShowReadyCheck =
        state.readyOpen === true;

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                            <Radio size={21} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                Ready Check
                            </p>
                            <h2 className="mt-1 text-2xl font-black">
                                Round {state.readyTargetRound || 1}
                            </h2>
                        </div>
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-500">
                        Next game:{" "}
                        <span className="text-slate-900">
                            {state.nextGameTitle ||
                                "Tap, Tap, Tap"}
                        </span>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <ReadyStat
                        label="Ready"
                        value={`${state.readyCount || 0}/${state.readyTotal || 0}`}
                        icon={
                            <UserRoundCheck
                                size={19}
                            />
                        }
                    />
                    <ReadyStat
                        label="Online"
                        value={`${state.onlineCount || 0}/${state.readyTotal || 0}`}
                        icon={<Wifi size={19} />}
                    />
                    <ReadyStat
                        label="Status"
                        value={
                            state.allReady
                                ? "All Ready"
                                : "Waiting"
                        }
                        icon={
                            state.allReady ? (
                                <CheckCircle2
                                    size={19}
                                />
                            ) : (
                                <CircleDot
                                    size={19}
                                />
                            )
                        }
                    />
                </div>
            </div>

            {loading ? (
                <div className="mt-5 flex items-center justify-center rounded-2xl bg-slate-50 p-6 text-slate-400">
                    <Loader2
                        size={22}
                        className="animate-spin"
                    />
                </div>
            ) : error ? (
                <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                </p>
            ) : !canShowReadyCheck ? (
                <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-500">
                    {state.tournamentStatus === "round_complete"
                        ? "Reveal the results and open the next ready check first."
                        : "Ready status is locked while a round is counting down or active."}
                </p>
            ) : players.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-400">
                    Ready status appears after guests join the tournament.
                </p>
            ) : (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
                            <UserRoundCheck size={17} />
                            Ready Players
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {players
                                .filter(
                                    (player) =>
                                        player.ready
                                )
                                .map((player) => (
                                    <span
                                        key={player.id}
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm"
                                    >
                                        {player.online ? (
                                            <Wifi size={13} />
                                        ) : (
                                            <WifiOff
                                                size={13}
                                            />
                                        )}
                                        {player.name}
                                    </span>
                                ))}

                            {state.readyCount === 0 && (
                                <span className="text-sm font-bold text-emerald-700/60">
                                    No players ready yet.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-black text-amber-800">
                            <UserRoundX size={17} />
                            Not Ready
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {notReady.map((player) => (
                                <span
                                    key={player.id}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-amber-800 shadow-sm"
                                >
                                    {player.online ? (
                                        <Wifi size={13} />
                                    ) : (
                                        <WifiOff
                                            size={13}
                                        />
                                    )}
                                    {player.name}
                                </span>
                            ))}

                            {notReady.length === 0 && (
                                <span className="text-sm font-bold text-emerald-700">
                                    Everyone is ready.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <p className="mt-4 text-xs font-bold text-slate-400">
                A player is shown as online when their phone has contacted the tournament within the last 20 seconds.
            </p>
        </section>
    );
}

function ReadyStat({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="min-w-[120px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-emerald-700">
                {icon}
            </div>
            <p className="mt-2 text-xl font-black">
                {value}
            </p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
        </div>
    );
}

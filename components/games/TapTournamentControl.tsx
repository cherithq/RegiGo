"use client";

import {
    Download,
    Coins,
    ExternalLink,
    History,
    Lock,
    Play,
    QrCode,
    RefreshCw,
    RotateCcw,
    Search,
    Swords,
    Trophy,
    Unlock,
    UserMinus,
    UserPlus,
    Users,
    Zap,
} from "lucide-react";
import QRCode from "qrcode";
import {
    type ButtonHTMLAttributes,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type Leader = {
    position: number;
    name: string;
    taps: number;
    score?: number;
    scoreLabel?: string;
    advanced: boolean;
    playerStatus: string;
};

type ManagedPlayer = {
    id: string;
    name: string;
    email?: string | null;
    status: string;
    joinedAt?: string | null;
    lastSeenAt?: string | null;
    eliminatedRound?: number | null;
    currentScore?: number;
    currentRank?: number | null;
    advanced?: boolean | null;
};

type ManagedRound = {
    id: string;
    roundNumber: number;
    gameKey?:
        | "tap_fast"
        | "coin_flip"
        | "tic_tac_toe";
    gameTitle?: string;
    scoreLabel?: string;
    status: string;
    playerCount: number;
    advanceCount: number;
    isFinal: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    completedAt?: string | null;
    topScore?: number | null;
    topPlayer?: string | null;
};

type ManagedAction = {
    id: string;
    action: string;
    playerName?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    createdAt?: string | null;
};

type ManagementState = {
    tournamentStatus?: string;
    currentRound?: number;
    players?: ManagedPlayer[];
    rounds?: ManagedRound[];
    actions?: ManagedAction[];
};

type TournamentState = {
    tournamentStatus?: string;
    gameKey?:
        | "tap_fast"
        | "coin_flip"
        | "tic_tac_toe";
    gameTitle?: string;
    scoreLabel?: string;
    completedPlayers?: number;
    tttTotalMatches?: number;
    tttCompletedMatches?: number;
    tttMatches?: Array<{
        id: string;
        pairNumber: number;
        playerXName: string;
        playerOName?: string | null;
        status: string;
        winnerName?: string | null;
        rematchCount?: number;
    }>;
    currentRound?: number;
    joinedPlayers?: number;
    activePlayers?: number;
    championName?: string | null;
    roundStatus?: string | null;
    roundNumber?: number | null;
    playerCount?: number | null;
    advanceCount?: number | null;
    isFinal?: boolean | null;
    secondsUntilStart?: number;
    secondsRemaining?: number;
    leaderboard?: Leader[];
};

type ApiPayload = Record<string, any>;

async function readApiPayload(
    response: Response,
    routeLabel: string
): Promise<ApiPayload> {
    const responseText = await response.text();

    if (!responseText.trim()) {
        return {};
    }

    try {
        return JSON.parse(responseText) as ApiPayload;
    } catch {
        const isLoginRedirect =
            response.redirected &&
            /\/(auth|login)(\/|\?|$)/i.test(
                response.url
            );

        if (isLoginRedirect) {
            throw new Error(
                "Your session has expired. Sign in again and reopen the tournament page."
            );
        }

        const looksLikeHtml =
            responseText
                .trimStart()
                .toLowerCase()
                .startsWith("<!doctype") ||
            responseText
                .trimStart()
                .toLowerCase()
                .startsWith("<html");

        if (looksLikeHtml) {
            throw new Error(
                `${routeLabel} returned a webpage instead of JSON. ` +
                    "Replace the matching API route using the latest fix, " +
                    "confirm the [eventId] folder name contains the square brackets, " +
                    "then restart Next.js."
            );
        }

        throw new Error(
            `${routeLabel} returned an invalid server response.`
        );
    }
}

export default function TapTournamentControl({
    eventId,
    eventName,
    slug,
}: {
    eventId: string;
    eventName: string;
    slug: string;
}) {
    const [state, setState] = useState<TournamentState>({});
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState("");
    const [managementWarning, setManagementWarning] =
        useState("");
    const [management, setManagement] =
        useState<ManagementState>({});
    const [playerSearch, setPlayerSearch] = useState("");
    const [playerStatusFilter, setPlayerStatusFilter] =
        useState("all");
    const [managingPlayerId, setManagingPlayerId] =
        useState("");
    const [nextGameKey, setNextGameKey] = useState<
        | "tap_fast"
        | "coin_flip"
        | "tic_tac_toe"
    >("tap_fast");

    const playerUrl = useMemo(
        () =>
            typeof window === "undefined"
                ? `/event/${slug}/games`
                : `${window.location.origin}/event/${slug}/games`,
        [slug]
    );

    const displayUrl = `/event/${slug}/games/display`;

    const reload = useCallback(async () => {
        try {
            const stateResponse = await fetch(
                `/api/events/${eventId}/games/tournament`,
                {
                    cache: "no-store",
                }
            );

            const stateData = await readApiPayload(
                stateResponse,
                "Tournament API"
            );

            if (!stateResponse.ok) {
                throw new Error(
                    String(
                        stateData.error ||
                            `Tournament API failed with status ${stateResponse.status}.`
                    )
                );
            }

            setState(stateData.state || {});

            // Player management is useful but must not stop the main
            // tournament screen from loading.
            try {
                const managementResponse = await fetch(
                    `/api/events/${eventId}/games/tournament/manage`,
                    {
                        cache: "no-store",
                    }
                );

                const managementData =
                    await readApiPayload(
                        managementResponse,
                        "Tournament management API"
                    );

                if (!managementResponse.ok) {
                    throw new Error(
                        String(
                            managementData.error ||
                                `Management API failed with status ${managementResponse.status}.`
                        )
                    );
                }

                setManagement(
                    managementData.management || {}
                );
                setManagementWarning("");
            } catch (managementError) {
                setManagementWarning(
                    managementError instanceof Error
                        ? managementError.message
                        : "Tournament management tools are unavailable."
                );
            }
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load the tournament."
            );
        }
    }, [eventId]);

    useEffect(() => {
        void reload();

        const timer = window.setInterval(
            () => void reload(),
            900
        );

        return () => window.clearInterval(timer);
    }, [reload]);

    useEffect(() => {
        if (
            Number(state.activePlayers || 0) <= 10 &&
            nextGameKey === "tic_tac_toe"
        ) {
            setNextGameKey("tap_fast");
        }
    }, [nextGameKey, state.activePlayers]);

    useEffect(() => {
        void QRCode.toDataURL(playerUrl, {
            width: 560,
            margin: 1,
            errorCorrectionLevel: "H",
        }).then(setQrDataUrl);
    }, [playerUrl]);

    async function perform(
        endpoint: string,
        body?: Record<string, unknown>
    ) {
        setWorking(endpoint);
        setMessage("");

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body || {}),
                cache: "no-store",
            });
            const data = await readApiPayload(
                response,
                "Tournament action API"
            );

            if (!response.ok) {
                throw new Error(
                    data.error || "Tournament action failed."
                );
            }

            setMessage(
                data.message || "Tournament updated."
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Tournament action failed."
            );
        } finally {
            setWorking("");
        }
    }

    async function managePlayer(
        player: ManagedPlayer,
        action: "remove" | "eliminate" | "restore"
    ) {
        const label =
            action === "remove"
                ? "remove"
                : action === "restore"
                  ? "restore"
                  : "eliminate";

        if (
            !window.confirm(
                `${label[0].toUpperCase()}${label.slice(
                    1
                )} ${player.name}?`
            )
        ) {
            return;
        }

        setManagingPlayerId(player.id);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/games/tournament/manage`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        playerId: player.id,
                        action,
                    }),
                    cache: "no-store",
                }
            );
            const data = await readApiPayload(
                response,
                "Tournament management API"
            );

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Unable to update player."
                );
            }

            setManagement(
                data.management || {}
            );
            setMessage(
                `${player.name} was ${
                    action === "restore"
                        ? "restored to the tournament"
                        : action === "remove"
                          ? "removed from the lobby"
                          : "eliminated"
                }.`
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update player."
            );
        } finally {
            setManagingPlayerId("");
        }
    }

    function escapeCsvCell(value: unknown) {
        let text = String(value ?? "");

        if (/^[=+\-@]/.test(text)) {
            text = `'${text}`;
        }

        return `"${text.replace(/"/g, '""')}"`;
    }

    function exportTournamentReport() {
        const players = management.players || [];

        if (players.length === 0) {
            setMessage(
                "There are no tournament players to export."
            );
            return;
        }

        const rows = [
            [
                "Player Name",
                "Email",
                "Status",
                "Current Round Score",
                "Current Rank",
                "Eliminated Round",
                "Joined At",
                "Last Seen At",
            ],
            ...players.map((player) => [
                player.name,
                player.email || "",
                player.status,
                player.currentScore || 0,
                player.currentRank || "",
                player.eliminatedRound || "",
                player.joinedAt
                    ? new Date(
                          player.joinedAt
                      ).toLocaleString("en-SG")
                    : "",
                player.lastSeenAt
                    ? new Date(
                          player.lastSeenAt
                      ).toLocaleString("en-SG")
                    : "",
            ]),
        ];

        const csv = rows
            .map((row) =>
                row.map(escapeCsvCell).join(",")
            )
            .join("\r\n");
        const blob = new Blob(
            ["\uFEFF", csv],
            {
                type:
                    "text/csv;charset=utf-8;",
            }
        );
        const url = URL.createObjectURL(blob);
        const anchor =
            document.createElement("a");

        anchor.href = url;
        anchor.download = `${eventName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") ||
            "event"}-tap-tournament-report-${
            new Date().toISOString().slice(0, 10)
        }.csv`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        setMessage(
            `Exported ${players.length} tournament player records.`
        );
    }

    const managedPlayers =
        management.players || [];
    const filteredManagedPlayers = managedPlayers.filter(
        (player) => {
            const keyword =
                playerSearch.trim().toLowerCase();

            if (
                keyword &&
                ![
                    player.name,
                    player.email,
                    player.status,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword)
            ) {
                return false;
            }

            if (
                playerStatusFilter !== "all" &&
                player.status !==
                    playerStatusFilter
            ) {
                return false;
            }

            return true;
        }
    );

    const managementLocked =
        ["countdown", "active"].includes(
            state.tournamentStatus || ""
        ) ||
        ["completed", "cancelled"].includes(
            state.tournamentStatus || ""
        );

    const status =
        state.tournamentStatus || "not_created";
    const canCreate =
        status === "not_created" ||
        status === "completed" ||
        status === "cancelled";
    const canLock = status === "lobby";
    const canReopen =
        status === "locked" &&
        Number(state.currentRound || 0) === 0;
    const canStart =
        status === "locked" ||
        status === "round_complete";
    const currentPlayers =
        Number(state.activePlayers || 0);
    const nextRoundIsFinal =
        currentPlayers > 0 && currentPlayers <= 10;

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-8 p-6 lg:grid-cols-[1fr_390px] lg:p-9">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Zap size={16} />
                            Tap Tournament
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight">
                            {eventName}
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                            Everyone scans the same QR code.
                            Each round lasts exactly 20 seconds.
                            The top players advance until ten or
                            fewer remain, followed by one live
                            final round.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <Stat
                                label="Joined"
                                value={
                                    state.joinedPlayers || 0
                                }
                                icon={<Users size={19} />}
                            />
                            <Stat
                                label="Still Active"
                                value={
                                    state.activePlayers || 0
                                }
                                icon={<Zap size={19} />}
                            />
                            <Stat
                                label="Current Round"
                                value={
                                    state.currentRound || 0
                                }
                                icon={<Trophy size={19} />}
                            />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {canCreate && (
                                <ActionButton
                                    onClick={() =>
                                        perform(
                                            `/api/events/${eventId}/games/tournament`,
                                            {
                                                action:
                                                    "create",
                                            }
                                        )
                                    }
                                    disabled={Boolean(working)}
                                    icon={
                                        <RefreshCw
                                            size={17}
                                        />
                                    }
                                >
                                    Create Tournament Lobby
                                </ActionButton>
                            )}

                            {canLock && (
                                <ActionButton
                                    onClick={() =>
                                        perform(
                                            `/api/events/${eventId}/games/tournament`,
                                            {
                                                action:
                                                    "lock",
                                            }
                                        )
                                    }
                                    disabled={
                                        Boolean(working) ||
                                        Number(
                                            state.joinedPlayers ||
                                                0
                                        ) < 2
                                    }
                                    icon={<Lock size={17} />}
                                >
                                    Lock Players
                                </ActionButton>
                            )}

                            {canReopen && (
                                <ActionButton
                                    secondary
                                    onClick={() =>
                                        perform(
                                            `/api/events/${eventId}/games/tournament`,
                                            {
                                                action:
                                                    "open",
                                            }
                                        )
                                    }
                                    disabled={Boolean(working)}
                                    icon={
                                        <Unlock size={17} />
                                    }
                                >
                                    Reopen Lobby
                                </ActionButton>
                            )}

                            {canStart && (
                                <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
                                    {nextGameKey === "coin_flip" ? (
                                        <Coins
                                            size={17}
                                            className="text-amber-500"
                                        />
                                    ) : nextGameKey === "tic_tac_toe" ? (
                                        <Swords
                                            size={17}
                                            className="text-pink-500"
                                        />
                                    ) : (
                                        <Zap
                                            size={17}
                                            className="text-[#4F46E5]"
                                        />
                                    )}

                                    <select
                                        value={nextGameKey}
                                        onChange={(event) =>
                                            setNextGameKey(
                                                event.target.value as
                                                    | "tap_fast"
                                                    | "coin_flip"
                                                    | "tic_tac_toe"
                                            )
                                        }
                                        className="h-9 bg-transparent text-sm font-black text-slate-700 outline-none"
                                    >
                                        <option value="tap_fast">
                                            Tap, Tap, Tap — 20 seconds
                                        </option>
                                        <option value="coin_flip">
                                            Coin Flip — 3 guesses
                                        </option>
                                        <option
                                            value="tic_tac_toe"
                                            disabled={nextRoundIsFinal}
                                        >
                                            Tic-Tac-Toe — paired elimination
                                            {nextRoundIsFinal
                                                ? " (not for final)"
                                                : ""}
                                        </option>
                                    </select>
                                </label>
                            )}

                            {canStart && (
                                <ActionButton
                                    onClick={() =>
                                        perform(
                                            `/api/events/${eventId}/games/tournament/start-round`,
                                            {
                                                gameKey: nextGameKey,
                                            }
                                        )
                                    }
                                    disabled={
                                        Boolean(working) ||
                                        currentPlayers < 2
                                    }
                                    icon={<Play size={17} />}
                                >
                                    {nextRoundIsFinal
                                        ? `Start Final: ${
                                              nextGameKey === "coin_flip"
                                                  ? "Coin Flip"
                                                  : "Tap, Tap, Tap"
                                          }`
                                        : `${state.currentRound
                                              ? "Start Next"
                                              : "Start Round 1"}: ${
                                              nextGameKey === "tic_tac_toe"
                                                  ? "Tic-Tac-Toe"
                                                  : nextGameKey === "coin_flip"
                                                    ? "Coin Flip"
                                                    : "Tap, Tap, Tap"
                                          }`}
                                </ActionButton>
                            )}

                            <ActionButton
                                danger
                                onClick={() => {
                                    const confirmed =
                                        window.confirm(
                                            "Reset the tournament and remove all players, rounds and scores?"
                                        );

                                    if (confirmed) {
                                        void perform(
                                            `/api/events/${eventId}/games/tournament`,
                                            {
                                                action:
                                                    "reset",
                                            }
                                        );
                                    }
                                }}
                                disabled={Boolean(working)}
                                icon={
                                    <RotateCcw size={17} />
                                }
                            >
                                Reset Tournament
                            </ActionButton>
                        </div>

                        {message && (
                            <div className="mt-5 rounded-2xl border border-indigo-100 bg-[#F7F5FF] px-4 py-3 text-sm font-black text-[#4F46E5]">
                                {message}
                            </div>
                        )}
                    </div>

                    <div className="rounded-[1.75rem] bg-slate-950 p-5 text-center text-white">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                            <QrCode size={22} />
                        </div>
                        <h2 className="mt-3 text-xl font-black">
                            Guest Tournament QR
                        </h2>
                        <p className="mt-2 text-xs font-bold text-white/50">
                            Display this while the lobby is open.
                        </p>

                        {qrDataUrl && (
                            <img
                                src={qrDataUrl}
                                alt="Tap tournament QR code"
                                className="mx-auto mt-4 aspect-square w-full max-w-[290px] rounded-2xl bg-white p-3"
                            />
                        )}

                        <a
                            href={displayUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950"
                        >
                            <ExternalLink size={16} />
                            Open Audience Screen
                        </a>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                            Tournament Status
                        </p>
                        <h2 className="mt-2 text-2xl font-black">
                            {status === "completed"
                                ? "Tournament Completed"
                                : state.roundNumber
                                  ? `${
                                        state.isFinal
                                            ? "Final"
                                            : `Round ${state.roundNumber}`
                                    }`
                                  : status === "lobby"
                                    ? "Lobby Open"
                                    : status === "locked"
                                      ? "Players Locked"
                                      : "Waiting to Start"}
                        </h2>

                        <p className="mt-2 text-sm font-bold text-slate-500">
                            {state.isFinal
                                ? "The top score becomes champion."
                                : state.playerCount
                                  ? `${state.playerCount} players started this round and ${state.advanceCount} advance.`
                                  : "The tournament begins after players scan and join."}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-white">
                        <p className="text-xs font-black uppercase tracking-wide text-white/45">
                            {status === "countdown"
                                ? "Starting In"
                                : state.gameKey === "tic_tac_toe"
                                  ? "Matches Finished"
                                  : state.gameKey === "coin_flip"
                                    ? "Players Finished"
                                    : "Time Left"}
                        </p>
                        <p className="mt-1 text-3xl font-black">
                            {status === "countdown"
                                ? state.secondsUntilStart || 0
                                : state.gameKey === "tic_tac_toe"
                                  ? `${state.tttCompletedMatches || 0}/${state.tttTotalMatches || 0}`
                                  : state.gameKey === "coin_flip"
                                    ? `${state.completedPlayers || 0}/${state.playerCount || 0}`
                                    : state.secondsRemaining || 0}
                        </p>
                    </div>
                </div>

                {state.championName ? (
                    <div className="mt-6 rounded-[1.75rem] bg-gradient-to-r from-amber-100 to-yellow-50 p-7 text-center">
                        <Trophy
                            className="mx-auto text-amber-600"
                            size={42}
                        />
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                            Tournament Champion
                        </p>
                        <h3 className="mt-2 text-4xl font-black text-amber-950">
                            {state.championName}
                        </h3>
                    </div>
                ) : state.gameKey === "tic_tac_toe" ? (
                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {(state.tttMatches || []).length === 0 ? (
                            <p className="col-span-full rounded-2xl border border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                                Match pairings appear after the round starts.
                            </p>
                        ) : (
                            (state.tttMatches || []).map((match) => (
                                <div
                                    key={match.id}
                                    className={`rounded-2xl border p-4 ${
                                        match.status === "completed" ||
                                        match.status === "bye"
                                            ? "border-emerald-200 bg-emerald-50"
                                            : "border-slate-200 bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                            Match {match.pairNumber}
                                        </p>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-600">
                                            {match.status}
                                        </span>
                                    </div>

                                    <p className="mt-4 font-black text-slate-900">
                                        {match.playerXName}
                                    </p>
                                    <p className="my-1 text-xs font-black uppercase tracking-wide text-slate-400">
                                        versus
                                    </p>
                                    <p className="font-black text-slate-900">
                                        {match.playerOName || "Automatic bye"}
                                    </p>

                                    {match.winnerName && (
                                        <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-black text-emerald-700">
                                            Winner: {match.winnerName}
                                        </p>
                                    )}

                                    {Number(match.rematchCount || 0) > 0 && (
                                        <p className="mt-2 text-xs font-bold text-amber-700">
                                            {match.rematchCount} draw rematch
                                            {match.rematchCount === 1 ? "" : "es"}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        {(state.leaderboard || [])
                            .length === 0 ? (
                            <p className="p-8 text-center text-sm font-bold text-slate-400">
                                Live scores appear after the
                                round starts.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {(state.leaderboard || []).map(
                                    (entry) => (
                                        <div
                                            key={`${entry.position}-${entry.name}`}
                                            className="grid grid-cols-[54px_1fr_auto] items-center gap-3 px-4 py-3"
                                        >
                                            <span className="font-black text-slate-400">
                                                #
                                                {
                                                    entry.position
                                                }
                                            </span>
                                            <span className="truncate font-black">
                                                {entry.name}
                                            </span>
                                            <span
                                                className={`rounded-xl px-3 py-2 font-black ${
                                                    entry.advanced
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-[#F7F5FF] text-[#4F46E5]"
                                                }`}
                                            >
                                                {entry.score ?? entry.taps}{" "}
                                                {entry.scoreLabel ||
                                                    state.scoreLabel ||
                                                    "points"}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {managementWarning && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
                    Tournament lobby loaded, but management tools need attention:{" "}
                    {managementWarning}
                </div>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                            Player Management
                        </p>
                        <h2 className="mt-2 text-2xl font-black">
                            Tournament Players
                        </h2>
                        <p className="mt-2 text-sm font-bold text-slate-500">
                            Manual changes are disabled while a round is
                            counting down or active.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={exportTournamentReport}
                        disabled={managedPlayers.length === 0}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#F7F5FF] px-4 text-sm font-black text-[#4F46E5] transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Download size={17} />
                        Export Tournament CSV
                    </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search
                            size={17}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={playerSearch}
                            onChange={(event) =>
                                setPlayerSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search player name or email..."
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-[#4F46E5] focus:bg-white"
                        />
                    </div>

                    <select
                        value={playerStatusFilter}
                        onChange={(event) =>
                            setPlayerStatusFilter(
                                event.target.value
                            )
                        }
                        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-[#4F46E5]"
                    >
                        <option value="all">
                            All player statuses
                        </option>
                        <option value="active">
                            Active
                        </option>
                        <option value="eliminated">
                            Eliminated
                        </option>
                        <option value="champion">
                            Champion
                        </option>
                        <option value="withdrawn">
                            Withdrawn
                        </option>
                    </select>
                </div>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-4 py-3">
                                    Player
                                </th>
                                <th className="px-4 py-3">
                                    Status
                                </th>
                                <th className="px-4 py-3">
                                    Score
                                </th>
                                <th className="px-4 py-3">
                                    Rank
                                </th>
                                <th className="px-4 py-3">
                                    Last Seen
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {filteredManagedPlayers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-10 text-center font-bold text-slate-400"
                                    >
                                        No tournament players match the
                                        current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredManagedPlayers.map(
                                    (player) => {
                                        const beforeRoundOne =
                                            Number(
                                                management.currentRound ||
                                                    0
                                            ) === 0;

                                        return (
                                            <tr key={player.id}>
                                                <td className="px-4 py-4">
                                                    <p className="font-black text-slate-900">
                                                        {player.name}
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-slate-400">
                                                        {player.email ||
                                                            "No email"}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                                                            player.status ===
                                                            "active"
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : player.status ===
                                                                    "champion"
                                                                  ? "bg-amber-100 text-amber-800"
                                                                  : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {player.status}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 font-black">
                                                    {player.currentScore ||
                                                        0}
                                                </td>

                                                <td className="px-4 py-4 font-black">
                                                    {player.currentRank
                                                        ? `#${player.currentRank}`
                                                        : "—"}
                                                </td>

                                                <td className="px-4 py-4 text-xs font-bold text-slate-500">
                                                    {player.lastSeenAt
                                                        ? new Date(
                                                              player.lastSeenAt
                                                          ).toLocaleTimeString(
                                                              "en-SG",
                                                              {
                                                                  hour:
                                                                      "2-digit",
                                                                  minute:
                                                                      "2-digit",
                                                                  second:
                                                                      "2-digit",
                                                              }
                                                          )
                                                        : "—"}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        {beforeRoundOne ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void managePlayer(
                                                                        player,
                                                                        "remove"
                                                                    )
                                                                }
                                                                disabled={
                                                                    managementLocked ||
                                                                    managingPlayerId ===
                                                                        player.id
                                                                }
                                                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-black text-red-600 disabled:opacity-40"
                                                            >
                                                                <UserMinus
                                                                    size={14}
                                                                />
                                                                Remove
                                                            </button>
                                                        ) : player.status ===
                                                          "active" ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void managePlayer(
                                                                        player,
                                                                        "eliminate"
                                                                    )
                                                                }
                                                                disabled={
                                                                    managementLocked ||
                                                                    managingPlayerId ===
                                                                        player.id
                                                                }
                                                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-black text-red-600 disabled:opacity-40"
                                                            >
                                                                <UserMinus
                                                                    size={14}
                                                                />
                                                                Eliminate
                                                            </button>
                                                        ) : [
                                                              "eliminated",
                                                              "withdrawn",
                                                          ].includes(
                                                              player.status
                                                          ) ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void managePlayer(
                                                                        player,
                                                                        "restore"
                                                                    )
                                                                }
                                                                disabled={
                                                                    managementLocked ||
                                                                    managingPlayerId ===
                                                                        player.id
                                                                }
                                                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-700 disabled:opacity-40"
                                                            >
                                                                <UserPlus
                                                                    size={14}
                                                                />
                                                                Restore
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-400">
                                                                No action
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="mt-3 text-xs font-bold text-slate-500">
                    Showing {filteredManagedPlayers.length} of{" "}
                    {managedPlayers.length} tournament players.
                </p>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <History size={20} />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                                Round History
                            </p>
                            <h2 className="mt-1 text-xl font-black">
                                Completed and Active Rounds
                            </h2>
                        </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                        {(management.rounds || []).length === 0 ? (
                            <p className="p-8 text-center text-sm font-bold text-slate-400">
                                Round history appears after Round 1 starts.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {(management.rounds || []).map(
                                    (round) => (
                                        <div
                                            key={round.id}
                                            className="grid gap-3 px-4 py-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"
                                        >
                                            <div>
                                                <p className="font-black">
                                                    {round.isFinal
                                                        ? `Final · ${
                                                              round.gameKey === "tic_tac_toe"
                                                                  ? "Tic-Tac-Toe"
                                                                  : round.gameTitle || "Game"
                                                          }`
                                                        : `Round ${
                                                              round.roundNumber
                                                          } · ${
                                                              round.gameKey === "tic_tac_toe"
                                                                  ? "Tic-Tac-Toe"
                                                                  : round.gameTitle || "Game"
                                                          }`}
                                                </p>
                                                <p className="mt-1 text-xs font-bold capitalize text-slate-400">
                                                    {round.status}
                                                </p>
                                            </div>

                                            <div className="text-sm font-bold text-slate-500">
                                                {round.playerCount} players ·{" "}
                                                {round.advanceCount} advanced
                                                {round.topPlayer
                                                    ? ` · Leader: ${round.topPlayer}`
                                                    : ""}
                                            </div>

                                            <div className="rounded-xl bg-[#F7F5FF] px-3 py-2 text-sm font-black text-[#4F46E5]">
                                                {round.topScore || 0}{" "}
                                                {round.gameKey === "tic_tac_toe"
                                                    ? "win"
                                                    : round.scoreLabel || "points"}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EC4899]">
                        Manual Changes
                    </p>
                    <h2 className="mt-2 text-xl font-black">
                        Recent Activity
                    </h2>

                    <div className="mt-5 space-y-3">
                        {(management.actions || []).length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">
                                Manual player changes will be recorded here.
                            </p>
                        ) : (
                            (management.actions || [])
                                .slice(0, 10)
                                .map((action) => (
                                    <div
                                        key={action.id}
                                        className="rounded-2xl border border-slate-200 p-4"
                                    >
                                        <p className="text-sm font-black capitalize">
                                            {action.action}:{" "}
                                            {action.playerName ||
                                                "Player"}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                            {action.createdAt
                                                ? new Date(
                                                      action.createdAt
                                                  ).toLocaleString(
                                                      "en-SG"
                                                  )
                                                : ""}
                                        </p>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

function Stat({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[#4F46E5]">
                {icon}
            </div>
            <p className="mt-3 text-3xl font-black">
                {value}
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
        </div>
    );
}

function ActionButton({
    children,
    icon,
    secondary = false,
    danger = false,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode;
    secondary?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            {...props}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                danger
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : secondary
                      ? "border border-slate-200 bg-white text-slate-700 hover:border-[#4F46E5] hover:text-[#4F46E5]"
                      : "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-lg hover:opacity-90"
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

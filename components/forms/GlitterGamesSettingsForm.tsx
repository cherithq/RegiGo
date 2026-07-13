"use client";

import { useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Gamepad2,
    Loader2,
    RotateCcw,
    Save,
    Users,
    UserRound,
} from "lucide-react";
import {
    cleanGlitterGamesConfig,
    glitterGameCatalog,
    type GlitterGameKey,
    type GlitterGamesConfig,
} from "@/lib/glitter-games";

export default function GlitterGamesSettingsForm({
    eventId,
    initialConfig,
}: {
    eventId: string;
    initialConfig: GlitterGamesConfig;
}) {
    const normalizedInitial = useMemo(
        () => cleanGlitterGamesConfig(initialConfig),
        [initialConfig],
    );

    const [games, setGames] = useState<GlitterGamesConfig>(normalizedInitial);
    const [savedGames, setSavedGames] =
        useState<GlitterGamesConfig>(normalizedInitial);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const hasChanges = JSON.stringify(games) !== JSON.stringify(savedGames);
    const enabledCount = Object.values(games).filter(Boolean).length;

    function toggleGame(key: GlitterGameKey) {
        setGames((current) => ({
            ...current,
            [key]: !current[key],
        }));
        setMessage(null);
    }

    function resetChanges() {
        setGames(savedGames);
        setMessage(null);
    }

    async function saveChanges() {
        if (!hasChanges || saving) return;

        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch(
                `/api/events/${eventId}/games/settings`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ games }),
                },
            );

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    typeof result.error === "string"
                        ? result.error
                        : "Failed to save game settings.",
                );
            }

            const nextGames = cleanGlitterGamesConfig(result.games);
            setGames(nextGames);
            setSavedGames(nextGames);
            setMessage({
                type: "success",
                text: "Game settings saved successfully.",
            });
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Failed to save game settings.",
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:rounded-[2rem] md:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                            Game availability
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                            Choose games for this event
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                            Enabled games will be shown to guests when the public games page is added in the next step.
                        </p>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-black text-[#4F46E5]">
                        {enabledCount} of {glitterGameCatalog.length} enabled
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {glitterGameCatalog.map((game) => {
                        const enabled = games[game.key];
                        const isMultiplayer = game.mode === "Multiplayer";

                        return (
                            <button
                                key={game.key}
                                type="button"
                                onClick={() => toggleGame(game.key)}
                                aria-pressed={enabled}
                                className={`flex min-h-28 w-full items-start justify-between gap-4 rounded-[1.25rem] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 sm:p-5 ${
                                    enabled
                                        ? "border-[#4F46E5]/30 bg-[#F7F5FF]"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                            enabled
                                                ? "bg-[#4F46E5] text-white"
                                                : "bg-slate-100 text-slate-400"
                                        }`}
                                    >
                                        <Gamepad2 size={21} aria-hidden="true" />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-black text-slate-950">
                                                {game.title}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                {isMultiplayer ? (
                                                    <Users size={12} aria-hidden="true" />
                                                ) : (
                                                    <UserRound size={12} aria-hidden="true" />
                                                )}
                                                {game.mode}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                                            {game.description}
                                        </p>
                                    </div>
                                </div>

                                <span
                                    className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
                                        enabled ? "bg-[#4F46E5]" : "bg-slate-300"
                                    }`}
                                    aria-hidden="true"
                                >
                                    <span
                                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                                            enabled ? "left-6" : "left-1"
                                        }`}
                                    />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {message && (
                <div
                    role={message.type === "error" ? "alert" : "status"}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
                        message.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                    }`}
                >
                    {message.type === "success" ? (
                        <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                    ) : (
                        <AlertCircle className="mt-0.5 shrink-0" size={18} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="flex flex-col-reverse gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end sm:p-5">
                <button
                    type="button"
                    onClick={resetChanges}
                    disabled={!hasChanges || saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RotateCcw size={16} aria-hidden="true" />
                    Reset
                </button>

                <button
                    type="button"
                    onClick={saveChanges}
                    disabled={!hasChanges || saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                        <Save size={16} aria-hidden="true" />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}

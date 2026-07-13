"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Gamepad2,
    Loader2,
    QrCode,
    ShieldAlert,
} from "lucide-react";

type AccessResult = {
    eventId?: string;
    player?: {
        player_token: string;
        display_name: string;
    };
    redirectUrl?: string;
    error?: string;
};

async function readJsonSafely(response: Response): Promise<AccessResult> {
    const text = await response.text();

    try {
        return text ? (JSON.parse(text) as AccessResult) : {};
    } catch {
        throw new Error(
            `The game access route returned an invalid response (${response.status}).`,
        );
    }
}

export default function GuestGamesAccess({
    slug,
    accessToken,
}: {
    slug: string;
    accessToken: string;
}) {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading",
    );
    const [message, setMessage] = useState("Verifying your game pass…");

    useEffect(() => {
        let cancelled = false;

        async function redeemAccess() {
            if (!accessToken) {
                setStatus("error");
                setMessage("This game QR code is missing its access token.");
                return;
            }

            try {
                const response = await fetch(
                    `/api/public/events/${encodeURIComponent(slug)}/games/access`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ accessToken }),
                        cache: "no-store",
                    },
                );

                const result = await readJsonSafely(response);

                if (!response.ok || !result.player || !result.eventId) {
                    throw new Error(
                        result.error || "Unable to verify this game QR code.",
                    );
                }

                window.localStorage.setItem(
                    `regigo:glitter-player:${result.eventId}`,
                    result.player.player_token,
                );

                if (cancelled) return;

                setStatus("success");
                setMessage(`Welcome, ${result.player.display_name}. Opening games…`);

                window.setTimeout(() => {
                    router.replace(result.redirectUrl || `/event/${slug}/games`);
                }, 650);
            } catch (error) {
                if (cancelled) return;

                setStatus("error");
                setMessage(
                    error instanceof Error
                        ? error.message
                        : "Unable to verify this game QR code.",
                );
            }
        }

        void redeemAccess();

        return () => {
            cancelled = true;
        };
    }, [accessToken, router, slug]);

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F5FF] px-4 py-8 text-slate-950">
            <section className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8 md:rounded-[2rem]">
                <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
                        status === "error"
                            ? "bg-red-50 text-red-600"
                            : status === "success"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-[#F7F5FF] text-[#4F46E5]"
                    }`}
                >
                    {status === "loading" ? (
                        <Loader2 size={30} className="animate-spin" />
                    ) : status === "success" ? (
                        <CheckCircle2 size={30} />
                    ) : (
                        <ShieldAlert size={30} />
                    )}
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5]">
                    <QrCode size={15} />
                    Glitter Games Access
                </div>

                <h1 className="mt-4 text-2xl font-black sm:text-3xl">
                    {status === "loading"
                        ? "Checking your pass"
                        : status === "success"
                          ? "You are verified"
                          : "Unable to open games"}
                </h1>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                    {message}
                </p>

                {status === "error" && (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <Link
                            href={`/event/${slug}`}
                            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
                        >
                            Back to Event
                        </Link>
                        <Link
                            href={`/event/${slug}/games`}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA]"
                        >
                            <Gamepad2 size={17} />
                            Games Lobby
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}

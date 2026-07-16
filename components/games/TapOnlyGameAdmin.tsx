"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ExternalLink,
    QrCode,
    Timer,
    Users,
    Zap,
} from "lucide-react";
import QRCode from "qrcode";

export default function TapOnlyGameAdmin({
    eventName,
    slug,
    players,
    activeMatches,
    completedMatches,
}: {
    eventName: string;
    slug: string;
    players: number;
    activeMatches: number;
    completedMatches: number;
}) {
    const [qrDataUrl, setQrDataUrl] = useState("");

    const gameUrl = useMemo(
        () =>
            typeof window === "undefined"
                ? `/event/${slug}/games`
                : `${window.location.origin}/event/${slug}/games`,
        [slug]
    );

    useEffect(() => {
        void QRCode.toDataURL(gameUrl, {
            width: 640,
            margin: 1,
            errorCorrectionLevel: "H",
        }).then(setQrDataUrl);
    }, [gameUrl]);

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl md:p-10">
                <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#EC4899]/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#4F46E5]/35 blur-3xl" />

                <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_390px] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.17em]">
                            <Zap size={16} />
                            Tournament Stage 1
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
                            Tap, Tap, Tap
                        </h1>

                        <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/65">
                            {eventName} now uses one game only. Display the QR
                            code when dinner starts. Every checked-in guest
                            enters the same Tap, Tap, Tap challenge.
                        </p>

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            <Stat
                                label="Players"
                                value={players}
                                icon={<Users size={20} />}
                            />
                            <Stat
                                label="Active Matches"
                                value={activeMatches}
                                icon={<Zap size={20} />}
                            />
                            <Stat
                                label="Match Timer"
                                value="20s"
                                icon={<Timer size={20} />}
                            />
                        </div>

                        <div className="mt-7 rounded-2xl border border-white/10 bg-white/10 p-5">
                            <p className="text-sm font-black text-white">
                                Current Stage 1 behaviour
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
                                Guests are randomly paired. Each pair receives
                                a 3-second countdown followed by exactly 20
                                seconds of tapping. The higher server-verified
                                score wins.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 text-center backdrop-blur-xl">
                        <QrCode className="mx-auto text-indigo-200" size={34} />
                        <h2 className="mt-3 text-2xl font-black">
                            Guest Game QR
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-white/50">
                            One QR opens Tap, Tap, Tap directly.
                        </p>

                        {qrDataUrl && (
                            <img
                                src={qrDataUrl}
                                alt="Tap Tap Tap game QR code"
                                className="mx-auto mt-5 aspect-square w-full rounded-[1.5rem] bg-white p-4"
                            />
                        )}

                        <a
                            href={gameUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950"
                        >
                            <ExternalLink size={17} />
                            Open Guest Game
                        </a>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                        Completed Matches
                    </p>
                    <p className="mt-3 text-5xl font-black">
                        {completedMatches}
                    </p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EC4899]">
                        Active Game
                    </p>
                    <p className="mt-3 text-3xl font-black">
                        Tap, Tap, Tap
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                        Other game modes have been removed from the lobby.
                    </p>
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
    value: number | string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="text-indigo-200">{icon}</div>
            <p className="mt-3 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/40">
                {label}
            </p>
        </div>
    );
}

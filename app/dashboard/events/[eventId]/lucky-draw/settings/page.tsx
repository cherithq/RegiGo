import Link from "next/link";
import {
    ArrowLeft,
    ExternalLink,
    ImageIcon,
    MonitorPlay,
    Palette,
} from "lucide-react";
import LuckyDrawAudienceBackgroundSettings from "@/components/lucky-draw/LuckyDrawAudienceBackgroundSettings";

export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

export default async function LuckyDrawSettingsPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const {
        eventId,
    } = await params;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10">
                        <Link
                            href={`/dashboard/events/${eventId}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-black text-[#4F46E5]"
                        >
                            <ArrowLeft
                                size={
                                    17
                                }
                            />
                            Back to Event
                        </Link>

                        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Palette
                                size={
                                    16
                                }
                            />
                            Audience Display Design
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                            Customise the lucky draw background
                        </h1>

                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            The audience display shows winner names only. Choose a solid colour, a two-colour gradient or upload a background image. There are no wheel settings on this page.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={`/dashboard/events/${eventId}/lucky-draw`}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white"
                            >
                                <MonitorPlay
                                    size={
                                        18
                                    }
                                />
                                Open Lucky Draw
                            </Link>

                            <Link
                                href={`/display/events/${eventId}/lucky-draw`}
                                target="_blank"
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                            >
                                <ExternalLink
                                    size={
                                        18
                                    }
                                />
                                Open Audience Display
                            </Link>
                        </div>

                        <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                            <ImageIcon
                                size={
                                    17
                                }
                            />
                            Background controls only — the draw logic and prize settings remain unchanged.
                        </div>
                    </div>
                </section>

                <LuckyDrawAudienceBackgroundSettings
                    eventId={
                        eventId
                    }
                />
            </div>
        </main>
    );
}

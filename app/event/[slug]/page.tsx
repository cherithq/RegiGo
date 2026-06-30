import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase-server";

export default async function PublicEventPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const { data: event, error } = await supabaseServer
        .from("events")
        .select("*, event_branding(*)")
        .eq("event_slug", slug)
        .single();

    if (error || !event) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] text-slate-950">
                Event not found.
            </main>
        );
    }

    if (event.status !== "published") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
                <div className="max-w-md rounded-[2rem] bg-white p-10 text-center shadow-2xl">
                    <div className="text-5xl">🚧</div>
                    <h1 className="mt-6 text-3xl font-black">Event Not Published</h1>
                    <p className="mt-3 text-slate-600">
                        This event page is not live yet.
                    </p>
                </div>
            </main>
        );
    }

    const branding = Array.isArray(event.event_branding)
        ? event.event_branding[0]
        : event.event_branding;

    const primary = branding?.primary_color || "#4F46E5";
    const secondary = branding?.secondary_color || "#EC4899";
    const background = branding?.background_color || "#F7F5FF";

    return (
        <main
            className="min-h-screen px-6 py-16 text-slate-950"
            style={{
                backgroundColor: background,
                backgroundImage: branding?.page_background_url
                    ? `url(${branding.page_background_url})`
                    : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            <section className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
                <div
                    className="relative min-h-[380px] px-12 py-14"
                    style={{
                        backgroundImage: branding?.banner_background_url
                            ? `url(${branding.banner_background_url})`
                            : `linear-gradient(135deg, ${primary}, ${secondary})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: branding?.banner_text_color || "#FFFFFF",
                    }}
                >
                    {branding?.banner_background_url && (
                        <div
                            className="absolute inset-0 bg-black"
                            style={{
                                opacity: branding?.banner_overlay_opacity ?? 0.45,
                            }}
                        />
                    )}

                    <div className="relative z-10">
                        <p className="mb-6 inline-flex rounded-full bg-white/20 px-5 py-2 text-sm font-black backdrop-blur">
                            Powered by RegiGo
                        </p>

                        <h1 className="max-w-4xl text-6xl font-black leading-tight">
                            {branding?.hero_title || event.event_name}
                        </h1>

                        <p className="mt-6 max-w-2xl text-xl leading-8 opacity-90">
                            {branding?.hero_subtitle || event.description}
                        </p>
                    </div>
                </div>

                <div className="p-10">
                    <div className="grid gap-6 md:grid-cols-3">
                        <Info label="Date" value={event.event_date || "-"} />
                        <Info label="Time" value={event.event_time || "-"} />
                        <Info label="Venue" value={event.venue || "-"} />
                    </div>

                    <Link
                        href={`/event/${event.event_slug}/register`}
                        className="mt-10 inline-flex rounded-2xl px-8 py-4 text-lg font-black text-white shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                        }}
                    >
                        Register Now
                    </Link>
                </div>
            </section>
        </main>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl bg-[#F7F5FF] p-7">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
    );
}
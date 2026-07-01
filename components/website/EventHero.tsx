import Link from "next/link";

export default function EventHero({
    event,
    branding,
}: {
    event: any;
    branding: any;
}) {
    const primary = branding?.primary_color || "#4F46E5";
    const secondary = branding?.secondary_color || "#EC4899";

    return (
        <section
            className="relative overflow-hidden px-6 py-24 text-white"
            style={{
                backgroundImage: branding?.banner_background_url
                    ? `url(${branding.banner_background_url})`
                    : `linear-gradient(135deg, ${primary}, ${secondary})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {branding?.banner_background_url && (
                <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: branding?.banner_overlay_opacity ?? 0.45 }}
                />
            )}

            <div className="relative z-10 mx-auto max-w-7xl">
                <p className="inline-flex rounded-full bg-white/20 px-5 py-2 text-sm font-black backdrop-blur">
                    Powered by RegiGo
                </p>

                <h1 className="mt-8 max-w-5xl text-5xl font-black leading-tight md:text-7xl">
                    {branding?.hero_title || event.event_name}
                </h1>

                <p className="mt-6 max-w-3xl text-xl leading-8 text-white/90">
                    {branding?.hero_subtitle || event.description}
                </p>

                <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
                    <Info label="Date" value={event.event_date || "-"} />
                    <Info label="Time" value={event.event_time || "-"} />
                    <Info label="Venue" value={event.venue || "-"} />
                </div>

                <Link
                    href={`/event/${event.event_slug}/register`}
                    className="mt-10 inline-flex rounded-2xl bg-white px-8 py-4 text-lg font-black text-slate-950 shadow-xl"
                >
                    Register Now
                </Link>
            </div>
        </section>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
            <p className="text-sm font-bold text-white/70">{label}</p>
            <p className="mt-1 text-xl font-black">{value}</p>
        </div>
    );
}
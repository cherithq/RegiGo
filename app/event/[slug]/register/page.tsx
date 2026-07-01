import { supabaseServer } from "../../../../lib/supabase-server";
import DynamicRegistrationForm from "../../../../components/forms/DynamicRegistrationForm";

export default async function RegisterPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*, event_branding(*)")
        .eq("event_slug", slug)
        .single();

    const { data: tickets } = await supabaseServer
        .from("ticket_types")
        .select("*")
        .eq("event_id", event.id)
        .order("display_order", { ascending: true });

    if (!event) {
        return <main className="p-8">Event not found.</main>;
    }

    if (event.status !== "published" || !event.registration_open) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
                <div className="max-w-md rounded-[2rem] bg-white p-10 text-center shadow-2xl">
                    <div className="text-5xl">🔒</div>
                    <h1 className="mt-6 text-3xl font-black">Registration Closed</h1>
                    <p className="mt-3 text-slate-600">
                        This event is not currently accepting registrations.
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

    const { data: form } = await supabaseServer
        .from("registration_forms")
        .select("*")
        .eq("event_id", event.id)
        .maybeSingle();

    const { data: fields } = await supabaseServer
        .from("registration_fields")
        .select("*")
        .eq("form_id", form?.id)
        .order("sort_order", { ascending: true });

    return (
        <main
            className="min-h-screen px-6 py-10 text-slate-950"
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
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <section
                    className="relative min-h-[300px] overflow-hidden p-10 text-white"
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
                            style={{
                                opacity: branding?.banner_overlay_opacity ?? 0.45,
                            }}
                        />
                    )}

                    <div className="relative z-10">
                        <p className="mb-6 inline-flex rounded-full bg-white/20 px-5 py-2 text-sm font-black backdrop-blur">
                            Event Registration
                        </p>

                        <h1 className="text-5xl font-black">
                            {branding?.hero_title || event.event_name}
                        </h1>

                        <p className="mt-4 max-w-2xl text-xl text-white/90">
                            {branding?.hero_subtitle ||
                                "Complete your registration below. Your QR pass will be sent after verification."}
                        </p>
                    </div>
                </section>

                <section className="grid lg:grid-cols-[360px_1fr]">
                    <aside className="bg-[#FAFAFF] p-8">
                        <h2 className="text-2xl font-black">Event Details</h2>

                        <div className="mt-6 space-y-4">
                            <Info label="Date" value={event.event_date || "-"} />
                            <Info label="Time" value={event.event_time || "-"} />
                            <Info label="Venue" value={event.venue || "-"} />
                            <Info label="Entry" value="QR Code Required" />
                        </div>
                    </aside>

                    <section className="p-8">
                        <h2 className="text-2xl font-black">
                            {form?.form_title || "Registration Form"}
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Fields marked with <span className="text-red-500">*</span> are required.
                        </p>

                        <div className="mt-8">
                            <DynamicRegistrationForm
                                event={event}
                                fields={fields || []}
                                tickets={tickets || []}
                            />
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-black">{value}</p>
        </div>
    );
}
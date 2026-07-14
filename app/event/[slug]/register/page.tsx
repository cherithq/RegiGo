import { createSupabaseServerClient } from "@/lib/supabase-server";
import DynamicRegistrationForm from "@/components/forms/DynamicRegistrationForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { slug } = await params;

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select("*, event_branding(*)")
        .eq("event_slug", slug)
        .maybeSingle();

    if (eventError || !event) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-xl md:rounded-[2rem] md:p-8">
                    <h1 className="text-2xl font-black text-red-600">
                        Event not found
                    </h1>

                    {eventError?.message && (
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                            {eventError.message}
                        </p>
                    )}
                </div>
            </main>
        );
    }

    const [settingsResult, ticketsResult, tablesResult, formResult] =
        await Promise.all([
        supabaseServer
            .from("event_settings")
            .select("registration_is_open, registration_closed_message")
            .eq("event_id", event.id)
            .maybeSingle(),

        supabaseServer
            .from("ticket_types")
            .select("*")
            .eq("event_id", event.id)
            .order("display_order", { ascending: true }),

        supabaseServer
            .from("event_tables")
            .select("*")
            .eq("event_id", event.id),

        supabaseServer
            .from("registration_forms")
            .select("*")
            .eq("event_id", event.id)
            .maybeSingle(),
    ]);

    const settings = settingsResult.data;
    const tickets = ticketsResult.data || [];
    const tables = tablesResult.data || [];
    const form = formResult.data;

    const registrationIsOpen =
        event.status === "published" &&
        event.registration_open !== false &&
        settings?.registration_is_open !== false;

    const closedMessage =
        settings?.registration_closed_message ||
        "This event is not currently accepting registrations.";

    const branding = Array.isArray(event.event_branding)
        ? event.event_branding[0]
        : event.event_branding;

    const primary = branding?.primary_color || "#4F46E5";
    const secondary = branding?.secondary_color || "#EC4899";
    const background = branding?.background_color || "#F7F5FF";

    if (!registrationIsOpen) {
        return (
            <main
                className="flex min-h-screen items-center justify-center px-5 py-8 text-slate-950 md:px-6"
                style={{
                    backgroundColor: background,
                    backgroundImage: branding?.page_background_url
                        ? `url(${branding.page_background_url})`
                        : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-2xl md:rounded-[2rem] md:p-10">
                    <div className="text-5xl">🔒</div>

                    <h1 className="mt-5 text-2xl font-black md:mt-6 md:text-3xl">
                        Registration Closed
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                        {closedMessage}
                    </p>
                </div>
            </main>
        );
    }

    const { data: fields } = form?.id
        ? await supabaseServer
              .from("registration_fields")
              .select("*")
              .eq("form_id", form.id)
              .order("sort_order", { ascending: true })
        : { data: [] };

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main
            className="min-h-screen px-4 py-5 text-slate-950 sm:px-5 md:px-6 md:py-10"
            style={{
                backgroundColor: background,
                backgroundImage: branding?.page_background_url
                    ? `url(${branding.page_background_url})`
                    : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl md:rounded-[2rem]">
                <section
                    className="relative min-h-[240px] overflow-hidden p-5 text-white md:min-h-[300px] md:p-10"
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
                        <p className="mb-5 inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-black backdrop-blur md:mb-6 md:px-5 md:text-sm">
                            Event Registration
                        </p>

                        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
                            {branding?.hero_title || eventName}
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 md:mt-4 md:text-xl md:leading-8">
                            {branding?.hero_subtitle ||
                                "Complete your registration below. Your QR pass will be sent after verification."}
                        </p>
                    </div>
                </section>

                <section className="grid lg:grid-cols-[360px_1fr]">
                    <aside className="border-b border-slate-100 bg-[#FAFAFF] p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <h2 className="text-xl font-black md:text-2xl">
                            Event Details
                        </h2>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 md:mt-6 md:gap-4">
                            <Info label="Date" value={formatDate(event.event_date)} />
                            <Info label="Time" value={event.event_time || "-"} />
                            <Info label="Venue" value={event.venue || "-"} />
                            <Info label="Entry" value="QR Code Required" />
                        </div>
                    </aside>

                    <section className="p-5 md:p-8">
                        <h2 className="text-xl font-black md:text-2xl">
                            {form?.form_title || "Registration Form"}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                            Fields marked with{" "}
                            <span className="font-black text-red-500">*</span> are required.
                        </p>

                        <div className="mt-6 md:mt-8">
                            <DynamicRegistrationForm
                                event={event}
                                fields={fields || []}
                                tickets={tickets || []}
                                tables={tables || []}
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
        <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
            <p className="text-xs font-bold text-slate-500 md:text-sm">
                {label}
            </p>

            <p className="mt-1 break-words text-base font-black leading-6 text-slate-950 md:text-lg">
                {value}
            </p>
        </div>
    );
}

function formatDate(date: string | null) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
}
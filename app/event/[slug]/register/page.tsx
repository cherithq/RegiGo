import {
    createClient,
} from "@supabase/supabase-js";
import {
    CalendarDays,
    Clock3,
    MapPin,
    QrCode,
    TableProperties,
} from "lucide-react";
import DynamicRegistrationForm from "@/components/forms/DynamicRegistrationForm";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Supabase server configuration is missing.",
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

export default async function RegisterPage({
    params,
}: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const {
        slug,
    } = await params;
    const admin =
        adminClient();

    const {
        data: event,
        error:
            eventError,
    } = await admin
        .from("events")
        .select(
            "*, event_branding(*)",
        )
        .eq(
            "event_slug",
            slug,
        )
        .maybeSingle();

    if (
        eventError ||
        !event
    ) {
        return (
            <MessagePage
                title="Event not found"
                message={
                    eventError?.message ||
                    "This registration page is unavailable."
                }
            />
        );
    }

    const [
        settingsResult,
        ticketsResult,
        formResult,
        addonResult,
        stripeAddonResult,
        tableSettingsResult,
        tableCountResult,
    ] =
        await Promise.all([
            admin
                .from(
                    "event_settings",
                )
                .select(
                    "registration_is_open, registration_closed_message",
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .maybeSingle(),

            admin
                .from(
                    "ticket_types",
                )
                .select("*")
                .eq(
                    "event_id",
                    event.id,
                )
                .order(
                    "display_order",
                    {
                        ascending:
                            true,
                    },
                ),

            admin
                .from(
                    "registration_forms",
                )
                .select("*")
                .eq(
                    "event_id",
                    event.id,
                )
                .maybeSingle(),

            admin
                .from(
                    "event_addons",
                )
                .select(
                    "enabled",
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .eq(
                    "addon_key",
                    "guest_table_selection",
                )
                .maybeSingle(),

            admin
                .from(
                    "event_addons",
                )
                .select(
                    "enabled",
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .eq(
                    "addon_key",
                    "stripe_payments",
                )
                .maybeSingle(),

            admin
                .from(
                    "event_table_selection_settings",
                )
                .select(
                    "allow_registration_selection, selection_required, instructions",
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .maybeSingle(),

            admin
                .from(
                    "event_tables",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head: true,
                    },
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .eq(
                    "guest_selectable",
                    true,
                )
                .gt(
                    "table_capacity",
                    0,
                ),
        ]);

    let form =
        formResult.data;

    if (!form) {
        const {
            data: formId,
        } = await admin.rpc(
            "regigo_seed_registration_form_v1",
            {
                p_event_id:
                    event.id,
            },
        );

        if (formId) {
            const result =
                await admin
                    .from(
                        "registration_forms",
                    )
                    .select("*")
                    .eq(
                        "id",
                        formId,
                    )
                    .maybeSingle();

            form =
                result.data;
        }
    }

    const {
        data: fields,
    } = form?.id
        ? await admin
              .from(
                  "registration_fields",
              )
              .select("*")
              .eq(
                  "form_id",
                  form.id,
              )
              .order(
                  "sort_order",
                  {
                      ascending:
                          true,
                  },
              )
        : {
              data: [],
          };

    const settings =
        settingsResult.data;
    const registrationOpen =
        event.status ===
            "published" &&
        event.registration_open !==
            false &&
        settings
            ?.registration_is_open !==
            false;

    if (!registrationOpen) {
        return (
            <MessagePage
                title="Registration Closed"
                message={
                    settings
                        ?.registration_closed_message ||
                    "This event is not currently accepting registrations."
                }
            />
        );
    }

    const branding =
        Array.isArray(
            event.event_branding,
        )
            ? event
                  .event_branding[0]
            : event.event_branding;
    const primary =
        branding
            ?.primary_color ||
        "#4F46E5";
    const secondary =
        branding
            ?.secondary_color ||
        "#EC4899";
    const background =
        branding
            ?.background_color ||
        "#F7F5FF";
    const eventName =
        event.event_name ||
        event.title ||
        event.name ||
        "Event";
    const tableFlowEnabled =
        addonResult.data
            ?.enabled ===
            true &&
        tableSettingsResult
            .data
            ?.allow_registration_selection !==
            false &&
        Number(
            tableCountResult.count ||
                0,
        ) > 0;
    const stripePaymentsEnabled =
        stripeAddonResult.data
            ?.enabled ===
        true;
    const visibleTickets = (
        ticketsResult.data ||
        []
    ).filter((ticket) => {
        if (
            stripePaymentsEnabled
        ) {
            return true;
        }

        return [
            "price_cents",
            "amount_cents",
            "unit_amount",
        ].every(
            (key) =>
                !(
                    Number(
                        ticket[key],
                    ) > 0
                ),
        );
    });

    return (
        <main
            className="min-h-screen px-4 py-5 text-slate-950 sm:px-5 md:px-6 md:py-10"
            style={{
                backgroundColor:
                    background,
                backgroundImage:
                    branding
                        ?.page_background_url
                        ? `url(${branding.page_background_url})`
                        : undefined,
                backgroundSize:
                    "cover",
                backgroundPosition:
                    "center",
            }}
        >
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl md:rounded-[2rem]">
                <section
                    className="relative min-h-[240px] overflow-hidden p-5 text-white md:min-h-[300px] md:p-10"
                    style={{
                        backgroundImage:
                            branding
                                ?.banner_background_url
                                ? `url(${branding.banner_background_url})`
                                : `linear-gradient(135deg, ${primary}, ${secondary})`,
                        backgroundSize:
                            "cover",
                        backgroundPosition:
                            "center",
                    }}
                >
                    {branding
                        ?.banner_background_url && (
                        <div
                            className="absolute inset-0 bg-black"
                            style={{
                                opacity:
                                    branding
                                        ?.banner_overlay_opacity ??
                                    0.45,
                            }}
                        />
                    )}

                    <div className="relative z-10">
                        <p className="inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-black backdrop-blur md:text-sm">
                            Event Registration
                        </p>
                        <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
                            {branding
                                ?.hero_title ||
                                eventName}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 md:text-xl md:leading-8">
                            {branding
                                ?.hero_subtitle ||
                                "Complete your registration below."}
                        </p>
                    </div>
                </section>

                <section className="grid lg:grid-cols-[340px_1fr]">
                    <aside className="border-b border-slate-100 bg-[#FAFAFF] p-5 md:p-8 lg:border-b-0 lg:border-r">
                        <h2 className="text-xl font-black md:text-2xl">
                            Event Details
                        </h2>

                        <div className="mt-5 space-y-3">
                            <Info
                                icon={
                                    CalendarDays
                                }
                                label="Date"
                                value={formatDate(
                                    event.event_date,
                                )}
                            />
                            <Info
                                icon={
                                    Clock3
                                }
                                label="Time"
                                value={
                                    event.event_time ||
                                    "-"
                                }
                            />
                            <Info
                                icon={
                                    MapPin
                                }
                                label="Venue"
                                value={
                                    event.venue ||
                                    "-"
                                }
                            />
                            <Info
                                icon={
                                    QrCode
                                }
                                label="Entry"
                                value="QR pass after registration"
                            />
                        </div>
                    </aside>

                    <section className="p-5 md:p-8">
                        <h2 className="text-xl font-black md:text-2xl">
                            {form
                                ?.form_title ||
                                "Registration Form"}
                        </h2>

                        {form?.form_description && (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {form.form_description}
                            </p>
                        )}

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Fields marked with{" "}
                            <span className="font-black text-red-500">
                                *
                            </span>{" "}
                            are required.
                        </p>

                        {tableFlowEnabled && (
                            <div className="mt-5 rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-4">
                                <div className="flex items-start gap-3">
                                    <TableProperties
                                        size={
                                            20
                                        }
                                        className="mt-0.5 shrink-0 text-[#4F46E5]"
                                    />
                                    <div>
                                        <p className="font-black text-slate-900">
                                            Choose your table after submitting
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">
                                            Your registration is created first so RegiGo can safely hold the correct number of seats and prevent two guests from taking the same capacity.
                                        </p>
                                        {tableSettingsResult
                                            .data
                                            ?.selection_required && (
                                            <p className="mt-2 text-xs font-black text-[#EC4899]">
                                                A table selection is required for this event.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 md:mt-8">
                            <DynamicRegistrationForm
                                event={{
                                    ...event,
                                    // Table selection happens after registration,
                                    // not through the old unsafe dropdown.
                                    enable_tables:
                                        false,
                                }}
                                fields={
                                    fields ||
                                    []
                                }
                                tickets={
                                    visibleTickets
                                }
                            />
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}

function Info({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof CalendarDays;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <Icon
                    size={18}
                    className="mt-0.5 shrink-0 text-[#4F46E5]"
                />
                <div>
                    <p className="text-xs font-bold text-slate-500">
                        {label}
                    </p>
                    <p className="mt-1 break-words font-black">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function MessagePage({
    title,
    message,
}: {
    title: string;
    message: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                <h1 className="text-3xl font-black">
                    {title}
                </h1>
                <p className="mt-4 leading-7 text-slate-600">
                    {message}
                </p>
            </section>
        </main>
    );
}

function formatDate(
    date:
        | string
        | null,
) {
    if (!date) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "en-SG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    ).format(
        new Date(
            `${date}T00:00:00`,
        ),
    );
}

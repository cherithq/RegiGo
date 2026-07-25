import {
    CalendarDays,
    Clock3,
    MapPin,
} from "lucide-react";
import GuestInvitationResponse from "@/components/invitations/GuestInvitationResponse";
import {
    InvitationError,
    formatEventDate,
    getPublicInvitation,
} from "@/lib/guest-invitations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GuestInvitationPage({
    params,
}: {
    params: Promise<{
        slug: string;
        token: string;
    }>;
}) {
    const { slug, token } = await params;

    try {
        const { admin, invitation } =
            await getPublicInvitation({
                slug,
                token,
                markOpened: true,
            });

        const event = Array.isArray(invitation.events)
            ? invitation.events[0]
            : invitation.events;

        const registration = Array.isArray(
            invitation.registrations,
        )
            ? invitation.registrations[0]
            : invitation.registrations;

        const branding = Array.isArray(
            event?.event_branding,
        )
            ? event.event_branding[0]
            : event?.event_branding;

        const primary =
            branding?.primary_color || "#4F46E5";
        const secondary =
            branding?.secondary_color || "#EC4899";
        const background =
            branding?.background_color || "#F7F5FF";

        const [
            paymentAddonResult,
            tableAddonResult,
            ticketCountResult,
            tableCountResult,
            tableSettingsResult,
        ] = await Promise.all([
            admin
                .from("event_addons")
                .select("enabled")
                .eq("event_id", event?.id)
                .eq("addon_key", "stripe_payments")
                .maybeSingle(),

            admin
                .from("event_addons")
                .select("enabled")
                .eq("event_id", event?.id)
                .eq(
                    "addon_key",
                    "guest_table_selection",
                )
                .maybeSingle(),

            admin
                .from("ticket_types")
                .select("id", {
                    count: "exact",
                    head: true,
                })
                .eq("event_id", event?.id)
                .eq("is_active", true),

            admin
                .from("event_tables")
                .select("id", {
                    count: "exact",
                    head: true,
                })
                .eq("event_id", event?.id)
                .eq("guest_selectable", true),

            admin
                .from("event_table_selection_settings")
                .select("require_paid_ticket, allow_rsvp_selection, selection_required")
                .eq("event_id", event?.id)
                .maybeSingle(),
        ]);

        const ticketSelectionUrl =
            paymentAddonResult.data?.enabled &&
            (ticketCountResult.count || 0) > 0 &&
            registration?.payment_status !== "paid"
                ? `/event/${encodeURIComponent(
                      slug,
                  )}/invite/${encodeURIComponent(
                      token,
                  )}/tickets`
                : null;

        const paymentEligible = [
            "paid",
            "not_required",
        ].includes(
            String(registration?.payment_status || ""),
        );

        const tableSelectionUrl =
            tableAddonResult.data?.enabled &&
            tableSettingsResult.data
                ?.allow_rsvp_selection !== false &&
            (tableCountResult.count || 0) > 0 &&
            (
                tableSettingsResult.data
                    ?.require_paid_ticket === false ||
                paymentEligible
            )
                ? `/event/${encodeURIComponent(
                      slug,
                  )}/invite/${encodeURIComponent(
                      token,
                  )}/tables`
                : null;

        return (
            <main
                className="min-h-screen px-5 py-8 text-slate-950 md:px-8 md:py-12"
                style={{
                    backgroundColor: background,
                    backgroundImage:
                        branding?.page_background_url
                            ? `url(${branding.page_background_url})`
                            : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                    <section
                        className="relative overflow-hidden p-7 text-white md:p-10"
                        style={{
                            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                        }}
                    >
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">
                            RegiGo Invitation
                        </p>
                        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                            {event?.event_name ||
                                "Event Invitation"}
                        </h1>
                        <p className="mt-4 text-lg font-semibold text-white/85">
                            Dear{" "}
                            {registration?.full_name ||
                                "Guest"}
                            , please let the organiser know
                            whether you can attend.
                        </p>
                    </section>

                    <section className="p-6 md:p-10">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Detail
                                icon={CalendarDays}
                                label="Date"
                                value={formatEventDate(
                                    event?.event_date,
                                )}
                            />
                            <Detail
                                icon={Clock3}
                                label="Time"
                                value={event?.event_time || "-"}
                            />
                            <Detail
                                icon={MapPin}
                                label="Venue"
                                value={event?.venue || "-"}
                            />
                        </div>

                        {event?.rsvp_deadline && (
                            <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                                Please respond by{" "}
                                {formatEventDate(
                                    event.rsvp_deadline,
                                )}
                                .
                            </p>
                        )}

                        <GuestInvitationResponse
                            slug={slug}
                            token={token}
                            initialStatus={invitation.status}
                            initialDeclineReason={
                                invitation.decline_reason || ""
                            }
                            allowChanges={
                                event?.allow_rsvp_changes !==
                                false
                            }
                            primaryColor={primary}
                            ticketSelectionUrl={
                                ticketSelectionUrl
                            }
                            tableSelectionUrl={
                                tableSelectionUrl
                            }
                        />
                    </section>
                </div>
            </main>
        );
    } catch (error) {
        const message =
            error instanceof InvitationError ||
            error instanceof Error
                ? error.message
                : "This invitation could not be opened.";

        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
                <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                    <h1 className="text-3xl font-black">
                        Invitation unavailable
                    </h1>
                    <p className="mt-4 leading-7 text-slate-600">
                        {message}
                    </p>
                </section>
            </main>
        );
    }
}

function Detail({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof CalendarDays;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <Icon size={20} className="text-[#4F46E5]" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-1 font-black text-slate-800">
                {value}
            </p>
        </div>
    );
}

import {
    CalendarDays,
    CreditCard,
    Ticket,
    XCircle,
} from "lucide-react";
import PublicTicketSelector from "@/components/payments/PublicTicketSelector";
import {
    PaymentError,
} from "@/lib/stripe-payments";
import { getPublicRegistrationTicketContext } from "@/lib/registration-payments";

export const dynamic = "force-dynamic";

export default async function RegistrationTicketSelectionPage({
    params,
}: {
    params: Promise<{
        slug: string;
        token: string;
    }>;
}) {
    const { slug, token } = await params;

    try {
        const context =
            await getPublicRegistrationTicketContext({
                slug,
                token,
            });

        const banner = context.ticketSettings;
        const bannerColorFrom =
            banner?.banner_color_from || "#4F46E5";
        const bannerColorTo =
            banner?.banner_color_to || "#EC4899";

        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 md:p-10">
                <div className="mx-auto max-w-5xl space-y-6">
                    <section
                        className="relative overflow-hidden rounded-[2rem] p-8 text-white shadow-xl"
                        style={{
                            backgroundImage:
                                banner?.banner_image_url
                                    ? `linear-gradient(rgba(2,6,23,.35), rgba(2,6,23,.55)), url("${banner.banner_image_url}")`
                                    : `linear-gradient(to right, ${bannerColorFrom}, ${bannerColorTo})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <div className="relative z-10">
                            <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">
                                Ticket Selection
                            </p>
                            <h1 className="mt-4 text-4xl font-black">
                                {banner?.page_title ||
                                    context.event
                                        .event_name}
                            </h1>
                            {banner?.page_subtitle && (
                                <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/85">
                                    {
                                        banner.page_subtitle
                                    }
                                </p>
                            )}
                            <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-white/85">
                                <span className="inline-flex items-center gap-2">
                                    <CalendarDays
                                        size={16}
                                    />
                                    {
                                        context.event
                                            .event_date
                                    }
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <CreditCard
                                        size={16}
                                    />
                                    Secure Stripe
                                    Checkout
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Ticket className="text-[#4F46E5]" />
                            <div>
                                <h2 className="text-2xl font-black">
                                    Choose your
                                    ticket
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Guest:{" "}
                                    {
                                        context
                                            .registration
                                            .full_name
                                    }
                                </p>
                            </div>
                        </div>

                        <PublicTicketSelector
                            checkoutUrl={`/api/public/events/${encodeURIComponent(
                                slug,
                            )}/registration/${encodeURIComponent(
                                token,
                            )}/checkout`}
                            tickets={
                                context.tickets
                            }
                            quantity={
                                context.partySize
                            }
                        />

                        {context.tickets
                            .length === 0 &&
                            context.diagnostics
                                .totalTicketCount >
                                0 && (
                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                                    <p className="font-black">
                                        This event has{" "}
                                        {
                                            context
                                                .diagnostics
                                                .totalTicketCount
                                        }{" "}
                                        ticket type
                                        {context
                                            .diagnostics
                                            .totalTicketCount ===
                                        1
                                            ? ""
                                            : "s"}{" "}
                                        configured, but
                                        none are
                                        currently
                                        available:
                                    </p>
                                    <ul className="mt-2 list-disc space-y-1 pl-5 font-semibold">
                                        {context.diagnostics.excludedTickets.map(
                                            (
                                                item,
                                                index,
                                            ) => (
                                                <li
                                                    key={
                                                        index
                                                    }
                                                >
                                                    {
                                                        item.ticket_name
                                                    }{" "}
                                                    —{" "}
                                                    {
                                                        item.reason
                                                    }
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                    <p className="mt-3 text-xs font-bold text-amber-700">
                                        Contact the
                                        event organiser
                                        to make a
                                        ticket
                                        available.
                                    </p>
                                </div>
                            )}
                    </section>
                </div>
            </main>
        );
    } catch (error) {
        const message =
            error instanceof PaymentError ||
            error instanceof Error
                ? error.message
                : "Ticket selection is unavailable.";

        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
                <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <XCircle size={26} />
                    </div>
                    <h1 className="mt-5 text-3xl font-black">
                        Tickets unavailable
                    </h1>
                    <p className="mt-4 leading-7 text-slate-600">
                        {message}
                    </p>
                </section>
            </main>
        );
    }
}

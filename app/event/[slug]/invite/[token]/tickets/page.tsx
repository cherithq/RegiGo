import {
    CalendarDays,
    CreditCard,
    Ticket,
} from "lucide-react";
import PublicTicketSelector from "@/components/payments/PublicTicketSelector";
import {
    PaymentError,
    getPublicTicketContext,
} from "@/lib/stripe-payments";

export const dynamic = "force-dynamic";

export default async function TicketSelectionPage({
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
            await getPublicTicketContext({
                slug,
                token,
            });

        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 md:p-10">
                <div className="mx-auto max-w-5xl space-y-6">
                    <section className="rounded-[2rem] bg-gradient-to-r from-[#4F46E5] to-[#EC4899] p-8 text-white shadow-xl">
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">
                            Ticket Selection
                        </p>
                        <h1 className="mt-4 text-4xl font-black">
                            {
                                context.event
                                    .event_name
                            }
                        </h1>
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
                            slug={slug}
                            token={token}
                            tickets={
                                context.tickets
                            }
                        />
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
                    <h1 className="text-3xl font-black">
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

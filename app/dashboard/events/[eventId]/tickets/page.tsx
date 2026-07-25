import Link from "next/link";
import {
    ArrowLeft,
    WalletCards,
} from "lucide-react";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";
import TicketPaymentsManager from "@/components/payments/TicketPaymentsManager";

export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

export default async function TicketsAndPaymentsPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const {
        eventId,
    } = await params;
    const supabaseServer =
        await createSupabaseServerClient();
    const {
        data: event,
        error,
    } = await supabaseServer
        .from(
            "events",
        )
        .select(
            "id, event_name",
        )
        .eq(
            "id",
            eventId,
        )
        .maybeSingle();

    if (
        error ||
        !event
    ) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
                <section className="mx-auto max-w-3xl rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm sm:p-8">
                    <h1 className="text-2xl font-black text-red-600">
                        Event not found
                    </h1>

                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        {error?.message ||
                            "The event could not be found."}
                    </p>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm"
                >
                    <ArrowLeft
                        size={
                            17
                        }
                    />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <WalletCards
                                size={
                                    16
                                }
                            />
                            Tickets & Payments
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                            Tickets & Payments
                        </h1>

                        <p className="mt-3 text-lg font-bold text-slate-500">
                            {event.event_name ||
                                "Event"}
                        </p>

                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            Create free or paid tickets in one place. Payment setup appears only when a paid ticket is used.
                        </p>
                    </div>
                </section>

                <TicketPaymentsManager
                    eventId={
                        eventId
                    }
                />
            </div>
        </main>
    );
}

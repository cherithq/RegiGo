import Link from "next/link";
import {
    ArrowLeft,
    SlidersHorizontal,
} from "lucide-react";
import EventConfigurationManager from "@/components/forms/EventConfigurationManager";
import {
    requireEventConfigurationActor,
} from "@/lib/event-configuration";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default async function EventSettingsPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const { eventId } =
        await params;
    const actor =
        await requireEventConfigurationActor(
            eventId,
        );

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm"
                >
                    <ArrowLeft
                        size={16}
                    />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-32 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <SlidersHorizontal
                                size={16}
                            />
                            Event Configuration
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                            Settings & Add-ons
                        </h1>

                        <p className="mt-3 text-base font-semibold text-slate-500">
                            {
                                actor.event
                                    .event_name
                            }
                        </p>

                        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                            Event details, registration status, module visibility and optional add-ons now use one page and one save action.
                        </p>
                    </div>
                </section>

                <EventConfigurationManager
                    eventId={eventId}
                />
            </div>
        </main>
    );
}

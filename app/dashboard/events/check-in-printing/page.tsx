import {
    Printer,
} from "lucide-react";
import BrowserPrintingStation from "@/components/printing/BrowserPrintingStation";
import { requireCheckInPrintingManager } from "@/lib/checkin-printing";
import BackButton from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CheckInPrintingPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const { eventId } =
        await params;
    const configuration =
        await requireCheckInPrintingManager(
            eventId,
        );

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <BackButton href={`/dashboard/events/${eventId}`}>
                    Back to Event
                </BackButton>

                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-32 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Printer size={16} />
                            Any Installed Printer
                        </div>

                        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                            Browser Print Station
                        </h1>

                        <p className="mt-3 text-base font-semibold text-slate-500">
                            {
                                configuration
                                    .event
                                    .event_name
                            }
                        </p>

                        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                            Keep the station running at
                            the check-in counter. Each
                            successful check-in opens the
                            badge in the browser print
                            dialog, where staff can select
                            any printer installed on the
                            computer.
                        </p>
                    </div>
                </section>

                <BrowserPrintingStation
                    eventId={eventId}
                />
            </div>
        </main>
    );
}

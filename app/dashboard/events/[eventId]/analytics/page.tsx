import { BarChart3 } from "lucide-react";
import EventAnalyticsDashboard from "@/components/analytics/EventAnalyticsDashboard";
import BackButton from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <BackButton href={`/dashboard/events/${eventId}`}>
                    Back to Event
                </BackButton>

                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <BarChart3 size={16} />
                            Mode-Aware Analytics
                        </div>
                        <h1 className="mt-5 text-3xl font-black sm:text-4xl lg:text-5xl">
                            Event Analytics
                        </h1>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            Public events analyse registration-form responses. Private events analyse invitations and RSVP responses. Attendance, department, dietary, seating, reports and exports are available for both modes.
                        </p>
                    </div>
                </section>

                <EventAnalyticsDashboard eventId={eventId} />
            </div>
        </main>
    );
}

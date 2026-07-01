import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import CameraScanner from "@/components/scanner/CameraScanner";
import ManualCheckIn from "@/components/scanner/ManualCheckIn";
import { requirePermission } from "@/lib/permissions";

export default async function ScannerPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    await requirePermission("can_scan_qr");
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <main className="p-8">Event not found.</main>;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-4xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="font-bold text-[#4F46E5]"
                >
                    ← Back to Event
                </Link>

                <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-4xl font-black">QR Scanner</h1>
                    <p className="mt-2 text-slate-600">{event.event_name}</p>

                    <div className="mt-8">
                        <CameraScanner eventId={eventId} />
                        <div className="mt-8">
                            <ManualCheckIn eventId={eventId} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
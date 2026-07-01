import { supabaseServer } from "@/lib/supabase-server";
import QRPassCard from "@/components/qr/QRPassCard";

export default async function QRPassPage({
    searchParams,
}: {
    searchParams: Promise<{ registration?: string }>;
}) {
    const { registration } = await searchParams;

    if (!registration) {
        return <main className="p-8">QR pass not found. Missing registration ID.</main>;
    }

    const { data: guest, error: guestError } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("id", registration)
        .maybeSingle();

    if (guestError || !guest) {
        return (
            <main className="p-8">
                Guest not found.
                <pre className="mt-4 whitespace-pre-wrap text-xs text-red-600">
                    {guestError?.message}
                </pre>
            </main>
        );
    }

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", guest.event_id)
        .maybeSingle();

    const { data: ticket, error: ticketError } = await supabaseServer
        .from("qr_tickets")
        .select("*")
        .eq("registration_id", registration)
        .eq("is_active", true)
        .maybeSingle();

    if (eventError || ticketError || !event || !ticket) {
        return (
            <main className="p-8">
                QR pass not found.
                <pre className="mt-4 whitespace-pre-wrap text-xs text-red-600">
                    {eventError?.message || ticketError?.message}
                </pre>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8">
            <div className="mx-auto max-w-xl">
                <QRPassCard event={event} guest={guest} ticket={ticket} />
            </div>
        </main>
    );
}
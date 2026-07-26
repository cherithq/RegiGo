import { createSupabaseServerClient } from "@/lib/supabase-server";
import QRPassCard from "@/components/qr/QRPassCard";

export default async function QRPassPage({
    searchParams,
}: {
    searchParams: Promise<{ registration?: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
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

    // table_assignments.event_id is not reliably populated, so look this up
    // by registration_id instead of relying on a join through events.
    const { data: tableAssignment } = await supabaseServer
        .from("table_assignments")
        .select("table_id, event_tables(table_name)")
        .eq("registration_id", registration)
        .maybeSingle();

    const eventTables = tableAssignment?.event_tables as
        | { table_name?: string }
        | { table_name?: string }[]
        | null
        | undefined;

    const tableName = Array.isArray(eventTables)
        ? eventTables[0]?.table_name
        : eventTables?.table_name;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8">
            <div className="mx-auto max-w-xl">
                <QRPassCard
                    event={event}
                    guest={guest}
                    ticket={ticket}
                    tableName={tableName || null}
                />
            </div>
        </main>
    );
}
import { createClient } from "@supabase/supabase-js";
import { isQrPassReady } from "@/lib/qr-pass-activation";
import QRPassCard from "@/components/qr/QRPassCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Supabase server configuration is missing.",
        );
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}

export default async function QRPassPage({
    searchParams,
}: {
    searchParams: Promise<{ registration?: string }>;
}) {
    const admin = adminClient();
    const { registration } = await searchParams;

    if (!registration) {
        return <main className="p-8">QR pass not found. Missing registration ID.</main>;
    }

    const { data: guest, error: guestError } = await admin
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

    const { data: event, error: eventError } = await admin
        .from("events")
        .select("*")
        .eq("id", guest.event_id)
        .maybeSingle();

    const { data: ticket, error: ticketError } = await admin
        .from("qr_tickets")
        .select("*")
        .eq("registration_id", registration)
        .eq("is_active", true)
        .maybeSingle();

    // Defense-in-depth: even if qr_tickets.is_active is (incorrectly) true —
    // some registration paths go through database stored procedures this
    // app doesn't fully control — never show the pass unless payment and
    // any required table selection are actually satisfied.
    const passReady =
        Boolean(ticket) &&
        (await isQrPassReady({
            admin,
            registration: {
                id: guest.id,
                event_id: guest.event_id,
                payment_status: guest.payment_status,
            },
        }));

    if (eventError || ticketError || !event || !passReady) {
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
    const { data: tableAssignment } = await admin
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

import { createClient } from "@supabase/supabase-js";
import { Clock3, XCircle } from "lucide-react";
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

function NotFoundState({
    description,
}: {
    description: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <XCircle size={26} />
                </div>
                <h1 className="mt-5 text-2xl font-black text-slate-900">
                    QR pass not found
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </section>
        </main>
    );
}

function NotReadyState({
    description,
}: {
    description: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Clock3 size={26} />
                </div>
                <h1 className="mt-5 text-2xl font-black text-slate-900">
                    Your pass isn&apos;t ready yet
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </section>
        </main>
    );
}

export default async function QRPassPage({
    searchParams,
}: {
    searchParams: Promise<{ registration?: string }>;
}) {
    const admin = adminClient();
    const { registration } = await searchParams;

    if (!registration) {
        return (
            <NotFoundState description="This pass link is missing its registration reference. Use the link from your confirmation email instead." />
        );
    }

    const { data: guest, error: guestError } = await admin
        .from("registrations")
        .select("*")
        .eq("id", registration)
        .maybeSingle();

    if (guestError || !guest) {
        return (
            <NotFoundState description="We couldn't find a registration matching this pass link. It may have been removed, or the link may be incorrect." />
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

    if (eventError || ticketError || !event) {
        return (
            <NotFoundState description="We couldn't load this pass. Please try the link from your confirmation email again, or contact the event organiser." />
        );
    }

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

    if (!passReady) {
        return (
            <NotReadyState description="Your registration is still being processed — this usually only takes a moment. Refresh this page shortly, or check your email for the confirmation with your QR pass once it arrives." />
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

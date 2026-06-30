import Link from "next/link";
import { supabaseServer } from "../../../../lib/supabase-server";
import QRPassCard from "@/components/qr/QRPassCard";

export default async function PassPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ registration?: string }>;
}) {
    const { slug } = await params;
    const { registration } = await searchParams;

    if (!registration) {
        return <main className="p-8">Registration not found.</main>;
    }

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("event_slug", slug)
        .single();

    const { data: guest } = await supabaseServer
        .from("registrations")
        .select(`
    *,
    table_assignments(
      *,
    event_tables(*)
    )
    `)
        .eq("id", registration)
        .single();

    const { data: ticket } = await supabaseServer
        .from("qr_tickets")
        .select("*")
        .eq("registration_id", registration)
        .single();

    if (!event || !guest || !ticket) {
        return <main className="p-8">QR pass not found.</main>;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 py-10 text-slate-950">
            <div className="w-full max-w-xl">
                <QRPassCard event={event} guest={guest} ticket={ticket} />

                <div className="mt-6 text-center">
                    <Link
                        href={`/event/${slug}`}
                        className="font-bold text-[#4F46E5]"
                    >
                        Back to Event Page
                    </Link>
                </div>
            </div>
        </main>
    );
}
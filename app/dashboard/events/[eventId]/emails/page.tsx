import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EmailCentre from "@/components/forms/EmailCentre";
import { redirect } from "next/navigation";

export default async function EmailsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabaseServer
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        redirect("/dashboard");
    }
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <div>Event not found.</div>;

    const { data: templates } = await supabaseServer
        .from("email_templates")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    return (
        <div className="mx-auto max-w-7xl">
            <Link href={`/dashboard/events/${eventId}`} className="font-bold text-[#4F46E5]">
                ← Back to Event
            </Link>

            <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                <h1 className="text-4xl font-black">Email Centre</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8">
                    <EmailCentre event={event} templates={templates || []} />
                </div>
            </div>
        </div>
    );
}
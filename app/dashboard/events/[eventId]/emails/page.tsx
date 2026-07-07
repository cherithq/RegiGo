import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EmailCentre from "@/components/forms/EmailCentre";

export const dynamic = "force-dynamic";

type EnabledModules = {
    emails?: boolean;
    [key: string]: boolean | undefined;
};

export default async function EmailsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    const { eventId } = await params;

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
        .maybeSingle();

    const role = profile?.role;

    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer" || role === "organiser";

    if (!isAdmin && !isOrganizer) {
        redirect("/dashboard");
    }

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    /**
     * Admin always has access.
     * Organizer only has access if Email Centre module is enabled.
     */
    if (!isAdmin) {
        const { data: settings } = await supabaseServer
            .from("event_settings")
            .select("enabled_modules")
            .eq("event_id", eventId)
            .maybeSingle();

        const enabledModules =
            (settings?.enabled_modules as EnabledModules | null) || {};

        if (enabledModules.emails === false) {
            redirect(`/dashboard/events/${eventId}`);
        }
    }

    const { data: templates } = await supabaseServer
        .from("email_templates")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex font-bold text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    ← Back to Event
                </Link>

                <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                        Event Emails
                    </p>

                    <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                        Email Centre
                    </h1>

                    <p className="mt-2 text-slate-600">
                        {event.event_name || event.title || event.name || "Event"}
                    </p>

                    <div className="mt-8">
                        <EmailCentre event={event} templates={templates || []} />
                    </div>
                </section>
            </div>
        </main>
    );
}
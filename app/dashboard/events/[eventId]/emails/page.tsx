import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
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
        redirect("/auth/login");
    }

    const [profileResult, eventResult] = await Promise.all([
        supabaseServer
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle(),

        supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),
    ]);

    const role = profileResult.data?.role;

    const isAdmin = role === "admin";
    const isOrganizer = role === "organizer" || role === "organiser";

    if (!isAdmin && !isOrganizer) {
        redirect("/dashboard");
    }

    const event = eventResult.data;

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

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

    const eventName = event.event_name || event.title || event.name || "Event";

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl space-y-5 md:space-y-8">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#EC4899]/10 blur-3xl md:h-56 md:w-56" />
                    <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-[#4F46E5]/10 blur-3xl md:right-32 md:h-56 md:w-56" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5] md:px-4 md:text-sm">
                            <Mail size={15} />
                            Event Emails
                        </div>

                        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:mt-5 md:text-5xl">
                            Email Centre
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Manage confirmation, reminder, update, and thank-you templates for{" "}
                            <span className="font-black text-slate-950">
                                {eventName}
                            </span>
                            .
                        </p>
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                    <EmailCentre event={event} templates={templates || []} />
                </section>
            </div>
        </main>
    );
}
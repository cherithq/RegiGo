import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import RegistrationFieldsBuilder from "@/components/forms/RegistrationFieldsBuilder";
import { requirePermission } from "@/lib/permissions";

export default async function RegistrationBuilderPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const supabaseServer = await createSupabaseServerClient();
    await requirePermission("can_manage_settings");
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) {
        return <main className="p-8">Event not found.</main>;
    }

    const { data: form } = await supabaseServer
        .from("registration_forms")
        .select("*")
        .eq("event_id", event.id)
        .maybeSingle();

    const { data: fields } = await supabaseServer
        .from("registration_fields")
        .select("*")
        .eq("form_id", form?.id)
        .order("sort_order", { ascending: true });

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-5xl">
                <Link
                    href={`/dashboard/events/${event.id}`}
                    className="font-bold text-[#4F46E5]"
                >
                    ← Back to Event
                </Link>

                <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-4xl font-black">Registration Form Builder</h1>
                    <p className="mt-2 text-slate-600">{event.event_name}</p>

                    {form ? (
                        <div className="mt-8">
                            <RegistrationFieldsBuilder
                                formId={form.id}
                                initialFields={fields || []}
                            />
                        </div>
                    ) : (
                        <p className="mt-8 text-red-600">No registration form found.</p>
                    )}
                </div>
            </div>
        </main>
    );
}
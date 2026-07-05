import Link from "next/link";
import {
    ArrowLeft,
    ClipboardList,
    Globe2,
    ListChecks,
    Phone,
    Settings2,
} from "lucide-react";
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
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
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
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${event.id}`}
                    className="inline-flex items-center gap-2 text-sm font-black text-[#4F46E5] transition hover:text-[#EC4899]"
                >
                    <ArrowLeft size={16} />
                    Back to Event
                </Link>

                <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <ClipboardList size={16} />
                                Admin Only
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Registration Form Builder
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                                Customise the fields guests need to complete when registering
                                for this event.
                            </p>

                            <p className="mt-2 text-sm font-bold text-slate-500">
                                {event.event_name}
                            </p>
                        </div>

                        <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                            <div className="grid gap-4">
                                <BuilderInfo
                                    icon={Phone}
                                    title="Phone Country Codes"
                                    text="Allow multiple country codes for phone number fields."
                                />
                                <BuilderInfo
                                    icon={ListChecks}
                                    title="Choice Fields"
                                    text="Create dropdown, radio and checkbox fields."
                                />
                                <BuilderInfo
                                    icon={Globe2}
                                    title="Guest-Friendly Inputs"
                                    text="Add placeholders, help text and field validation."
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {form ? (
                    <section className="mt-8">
                        <RegistrationFieldsBuilder
                            formId={form.id}
                            initialFields={fields || []}
                        />
                    </section>
                ) : (
                    <section className="mt-8 rounded-[2rem] border border-red-100 bg-red-50 p-8 text-red-700">
                        <p className="font-black">No registration form found.</p>
                        <p className="mt-2 text-sm font-semibold">
                            Create or initialise a registration form before adding fields.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}

function BuilderInfo({
    icon: Icon,
    title,
    text,
}: {
    icon: any;
    title: string;
    text: string;
}) {
    return (
        <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="h-fit rounded-xl bg-[#F7F5FF] p-2 text-[#4F46E5]">
                <Icon size={18} />
            </div>

            <div>
                <p className="font-black text-slate-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
            </div>
        </div>
    );
}
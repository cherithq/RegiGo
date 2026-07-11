import Link from "next/link";
import {
    ArrowLeft,
    ClipboardList,
    Eye,
    ImagePlus,
    ListChecks,
    MousePointerClick,
    PlusCircle,
    Settings2,
    Sparkles,
} from "lucide-react";
import RegistrationFieldsBuilder from "@/components/forms/RegistrationFieldsBuilder";
import { requirePermission } from "@/lib/permissions";

type RegistrationField = {
    id: string;
    form_id: string;
    field_label: string;
    field_key: string;
    field_type: string;
    is_required: boolean;
    sort_order: number;
    field_options?: any;
    options?: any;
};

export default async function RegistrationBuilderPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { supabaseServer } = await requirePermission("can_manage_settings");
    const { eventId } = await params;

    const [eventResult, formResult] = await Promise.all([
        supabaseServer
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        supabaseServer
            .from("registration_forms")
            .select("*")
            .eq("event_id", eventId)
            .maybeSingle(),
    ]);

    const event = eventResult.data;

    if (eventResult.error) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">
                        Failed to load event: {eventResult.error.message}
                    </p>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
                <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-8 shadow-sm">
                    <p className="font-black text-red-600">Event not found.</p>
                </div>
            </main>
        );
    }

    const form = formResult.data;

    let fields: RegistrationField[] = [];

    if (form?.id) {
        const { data: fieldRows } = await supabaseServer
            .from("registration_fields")
            .select("*")
            .eq("form_id", form.id)
            .order("sort_order", { ascending: true });

        fields = (fieldRows || []) as RegistrationField[];
    }

    const eventName = event.event_name || event.title || event.name || "Event";
    const eventSlug = event.event_slug || event.slug;

    const requiredFields = fields.filter((field) => field.is_required).length;

    const choiceFields = fields.filter((field) =>
        ["select", "radio", "checkbox", "image_radio", "image_checkbox"].includes(
            field.field_type
        )
    ).length;

    const imageChoiceFields = fields.filter(
        (field) =>
            field.field_type === "image_radio" ||
            field.field_type === "image_checkbox"
    ).length;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
        <Link
            href={`/dashboard/events/${event.id}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
        >
            <ArrowLeft size={16} />
            Back to Event
        </Link>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        <ClipboardList size={16} />
                        Registration Builder
                    </div>
                            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Guest Registration Form
                            </h1>

                            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                                Build the form guests complete before attending{" "}
                                <span className="font-black text-slate-950">
                                    {eventName}
                                </span>
                                . Add fields, mark important questions as required, and reorder
                                them clearly.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {eventSlug && (
                                <Link
                                    href={`/event/${eventSlug}`}
                                    target="_blank"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-[#F7F5FF] hover:text-[#4F46E5]"
                                >
                                    <Eye size={17} />
                                    View Public Form
                                </Link>
                            )}

                            <a
                                href="#builder"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                            >
                                <MousePointerClick size={17} />
                                Edit Form
                            </a>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Fields"
                        value={fields.length}
                        text="Questions in this form"
                        icon={ClipboardList}
                    />

                    <SummaryCard
                        title="Required"
                        value={requiredFields}
                        text="Guests must complete these"
                        icon={ListChecks}
                    />

                    <SummaryCard
                        title="Choice Fields"
                        value={choiceFields}
                        text="Dropdown, radio and checkbox fields"
                        icon={Settings2}
                    />

                    <SummaryCard
                        title="Image Choices"
                        value={imageChoiceFields}
                        text="Visual options like food or gifts"
                        icon={ImagePlus}
                    />
                </section>

                <section className="grid gap-5 lg:grid-cols-3">
                    <GuideCard
                        number="01"
                        title="Add guest details"
                        text="Start with core information such as full name, email, mobile number, department, and dietary needs."
                    />

                    <GuideCard
                        number="02"
                        title="Use clear choices"
                        text="Use dropdowns, checkboxes, and image choices when guests need to pick from fixed options."
                    />

                    <GuideCard
                        number="03"
                        title="Review before sharing"
                        text="Check the saved field list, reorder questions, then open the public form to test the guest experience."
                    />
                </section>

                <section
                    id="builder"
                    className="scroll-mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:p-6"
                >
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Sparkles size={16} />
                                Builder Area
                            </div>

                            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                                Add, edit and reorder fields
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                The left panel is for creating or editing a field. The right
                                panel shows what is already saved.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-5 py-3 text-sm font-black text-slate-700">
                            <PlusCircle size={17} className="text-[#4F46E5]" />
                            {fields.length} field{fields.length === 1 ? "" : "s"} saved
                        </div>
                    </div>

                    {form ? (
                        <RegistrationFieldsBuilder
                            formId={form.id}
                            initialFields={fields || []}
                        />
                    ) : (
                        <div className="rounded-[2rem] border border-red-100 bg-red-50 p-8 text-red-700">
                            <p className="text-lg font-black">
                                No registration form found.
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                                Create or initialise a registration form before adding fields.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function SummaryCard({
    title,
    value,
    text,
    icon: Icon,
}: {
    title: string;
    value: number;
    text: string;
    icon: any;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-500">{title}</p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                    <Icon size={22} />
                </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}

function GuideCard({
    number,
    title,
    text,
}: {
    number: string;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-sm font-black text-white">
                    {number}
                </div>

                <h3 className="text-lg font-black text-slate-950">{title}</h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}
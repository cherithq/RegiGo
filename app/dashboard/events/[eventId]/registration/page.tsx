import Link from "next/link";
import {
    ArrowLeft,
    ClipboardList,
    Eye,
    FileText,
    Globe2,
    ImagePlus,
    LayoutList,
    ListChecks,
    MousePointerClick,
    Phone,
    Settings2,
    Sparkles,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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

    const requiredFields = fields.filter((field) => field.is_required).length;

    const imageChoiceFields = fields.filter(
        (field) =>
            field.field_type === "image_radio" ||
            field.field_type === "image_checkbox"
    ).length;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="sticky top-0 z-30 -mx-5 border-b border-slate-200 bg-[#F7F5FF]/90 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                        <Link
                            href={`/dashboard/events/${event.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                        >
                            <ArrowLeft size={16} />
                            Back to Event
                        </Link>

                        <div className="flex flex-wrap gap-2">
                            <a
                                href="#overview"
                                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:bg-[#4F46E5] hover:text-white"
                            >
                                Overview
                            </a>

                            <a
                                href="#current-fields"
                                className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:bg-[#4F46E5] hover:text-white"
                            >
                                Fields
                            </a>

                            <a
                                href="#form-builder"
                                className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-90"
                            >
                                Add / Edit Fields
                            </a>
                        </div>
                    </div>
                </div>

                <section
                    id="overview"
                    className="relative mt-6 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-10"
                >
                    <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute bottom-0 right-40 h-72 w-72 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <ClipboardList size={16} />
                                Registration Form Builder
                            </div>

                            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Build a clearer guest registration form
                            </h1>

                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                                Add, edit, organise and customise the fields guests need to complete.
                                Use image choice fields for food selections, gift options, packages
                                or activity choices.
                            </p>

                            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                    Current Event
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950">
                                    {eventName}
                                </p>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <a
                                    href="#form-builder"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                                >
                                    <MousePointerClick size={18} />
                                    Start Editing Form
                                </a>

                                <a
                                    href="#current-fields"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                                >
                                    <Eye size={18} />
                                    View Current Fields
                                </a>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <StatCard
                                icon={LayoutList}
                                label="Total Fields"
                                value={String(fields.length)}
                                text="Fields currently added to this registration form."
                            />

                            <StatCard
                                icon={ListChecks}
                                label="Required Fields"
                                value={String(requiredFields)}
                                text="Fields guests must complete before submitting."
                            />

                            <StatCard
                                icon={ImagePlus}
                                label="Image Choice Fields"
                                value={String(imageChoiceFields)}
                                text="Useful for food selection, gifts or visual options."
                            />
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-5 lg:grid-cols-4">
                    <BuilderInfo
                        icon={FileText}
                        title="Step 1"
                        heading="Add basic details"
                        text="Use text, email, phone, company and job title fields for guest information."
                    />

                    <BuilderInfo
                        icon={ListChecks}
                        title="Step 2"
                        heading="Add choices"
                        text="Use dropdown, radio or checkbox fields when guests need to select options."
                    />

                    <BuilderInfo
                        icon={ImagePlus}
                        title="Step 3"
                        heading="Add image choices"
                        text="Upload images for food selections, gift options, activities or packages."
                    />

                    <BuilderInfo
                        icon={Settings2}
                        title="Step 4"
                        heading="Review and reorder"
                        text="Move fields up or down so the guest form flows clearly."
                    />
                </section>

                <section
                    id="current-fields"
                    className="mt-8 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Sparkles size={16} />
                                Current Form Overview
                            </div>

                            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                                Fields already added
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                Quickly check what guests will be asked before editing the form below.
                            </p>
                        </div>

                        <a
                            href="#form-builder"
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-[#4F46E5]"
                        >
                            Add New Field
                        </a>
                    </div>

                    {fields.length > 0 ? (
                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {fields.map((field, index) => (
                                <FieldPreviewCard
                                    key={field.id}
                                    index={index}
                                    field={field}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm">
                                <ClipboardList size={30} />
                            </div>

                            <p className="mt-4 text-lg font-black text-slate-800">
                                No fields added yet
                            </p>

                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                Start by adding basic guest details like name, email and phone number.
                            </p>

                            <a
                                href="#form-builder"
                                className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 text-sm font-black text-white"
                            >
                                Add First Field
                            </a>
                        </div>
                    )}
                </section>

                <section className="mt-8 grid gap-5 lg:grid-cols-3">
                    <SmallTip
                        icon={Phone}
                        title="Phone Country Codes"
                        text="For phone fields, choose the country codes guests can select from."
                    />

                    <SmallTip
                        icon={Globe2}
                        title="Guest-Friendly Form"
                        text="Use placeholders and help text so guests understand what to enter."
                    />

                    <SmallTip
                        icon={ImagePlus}
                        title="Image Options"
                        text="Use image single choice for food menus and image multiple choice for packages."
                    />
                </section>

                <section id="form-builder" className="mt-8 scroll-mt-28">
                    <div className="mb-5 rounded-[2rem] border border-indigo-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4F46E5]">
                                    Edit Area
                                </p>

                                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                                    Add or edit registration fields
                                </h2>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Use the left panel to add or edit a field. The right panel
                                    shows saved fields and lets you reorder them.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-[#F7F5FF] px-5 py-3 text-sm font-black text-[#4F46E5]">
                                {fields.length} field{fields.length === 1 ? "" : "s"} saved
                            </div>
                        </div>
                    </div>

                    {form ? (
                        <RegistrationFieldsBuilder
                            formId={form.id}
                            initialFields={fields || []}
                        />
                    ) : (
                        <section className="rounded-[2rem] border border-red-100 bg-red-50 p-8 text-red-700">
                            <p className="font-black">No registration form found.</p>
                            <p className="mt-2 text-sm font-semibold">
                                Create or initialise a registration form before adding fields.
                            </p>
                        </section>
                    )}
                </section>
            </div>
        </main>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    text,
}: {
    icon: any;
    label: string;
    value: string;
    text: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        {label}
                    </p>
                    <p className="mt-2 text-4xl font-black text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-3 text-[#4F46E5] shadow-sm">
                    <Icon size={22} />
                </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}

function BuilderInfo({
    icon: Icon,
    title,
    heading,
    text,
}: {
    icon: any;
    title: string;
    heading: string;
    text: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon size={22} />
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[#EC4899]">
                {title}
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">{heading}</p>

            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}

function SmallTip({
    icon: Icon,
    title,
    text,
}: {
    icon: any;
    title: string;
    text: string;
}) {
    return (
        <div className="flex gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-fit rounded-2xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                <Icon size={20} />
            </div>

            <div>
                <p className="font-black text-slate-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
            </div>
        </div>
    );
}

function FieldPreviewCard({
    field,
    index,
}: {
    field: RegistrationField;
    index: number;
}) {
    const options = field.field_options || field.options || {};
    const choiceCount =
        options.choices?.length || options.image_choices?.length || 0;

    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Field {index + 1}
                    </p>

                    <h3 className="mt-2 text-lg font-black text-slate-950">
                        {field.field_label}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        Key: {field.field_key}
                    </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#4F46E5]">
                    {formatFieldType(field.field_type)}
                </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {field.is_required && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                        Required
                    </span>
                )}

                {choiceCount > 0 && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                        {choiceCount} option{choiceCount === 1 ? "" : "s"}
                    </span>
                )}

                {options.help_text && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                        Help text added
                    </span>
                )}
            </div>
        </div>
    );
}

function formatFieldType(type: string) {
    if (type === "image_radio") return "Image Choice";
    if (type === "image_checkbox") return "Image Multi Choice";
    if (type === "job_title") return "Job Title";

    return type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
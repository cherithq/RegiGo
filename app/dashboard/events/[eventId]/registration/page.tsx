import Link from "next/link";
import {
    ClipboardList,
    Eye,
    ListChecks,
    PlusCircle,
    Sparkles,
} from "lucide-react";
import RegistrationFieldsBuilder from "@/components/forms/RegistrationFieldsBuilder";
import RegistrationFormSettings from "@/components/forms/RegistrationFormSettings";
import {
    getRegistrationBuilderContext,
} from "@/lib/registration-builder";
import BackButton from "@/components/layout/BackButton";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default async function RegistrationBuilderPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const {
        eventId,
    } = await params;
    const context =
        await getRegistrationBuilderContext(
            eventId,
        );
    const eventName =
        context.event
            .event_name ||
        "Event";
    const eventSlug =
        context.event
            .event_slug;
    const required =
        context.fields.filter(
            (field) =>
                Boolean(
                    field.is_required,
                ),
        ).length;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="relative z-10">
                        <BackButton
                            href={`/dashboard/events/${eventId}`}
                            variant="subtle"
                        >
                            Back to Event
                        </BackButton>

                        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <ClipboardList
                                size={16}
                            />
                            Registration Form Builder
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                            Create and edit the guest form
                        </h1>

                        <p className="mt-3 text-sm font-black text-slate-500 sm:text-base">
                            {eventName}
                        </p>

                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            RegiGo automatically creates the registration form for every event. Company Admins and assigned Organizers can add, edit, remove and reorder fields.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <a
                                href="#builder"
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white"
                            >
                                <PlusCircle
                                    size={18}
                                />
                                Edit Fields
                            </a>

                            {eventSlug && (
                                <Link
                                    href={`/event/${eventSlug}/register`}
                                    target="_blank"
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                                >
                                    <Eye
                                        size={18}
                                    />
                                    Preview Public Form
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <Summary
                        label="Saved Fields"
                        value={
                            context
                                .fields
                                .length
                        }
                    />
                    <Summary
                        label="Required"
                        value={
                            required
                        }
                    />
                    <Summary
                        label="Form Status"
                        value={
                            context.form
                                .is_active
                                ? "Active"
                                : "Inactive"
                        }
                    />
                </section>

                <RegistrationFormSettings
                    formId={
                        context.form.id
                    }
                    initialTitle={
                        context.form
                            .form_title
                    }
                    initialDescription={
                        context.form
                            .form_description
                    }
                />

                <section
                    id="builder"
                    className="scroll-mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                >
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                <Sparkles
                                    size={16}
                                />
                                Builder Area
                            </div>
                            <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                                Add, edit and reorder fields
                            </h2>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                            <ListChecks
                                size={17}
                            />
                            {
                                context
                                    .fields
                                    .length
                            }{" "}
                            fields
                        </div>
                    </div>

                    <RegistrationFieldsBuilder
                        formId={
                            context.form.id
                        }
                        initialFields={
                            context.fields
                        }
                    />
                </section>
            </div>
        </main>
    );
}

function Summary({
    label,
    value,
}: {
    label: string;
    value:
        | string
        | number;
}) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-2xl font-black">
                {value}
            </p>
        </div>
    );
}

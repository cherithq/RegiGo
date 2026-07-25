"use client";

import {
    CheckCircle2,
    Loader2,
    Save,
} from "lucide-react";
import {
    useState,
} from "react";
import {
    supabase,
} from "@/lib/supabase";

export default function RegistrationFormSettings({
    formId,
    initialTitle,
    initialDescription,
}: {
    formId: string;
    initialTitle:
        | string
        | null;
    initialDescription:
        | string
        | null;
}) {
    const [
        title,
        setTitle,
    ] = useState(
        initialTitle ||
            "Registration Form",
    );
    const [
        description,
        setDescription,
    ] = useState(
        initialDescription ||
            "",
    );
    const [
        saving,
        setSaving,
    ] = useState(false);
    const [
        message,
        setMessage,
    ] = useState("");

    async function save() {
        const cleanTitle =
            title.trim();

        if (!cleanTitle) {
            setMessage(
                "Enter a form title.",
            );
            return;
        }

        setSaving(true);
        setMessage("");

        const {
            error,
        } = await supabase
            .from(
                "registration_forms",
            )
            .update({
                form_title:
                    cleanTitle,
                form_description:
                    description.trim() ||
                    null,
            })
            .eq(
                "id",
                formId,
            );

        if (error) {
            setMessage(
                error.message,
            );
            setSaving(false);
            return;
        }

        setMessage(
            "Form details saved.",
        );
        setSaving(false);
    }

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-black sm:text-2xl">
                        Form Details
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Edit the title and introduction shown above the guest registration fields.
                    </p>
                </div>

                {message && (
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                        <CheckCircle2
                            size={16}
                            className="text-emerald-600"
                        />
                        {message}
                    </div>
                )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
                <label>
                    <span className="mb-2 block text-sm font-black text-slate-700">
                        Form title
                    </span>
                    <input
                        value={title}
                        maxLength={
                            160
                        }
                        onChange={(
                            event,
                        ) =>
                            setTitle(
                                event
                                    .target
                                    .value,
                            )
                        }
                        className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                    />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-black text-slate-700">
                        Form introduction
                    </span>
                    <textarea
                        value={
                            description
                        }
                        maxLength={
                            1000
                        }
                        rows={3}
                        onChange={(
                            event,
                        ) =>
                            setDescription(
                                event
                                    .target
                                    .value,
                            )
                        }
                        placeholder="Tell guests what they need to prepare before registering."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                    />
                </label>
            </div>

            <button
                type="button"
                onClick={() =>
                    void save()
                }
                disabled={saving}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60 sm:w-auto"
            >
                {saving ? (
                    <Loader2
                        size={18}
                        className="animate-spin"
                    />
                ) : (
                    <Save
                        size={18}
                    />
                )}
                Save Form Details
            </button>
        </section>
    );
}

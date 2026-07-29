import {
    getRegistrationFieldOptions,
    getRegistrationImageChoices,
    type RegistrationAnswerValue,
    type RegistrationField,
} from "@/lib/registration-field-options";

// Server-rendered (no "use client") so these plain-named inputs post
// natively as part of whichever <form action={serverAction}> they're
// nested in — no controlled state needed. image_radio/image_checkbox
// fields render as plain choice lists here (no image grid) since this is
// meant for compact RSVP-accept contexts, not the full registration page.
export default function RegistrationFieldFormInputs({
    fields,
    answers = {},
}: {
    fields: RegistrationField[];
    answers?: Record<
        string,
        RegistrationAnswerValue | undefined
    >;
}) {
    const orderedFields = [...fields].sort(
        (a, b) =>
            Number(a.sort_order || 0) -
            Number(b.sort_order || 0),
    );

    return (
        <>
            {orderedFields.map((field) => (
                <FieldShell
                    key={field.id}
                    field={field}
                >
                    <FieldControl
                        field={field}
                        value={
                            answers[field.field_key]
                        }
                    />
                </FieldShell>
            ))}
        </>
    );
}

function FieldShell({
    field,
    children,
}: {
    field: RegistrationField;
    children: React.ReactNode;
}) {
    const options =
        getRegistrationFieldOptions(field);

    return (
        <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                {field.field_label}
                {field.is_required && (
                    <span className="text-red-500">
                        {" "}
                        *
                    </span>
                )}
            </span>

            {children}

            {options.help_text && (
                <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-400">
                    {options.help_text}
                </span>
            )}
        </label>
    );
}

const inputClass =
    "min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-2.5 font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10";

function FieldControl({
    field,
    value,
}: {
    field: RegistrationField;
    value: RegistrationAnswerValue | undefined;
}) {
    const type = String(
        field.field_type || "text",
    ).toLowerCase();
    const options =
        getRegistrationFieldOptions(field);
    const choices = options.choices || [];
    const placeholder =
        options.placeholder ||
        `Enter ${field.field_label}`;
    const stringValue =
        typeof value === "string" ? value : "";

    if (type === "textarea") {
        return (
            <textarea
                name={field.field_key}
                required={
                    Boolean(field.is_required)
                }
                defaultValue={stringValue}
                placeholder={placeholder}
                rows={3}
                className={inputClass}
            />
        );
    }

    if (type === "select") {
        return (
            <select
                name={field.field_key}
                required={
                    Boolean(field.is_required)
                }
                defaultValue={stringValue}
                className={`${inputClass} bg-white`}
            >
                <option value="">
                    {options.placeholder ||
                        "Select an option"}
                </option>

                {choices.map((choice) => (
                    <option
                        key={choice}
                        value={choice}
                    >
                        {choice}
                    </option>
                ))}
            </select>
        );
    }

    if (
        type === "radio" ||
        type === "image_radio"
    ) {
        const imageChoices =
            type === "image_radio"
                ? getRegistrationImageChoices(
                      options,
                  )
                : choices.map((choice) => ({
                      label: choice,
                  }));

        return (
            <div className="space-y-2">
                {imageChoices.map(
                    (choice, index) => (
                        <label
                            key={
                                choice.label ||
                                index
                            }
                            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-[#F7F5FF] p-3 text-sm font-bold text-slate-700 transition hover:border-[#4F46E5]"
                        >
                            <input
                                type="radio"
                                name={
                                    field.field_key
                                }
                                value={
                                    choice.label ||
                                    ""
                                }
                                required={
                                    Boolean(
                                        field.is_required,
                                    ) &&
                                    index === 0
                                }
                                defaultChecked={
                                    stringValue ===
                                    choice.label
                                }
                                className="accent-[#4F46E5]"
                            />
                            {choice.label}
                        </label>
                    ),
                )}

                {imageChoices.length === 0 && (
                    <MissingOptionsNotice />
                )}
            </div>
        );
    }

    if (
        type === "checkbox" ||
        type === "image_checkbox"
    ) {
        const imageChoices =
            type === "image_checkbox"
                ? getRegistrationImageChoices(
                      options,
                  )
                : choices.map((choice) => ({
                      label: choice,
                  }));
        const selectedValues = Array.isArray(
            value,
        )
            ? value.map(String)
            : [];

        return (
            <div className="space-y-2">
                {imageChoices.map(
                    (choice, index) => (
                        <label
                            key={
                                choice.label ||
                                index
                            }
                            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-[#F7F5FF] p-3 text-sm font-bold text-slate-700 transition hover:border-[#4F46E5]"
                        >
                            <input
                                type="checkbox"
                                name={
                                    field.field_key
                                }
                                value={
                                    choice.label ||
                                    ""
                                }
                                defaultChecked={selectedValues.includes(
                                    choice.label ||
                                        "",
                                )}
                                className="accent-[#4F46E5]"
                            />
                            {choice.label}
                        </label>
                    ),
                )}

                {imageChoices.length === 0 && (
                    <MissingOptionsNotice />
                )}
            </div>
        );
    }

    if (type === "file") {
        return (
            <input
                type="file"
                name={field.field_key}
                required={
                    Boolean(field.is_required)
                }
                className={inputClass}
            />
        );
    }

    const htmlInputType =
        type === "email"
            ? "email"
            : type === "number"
              ? "number"
              : type === "date"
                ? "date"
                : type === "time"
                  ? "time"
                  : type === "phone"
                    ? "tel"
                    : "text";

    return (
        <input
            type={htmlInputType}
            name={field.field_key}
            required={
                Boolean(field.is_required)
            }
            defaultValue={stringValue}
            placeholder={placeholder}
            className={inputClass}
        />
    );
}

function MissingOptionsNotice() {
    return (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
            No options have been configured for
            this field.
        </p>
    );
}

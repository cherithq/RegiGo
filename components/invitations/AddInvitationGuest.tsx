"use client";

import {
    Loader2,
    Plus,
    UserPlus,
} from "lucide-react";
import {
    FormEvent,
    useState,
} from "react";

type FormState = {
    fullName: string;
    email: string;
    phone: string;
    department: string;
    quantity: string;
};

const emptyForm: FormState = {
    fullName: "",
    email: "",
    phone: "",
    department: "",
    quantity: "1",
};

async function readJson(
    response: Response,
) {
    const text =
        await response.text();

    if (!text.trim()) {
        return {};
    }

    try {
        return JSON.parse(
            text,
        );
    } catch {
        return {
            error:
                "The server returned an invalid response.",
        };
    }
}

export default function AddInvitationGuest({
    eventId,
}: {
    eventId: string;
}) {
    const [
        form,
        setForm,
    ] =
        useState<FormState>(
            emptyForm,
        );
    const [
        working,
        setWorking,
    ] = useState(false);
    const [
        message,
        setMessage,
    ] = useState("");

    async function submit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setWorking(true);
        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/events/${encodeURIComponent(
                        eventId,
                    )}/invitations/guests`,
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                fullName:
                                    form.fullName,
                                email:
                                    form.email,
                                phone:
                                    form.phone,
                                department:
                                    form.department,
                                quantity:
                                    Number(
                                        form.quantity,
                                    ) ||
                                    1,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to add the guest.",
                );
            }

            setForm(
                emptyForm,
            );
            setMessage(
                "Guest added and selected below. Review the details, then press Send Invitations.",
            );

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:invitations-imported",
                    {
                        detail: {
                            registrationIds: [
                                String(
                                    result.registrationId,
                                ),
                            ],
                        },
                    },
                ),
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to add the guest.",
            );
        } finally {
            setWorking(
                false,
            );
        }
    }

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                    <UserPlus
                        size={
                            22
                        }
                    />
                </div>

                <div>
                    <h2 className="text-xl font-black">
                        Add Guest Manually
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Add one guest normally, then use the existing invitation manager below to send the personalised RSVP link.
                    </p>
                </div>
            </div>

            <form
                onSubmit={
                    submit
                }
                className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
            >
                <Field
                    label="Full Name"
                    required
                    value={
                        form.fullName
                    }
                    placeholder="Guest name"
                    onChange={(
                        value,
                    ) =>
                        setForm({
                            ...form,
                            fullName:
                                value,
                        })
                    }
                />

                <Field
                    label="Email"
                    required
                    type="email"
                    value={
                        form.email
                    }
                    placeholder="guest@example.com"
                    onChange={(
                        value,
                    ) =>
                        setForm({
                            ...form,
                            email:
                                value,
                        })
                    }
                />

                <Field
                    label="Phone"
                    value={
                        form.phone
                    }
                    placeholder="+65 9123 4567"
                    onChange={(
                        value,
                    ) =>
                        setForm({
                            ...form,
                            phone:
                                value,
                        })
                    }
                />

                <Field
                    label="Department"
                    value={
                        form.department
                    }
                    placeholder="Department"
                    onChange={(
                        value,
                    ) =>
                        setForm({
                            ...form,
                            department:
                                value,
                        })
                    }
                />

                <Field
                    label="Party Size"
                    helper="Total seats under this invitation, including the main guest. Leave as 1 for an individual invitation."
                    type="number"
                    min="1"
                    max="100"
                    value={
                        form.quantity
                    }
                    onChange={(
                        value,
                    ) =>
                        setForm({
                            ...form,
                            quantity:
                                value,
                        })
                    }
                />

                <button
                    type="submit"
                    disabled={
                        working
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-60 md:col-span-2 xl:col-span-5"
                >
                    {working ? (
                        <Loader2
                            size={
                                18
                            }
                            className="animate-spin"
                        />
                    ) : (
                        <Plus
                            size={
                                18
                            }
                        />
                    )}

                    Add Guest to Invitation List
                </button>
            </form>

            {message && (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
                    {
                        message
                    }
                </div>
            )}
        </section>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    required = false,
    min,
    max,
    helper,
}: {
    label: string;
    value: string;
    onChange:
        (
            value: string,
        ) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    min?: string;
    max?: string;
    helper?: string;
}) {
    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {
                    label
                }
            </span>

            <input
                type={
                    type
                }
                value={
                    value
                }
                required={
                    required
                }
                min={
                    min
                }
                max={
                    max
                }
                placeholder={
                    placeholder
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
            />

            {helper && (
                <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                    {helper}
                </span>
            )}
        </label>
    );
}

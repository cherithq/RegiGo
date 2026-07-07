"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const starterTemplates = [
    {
        template_name: "Registration Confirmation",
        email_type: "confirmation",
        subject: "Registration confirmed for {{event_name}}",
        body: `Dear {{name}},

Thank you for registering for {{event_name}}.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Your QR Code:
{{qr_code}}

Please show your QR code during check-in.

Regards,
RegiGo`,
    },
    {
        template_name: "Event Reminder",
        email_type: "reminder",
        subject: "Reminder: {{event_name}} is coming soon",
        body: `Dear {{name}},

This is a reminder that {{event_name}} is coming soon.

Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Your table: {{table}}

Please bring your QR code.

Regards,
RegiGo`,
    },
    {
        template_name: "Event Update",
        email_type: "update",
        subject: "Important update for {{event_name}}",
        body: `Dear {{name}},

There is an update regarding {{event_name}}.

Please take note of the latest event details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue}}

Regards,
RegiGo`,
    },
    {
        template_name: "Thank You Email",
        email_type: "thank_you",
        subject: "Thank you for attending {{event_name}}",
        body: `Dear {{name}},

Thank you for attending {{event_name}}.

We hope you enjoyed the event.

Regards,
RegiGo`,
    },
];

export default function EmailCentre({
    event,
    templates,
}: {
    event: any;
    templates: any[];
}) {
    const [items, setItems] = useState<any[]>(templates || []);
    const [selected, setSelected] = useState<any>(
        templates?.[0] || starterTemplates[0]
    );
    const [message, setMessage] = useState("");

    function updateItems(template: any) {
        setItems((current) => {
            const existsById = current.some((item) => item.id === template.id);

            if (existsById) {
                return current.map((item) =>
                    item.id === template.id ? template : item
                );
            }

            const existsByType = current.some(
                (item) => item.email_type === template.email_type
            );

            if (existsByType) {
                return current.map((item) =>
                    item.email_type === template.email_type ? template : item
                );
            }

            return [template, ...current];
        });
    }

    async function addStarterTemplate(template: any) {
        setMessage("");

        const { data, error } = await supabase
            .from("email_templates")
            .upsert(
                {
                    event_id: event.id,
                    template_name: template.template_name,
                    email_type: template.email_type,
                    subject: template.subject,
                    body: template.body,
                },
                {
                    onConflict: "event_id,email_type",
                }
            )
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        updateItems(data);
        setSelected(data);
        setMessage("Template saved.");
    }

    async function saveTemplate() {
        setMessage("");

        if (!selected.template_name) {
            setMessage("Template name is required.");
            return;
        }

        if (!selected.email_type) {
            setMessage("Email type is required.");
            return;
        }

        if (!selected.subject) {
            setMessage("Subject is required.");
            return;
        }

        if (!selected.body) {
            setMessage("Body is required.");
            return;
        }

        if (selected.id) {
            const { data, error } = await supabase
                .from("email_templates")
                .update({
                    template_name: selected.template_name,
                    email_type: selected.email_type,
                    subject: selected.subject,
                    body: selected.body,
                })
                .eq("id", selected.id)
                .select()
                .single();

            if (error) {
                setMessage(error.message);
                return;
            }

            updateItems(data);
            setSelected(data);
            setMessage("Template updated.");
            return;
        }

        const { data, error } = await supabase
            .from("email_templates")
            .upsert(
                {
                    event_id: event.id,
                    template_name: selected.template_name,
                    email_type: selected.email_type || "custom",
                    subject: selected.subject,
                    body: selected.body,
                },
                {
                    onConflict: "event_id,email_type",
                }
            )
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        updateItems(data);
        setSelected(data);
        setMessage("Template saved.");
    }

    async function deleteTemplate(id: string) {
        const ok = confirm("Delete this email template?");
        if (!ok) return;

        const { error } = await supabase
            .from("email_templates")
            .delete()
            .eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        const updated = items.filter((item) => item.id !== id);
        setItems(updated);
        setSelected(updated[0] || starterTemplates[0]);
        setMessage("Template deleted.");
    }

    const preview = selected.body
        ?.replaceAll("{{name}}", "Guest Name")
        .replaceAll("{{full_name}}", "Full Name")
        .replaceAll("{{email}}", "email@example.com")
        .replaceAll("{{event_name}}", event.event_name || "Event Name")
        .replaceAll("{{event_date}}", event.event_date || "Event Date")
        .replaceAll("{{event_time}}", event.event_time || "Event Time")
        .replaceAll("{{venue}}", event.venue || "Event Venue")
        .replaceAll("{{table}}", "Table 1")
        .replaceAll("{{company}}", "RegiGo")
        .replaceAll("{{qr_link}}", "https://example.com/qr-code.png")
        .replaceAll("{{qr_code}}", "[QR code image will appear here]")
        .replaceAll("{{qr_image}}", "[QR code image will appear here]");

    return (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black">Templates</h2>

                    <button
                        onClick={() =>
                            setSelected({
                                template_name: "New Template",
                                email_type: "custom",
                                subject: "",
                                body: "",
                            })
                        }
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                    >
                        + New
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    {items.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => setSelected(template)}
                            className={`w-full rounded-2xl p-4 text-left transition ${selected?.id === template.id
                                ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white"
                                : "bg-white hover:bg-indigo-50"
                                }`}
                        >
                            <p className="font-black">
                                {template.template_name}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                                {template.email_type}
                            </p>
                        </button>
                    ))}

                    {items.length === 0 && (
                        <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
                            No saved templates yet.
                        </p>
                    )}
                </div>

                <h3 className="mt-8 font-black">Starter Templates</h3>

                <div className="mt-3 space-y-2">
                    {starterTemplates.map((template) => (
                        <button
                            key={template.email_type}
                            onClick={() => addStarterTemplate(template)}
                            className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-bold hover:bg-indigo-50"
                        >
                            + {template.template_name}
                        </button>
                    ))}
                </div>
            </aside>

            <section className="space-y-6">
                <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-black">Edit Template</h2>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <Input
                            label="Template Name"
                            value={selected.template_name || ""}
                            onChange={(value) =>
                                setSelected({
                                    ...selected,
                                    template_name: value,
                                })
                            }
                        />

                        <div>
                            <label className="mb-2 block font-semibold">
                                Email Type
                            </label>
                            <select
                                value={selected.email_type || "custom"}
                                onChange={(e) =>
                                    setSelected({
                                        ...selected,
                                        email_type: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                            >
                                <option value="confirmation">
                                    Confirmation
                                </option>
                                <option value="qr_pass">QR Pass</option>
                                <option value="reminder">Reminder</option>
                                <option value="update">Event Update</option>
                                <option value="thank_you">Thank You</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-5">
                        <Input
                            label="Subject"
                            value={selected.subject || ""}
                            onChange={(value) =>
                                setSelected({
                                    ...selected,
                                    subject: value,
                                })
                            }
                        />
                    </div>

                    <div className="mt-5">
                        <label className="mb-2 block font-semibold">
                            Body
                        </label>
                        <textarea
                            value={selected.body || ""}
                            onChange={(e) =>
                                setSelected({
                                    ...selected,
                                    body: e.target.value,
                                })
                            }
                            rows={12}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />
                    </div>

                    {message && (
                        <div className="mt-5 rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                            {message}
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={saveTemplate}
                            className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white"
                        >
                            Save Template
                        </button>

                        {selected.id && (
                            <button
                                onClick={() => deleteTemplate(selected.id)}
                                className="rounded-2xl bg-red-50 px-6 py-3 font-black text-red-600"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-black">Preview</h2>

                    <div className="mt-5 rounded-2xl bg-[#F7F5FF] p-6">
                        <p className="text-sm font-bold text-slate-500">
                            Subject
                        </p>
                        <p className="mt-1 font-black">
                            {(selected.subject || "")
                                .replaceAll(
                                    "{{event_name}}",
                                    event.event_name || "Event Name"
                                )
                                .replaceAll("{{name}}", "Guest Name")
                                .replaceAll("{{full_name}}", "Full Name")}
                        </p>

                        <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-white p-5 leading-7 text-slate-700">
                            {preview || "Email preview will appear here."}
                        </div>
                    </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-black">
                        Available Variables
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {[
                            "{{name}}",
                            "{{full_name}}",
                            "{{email}}",
                            "{{event_name}}",
                            "{{event_date}}",
                            "{{event_time}}",
                            "{{venue}}",
                            "{{table}}",
                            "{{company}}",
                            "{{qr_code}}",
                            "{{qr_link}}",
                        ].map((item) => (
                            <span
                                key={item}
                                className="rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]"
                            >
                                {item}
                            </span>
                        ))}
                    </div>

                    <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                        Use <b>{"{{qr_code}}"}</b> in the email body where you
                        want the QR image to appear. If the guest has a QR image
                        URL saved, the email will show the QR code image.
                    </p>
                </div>
            </section>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
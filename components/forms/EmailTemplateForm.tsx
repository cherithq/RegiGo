"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const defaultTemplates = [
    {
        email_type: "confirmation",
        title: "Registration Confirmation",
        subject: "Your registration is confirmed",
        body: "Hi {{full_name}}, thank you for registering for {{event_name}}.",
    },
    {
        email_type: "qr_pass",
        title: "QR Pass Email",
        subject: "Your QR pass for {{event_name}}",
        body: "Hi {{full_name}}, here is your QR pass. Please show it during check-in.",
    },
    {
        email_type: "glitter_games_access",
        title: "Glitter Games Access",
        subject: "You’re checked in — your Glitter Games pass for {{event_name}}",
        body: "Hi {{full_name}}, scan your personal Glitter Games QR code or open {{game_url}}. Each challenge lasts 20 seconds, winners earn 10 points, and the overall Top 10 qualify for Stage Game #2.",
    },
    {
        email_type: "reminder",
        title: "Event Reminder",
        subject: "Reminder: {{event_name}} is coming soon",
        body: "Hi {{full_name}}, this is a reminder for {{event_name}} on {{event_date}}.",
    },
];

export default function EmailTemplatesForm({
    eventId,
    templates,
}: {
    eventId: string;
    templates: any[];
}) {
    const [items, setItems] = useState(
        defaultTemplates.map((template) => {
            const existing = templates.find((t) => t.email_type === template.email_type);
            return existing || template;
        })
    );

    const [message, setMessage] = useState("");

    function update(index: number, key: string, value: string) {
        const copy = [...items];
        copy[index] = { ...copy[index], [key]: value };
        setItems(copy);
    }

    async function saveTemplate(item: any) {
        setMessage("");

        const { error } = await supabase.from("email_templates").upsert({
            event_id: eventId,
            email_type: item.email_type,
            subject: item.subject,
            body: item.body,
        });

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Email template saved.");
    }

    return (
        <div className="space-y-8">
            {items.map((item, index) => (
                <div key={item.email_type} className="rounded-3xl bg-[#F7F5FF] p-6">
                    <h2 className="text-2xl font-black">{item.title}</h2>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="mb-2 block font-semibold">Subject</label>
                            <input
                                value={item.subject}
                                onChange={(e) => update(index, "subject", e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-semibold">Body</label>
                            <textarea
                                value={item.body}
                                onChange={(e) => update(index, "body", e.target.value)}
                                rows={6}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                            />
                        </div>

                        <button
                            onClick={() => saveTemplate(item)}
                            className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white"
                        >
                            Save Template
                        </button>
                    </div>
                </div>
            ))}

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow">
                Available placeholders: <b>{"{{full_name}}"}</b>, <b>{"{{event_name}}"}</b>,{" "}
                <b>{"{{event_date}}"}</b>, <b>{"{{qr_link}}"}</b>,{" "}
                <b>{"{{game_url}}"}</b>
            </div>
        </div>
    );
}
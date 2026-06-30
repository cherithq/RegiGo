"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CompanyForm({ company }: { company: any }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        company_name: company?.company_name || "",
        company_slug: company?.company_slug || "regigo-demo",
        contact_email: company?.contact_email || "",
        contact_person: company?.contact_person || "",
        phone: company?.phone || "",
        website: company?.website || "",
        address: company?.address || "",
        country: company?.country || "Singapore",
        timezone: company?.timezone || "Asia/Singapore",
        industry: company?.industry || "",
        email_signature: company?.email_signature || "",
    });

    function update(key: string, value: string) {
        setForm({ ...form, [key]: value });
    }

    async function saveCompany(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.from("companies").upsert({
            id: company?.id,
            ...form,
            updated_at: new Date().toISOString(),
        });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Company details saved successfully.");
    }

    return (
        <form onSubmit={saveCompany} className="space-y-8">
            <section>
                <h2 className="text-2xl font-black">Company Information</h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <Input label="Company Name" value={form.company_name} onChange={(v) => update("company_name", v)} />
                    <Input label="Company Slug" value={form.company_slug} onChange={(v) => update("company_slug", v)} />
                    <Input label="Contact Email" value={form.contact_email} onChange={(v) => update("contact_email", v)} />
                    <Input label="Contact Person" value={form.contact_person} onChange={(v) => update("contact_person", v)} />
                    <Input label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
                    <Input label="Website" value={form.website} onChange={(v) => update("website", v)} />
                    <Input label="Country" value={form.country} onChange={(v) => update("country", v)} />
                    <Input label="Timezone" value={form.timezone} onChange={(v) => update("timezone", v)} />
                    <Input label="Industry" value={form.industry} onChange={(v) => update("industry", v)} />
                </div>

                <div className="mt-5">
                    <label className="mb-2 block font-semibold">Address</label>
                    <textarea
                        value={form.address}
                        onChange={(e) => update("address", e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-black">Email Signature</h2>

                <textarea
                    value={form.email_signature}
                    onChange={(e) => update("email_signature", e.target.value)}
                    rows={5}
                    placeholder="Regards,&#10;RegiGo Team"
                    className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
            </section>

            {message && (
                <div className="rounded-xl bg-indigo-50 p-4 font-semibold text-[#4F46E5]">
                    {message}
                </div>
            )}

            <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg disabled:opacity-60"
            >
                {loading ? "Saving..." : "Save Company"}
            </button>
        </form>
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
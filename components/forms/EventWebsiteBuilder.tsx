"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const starterSections = [
    {
        section_type: "about",
        title: "About the Event",
        content: "Share what this event is about and what guests can expect.",
        sort_order: 1,
        is_visible: true,
    },
    {
        section_type: "agenda",
        title: "Programme",
        content: "6:30 PM - Registration\n7:00 PM - Dinner\n8:00 PM - Activities\n9:30 PM - Lucky Draw",
        sort_order: 2,
        is_visible: true,
    },
    {
        section_type: "venue",
        title: "Venue Information",
        content: "Add parking, nearest MRT, shuttle bus, or entry instructions.",
        sort_order: 3,
        is_visible: true,
    },
    {
        section_type: "faq",
        title: "FAQ",
        content: "Q: Do I need to bring my QR pass?\nA: Yes, please show your QR pass during check-in.",
        sort_order: 4,
        is_visible: true,
    },
    {
        section_type: "contact",
        title: "Contact",
        content: "For assistance, please contact the event organizer.",
        sort_order: 5,
        is_visible: true,
    },
];

export default function EventWebsiteBuilder({
    event,
    initialSections,
}: {
    event: any;
    initialSections: any[];
}) {
    const [sections, setSections] = useState(initialSections);
    const [selected, setSelected] = useState<any>(
        initialSections[0] || starterSections[0]
    );
    const [message, setMessage] = useState("");

    async function addStarterSection(section: any) {
        setMessage("");

        const { data, error } = await supabase
            .from("event_page_sections")
            .insert({
                event_id: event.id,
                ...section,
            })
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setSections([...sections, data]);
        setSelected(data);
    }

    async function saveSection() {
        setMessage("");

        if (selected.id) {
            const { data, error } = await supabase
                .from("event_page_sections")
                .update({
                    section_type: selected.section_type,
                    title: selected.title,
                    content: selected.content,
                    sort_order: Number(selected.sort_order || 1),
                    is_visible: selected.is_visible,
                })
                .eq("id", selected.id)
                .select()
                .single();

            if (error) {
                setMessage(error.message);
                return;
            }

            setSections(sections.map((item) => (item.id === data.id ? data : item)));
            setSelected(data);
            setMessage("Section saved.");
            return;
        }

        const { data, error } = await supabase
            .from("event_page_sections")
            .insert({
                event_id: event.id,
                section_type: selected.section_type || "custom",
                title: selected.title,
                content: selected.content,
                sort_order: Number(selected.sort_order || sections.length + 1),
                is_visible: selected.is_visible ?? true,
            })
            .select()
            .single();

        if (error) {
            setMessage(error.message);
            return;
        }

        setSections([...sections, data]);
        setSelected(data);
        setMessage("Section created.");
    }

    async function deleteSection(id: string) {
        const ok = confirm("Delete this website section?");
        if (!ok) return;

        const { error } = await supabase
            .from("event_page_sections")
            .delete()
            .eq("id", id);

        if (error) {
            setMessage(error.message);
            return;
        }

        const updated = sections.filter((section) => section.id !== id);
        setSections(updated);
        setSelected(updated[0] || starterSections[0]);
    }

    function update(key: string, value: any) {
        setSelected({ ...selected, [key]: value });
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <aside className="rounded-[2rem] bg-[#F7F5FF] p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black">Sections</h2>

                    <button
                        onClick={() =>
                            setSelected({
                                section_type: "custom",
                                title: "New Section",
                                content: "",
                                sort_order: sections.length + 1,
                                is_visible: true,
                            })
                        }
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                    >
                        + New
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setSelected(section)}
                            className={`w-full rounded-2xl p-4 text-left transition ${selected?.id === section.id
                                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white"
                                    : "bg-white hover:bg-indigo-50"
                                }`}
                        >
                            <p className="font-black">{section.title}</p>
                            <p className="mt-1 text-xs opacity-80">
                                {section.section_type} · {section.is_visible ? "Visible" : "Hidden"}
                            </p>
                        </button>
                    ))}

                    {sections.length === 0 && (
                        <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">
                            No sections added yet.
                        </p>
                    )}
                </div>

                <h3 className="mt-8 font-black">Starter Sections</h3>

                <div className="mt-3 space-y-2">
                    {starterSections.map((section) => (
                        <button
                            key={section.section_type}
                            onClick={() => addStarterSection(section)}
                            className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-bold hover:bg-indigo-50"
                        >
                            + {section.title}
                        </button>
                    ))}
                </div>
            </aside>

            <section className="space-y-6">
                <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-black">Edit Section</h2>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <Input
                            label="Section Title"
                            value={selected.title || ""}
                            onChange={(value) => update("title", value)}
                        />

                        <Input
                            label="Section Type"
                            value={selected.section_type || ""}
                            onChange={(value) => update("section_type", value)}
                        />

                        <Input
                            label="Sort Order"
                            type="number"
                            value={String(selected.sort_order || 1)}
                            onChange={(value) => update("sort_order", value)}
                        />

                        <label className="flex items-center gap-3 rounded-xl bg-[#F7F5FF] px-4 py-3 font-semibold">
                            <input
                                type="checkbox"
                                checked={selected.is_visible ?? true}
                                onChange={(e) => update("is_visible", e.target.checked)}
                                className="h-4 w-4 accent-[#4F46E5]"
                            />
                            Show this section on public page
                        </label>
                    </div>

                    <div className="mt-5">
                        <label className="mb-2 block font-semibold">Content</label>
                        <textarea
                            value={selected.content || ""}
                            onChange={(e) => update("content", e.target.value)}
                            rows={10}
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
                            onClick={saveSection}
                            className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white"
                        >
                            Save Section
                        </button>

                        {selected.id && (
                            <button
                                onClick={() => deleteSection(selected.id)}
                                className="rounded-2xl bg-red-50 px-6 py-3 font-black text-red-600"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                    <h2 className="text-2xl font-black">Live Preview</h2>

                    <div className="mt-5 rounded-2xl bg-[#F7F5FF] p-6">
                        <p className="text-sm font-bold text-slate-500">
                            {selected.section_type || "custom"}
                        </p>

                        <h3 className="mt-2 text-3xl font-black">
                            {selected.title || "Section Title"}
                        </h3>

                        <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-5 leading-7 text-slate-700">
                            {selected.content || "Section content preview will appear here."}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block font-semibold">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
        </div>
    );
}
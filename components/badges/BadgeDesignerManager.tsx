"use client";

import {
    Printer,
    Loader2,
    Plus,
    QrCode,
    RefreshCw,
    Save,
    Search,
    Trash2,
    Type,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MergeField = { key: string; label: string; sample: string };
type BadgeElement = {
    id: string;
    type: "text" | "qr" | "rectangle" | "line";
    key?: string;
    staticText?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    align?: "left" | "center" | "right";
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
};
type Template = {
    id: string;
    template_name: string;
    badge_width_mm: number;
    badge_height_mm: number;
    orientation: "landscape" | "portrait";
    background_color: string;
    elements: BadgeElement[];
    is_default: boolean;
};
type Guest = {
    id: string;
    full_name: string;
    email: string;
    department: string | null;
};
type Job = {
    id: string;
    job_name: string;
    status: string;
    badge_count: number;
    error_message: string | null;
};
type Payload = {
    mergeFields: MergeField[];
    templates: Template[];
    guests: Guest[];
    jobs: Job[];
};

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};
    try { return JSON.parse(text); } catch { return { error: text || "Invalid server response." }; }
}

function id() {
    return globalThis.crypto?.randomUUID?.() || `element-${Date.now()}-${Math.random()}`;
}

function newTemplate(): Template {
    return {
        id: "",
        template_name: "New Badge Template",
        badge_width_mm: 90,
        badge_height_mm: 55,
        orientation: "landscape",
        background_color: "#FFFFFF",
        is_default: false,
        elements: [
            { id: id(), type: "text", key: "full_name", x: 7, y: 18, width: 58, height: 10, fontSize: 20, fontWeight: "bold", align: "left", color: "#0F172A" },
            { id: id(), type: "qr", key: "qr_code", x: 67, y: 18, width: 18, height: 18 },
        ],
    };
}

export default function BadgeDesignerManager({ eventId }: { eventId: string }) {
    const [data, setData] = useState<Payload | null>(null);
    const [template, setTemplate] = useState<Template>(newTemplate());
    const [elementId, setElementId] = useState<string | null>(null);
    const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState("");

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/events/${eventId}/badges`, { cache: "no-store" });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to load badges.");
            const payload = result as Payload;
            setData(payload);
            setTemplate((current) => {
                const same = current.id ? payload.templates.find((item) => item.id === current.id) : null;
                return same || payload.templates[0] || newTemplate();
            });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to load badges.");
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => { void reload(); }, [reload]);

    const selectedElement = template.elements.find((item) => item.id === elementId) || null;
    const fieldMap = useMemo(() => new Map((data?.mergeFields || []).map((field) => [field.key, field])), [data]);
    const filteredGuests = useMemo(() => {
        const clean = query.trim().toLowerCase();
        return (data?.guests || []).filter((guest) => !clean || [guest.full_name, guest.email, guest.department].filter(Boolean).join(" ").toLowerCase().includes(clean));
    }, [data, query]);

    function changeTemplate<K extends keyof Template>(key: K, value: Template[K]) {
        setTemplate((current) => ({ ...current, [key]: value }));
    }

    function changeElement(changes: Partial<BadgeElement>) {
        if (!selectedElement) return;
        changeTemplate("elements", template.elements.map((item) => item.id === selectedElement.id ? { ...item, ...changes } : item));
    }

    function addText(key?: string) {
        const item: BadgeElement = {
            id: id(),
            type: "text",
            key,
            staticText: key ? undefined : "Text",
            x: 7,
            y: 8,
            width: 50,
            height: 8,
            fontSize: 12,
            fontWeight: "normal",
            align: "left",
            color: "#0F172A",
        };
        changeTemplate("elements", [...template.elements, item]);
        setElementId(item.id);
    }

    function addQr() {
        const item: BadgeElement = { id: id(), type: "qr", key: "qr_code", x: 65, y: 20, width: 18, height: 18 };
        changeTemplate("elements", [...template.elements, item]);
        setElementId(item.id);
    }

    async function save() {
        setWorking("save");
        setMessage("");
        try {
            const response = await fetch(`/api/events/${eventId}/badges`, {
                method: template.id ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId: template.id,
                    templateName: template.template_name,
                    badgeWidthMm: template.badge_width_mm,
                    badgeHeightMm: template.badge_height_mm,
                    orientation: template.orientation,
                    backgroundColor: template.background_color,
                    elements: template.elements,
                    isDefault: template.is_default,
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to save template.");
            setMessage(result.message);
            await reload();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to save template.");
        } finally {
            setWorking("");
        }
    }

    async function removeTemplate() {
        if (!template.id || !window.confirm(`Delete ${template.template_name}?`)) return;
        setWorking("delete");
        try {
            const response = await fetch(`/api/events/${eventId}/badges`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId: template.id }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Unable to remove template.");
            setMessage(result.message);
            setTemplate(newTemplate());
            await reload();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to remove template.");
        } finally {
            setWorking("");
        }
    }

    async function generate() {
        if (!template.id) return setMessage("Save the template before printing badges.");
        if (selectedGuests.length === 0) return setMessage("Select at least one guest.");

        const printWindow = window.open(
            "about:blank",
            "_blank",
        );

        if (printWindow) {
            printWindow.document.write(
                "<title>Preparing RegiGo badges...</title><p style='font-family:Arial;padding:24px'>Preparing badges for printing...</p>",
            );
        }

        setWorking("job");
        setMessage("");

        try {
            const response = await fetch(`/api/events/${eventId}/badges/jobs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId: template.id, registrationIds: selectedGuests }),
            });
            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(result.error || "Unable to prepare badges.");
            }

            setMessage(result.message);
            setSelectedGuests([]);

            if (printWindow) {
                printWindow.location.href =
                    result.printUrl;
            } else {
                window.location.href =
                    result.printUrl;
            }

            await reload();
        } catch (error) {
            printWindow?.close();
            setMessage(error instanceof Error ? error.message : "Unable to prepare badges.");
        } finally {
            setWorking("");
        }
    }

    if (loading && !data) {
        return <div className="flex min-h-[450px] items-center justify-center rounded-[2rem] bg-white"><Loader2 className="animate-spin text-[#4F46E5]" /></div>;
    }
    if (!data) return <div className="rounded-[2rem] bg-red-50 p-7 text-red-700">{message}</div>;

    const allVisibleSelected = filteredGuests.length > 0 && filteredGuests.every((guest) => selectedGuests.includes(guest.id));

    return (
        <div className="space-y-6">
            {message && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700">{message}</div>}

            <section className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)_340px]">
                <aside className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black">Templates</h2>
                        <div className="mt-4 space-y-2">
                            {data.templates.map((item) => (
                                <button key={item.id} type="button" onClick={() => { setTemplate(item); setElementId(null); }} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-black ${template.id === item.id ? "bg-[#4F46E5] text-white" : "bg-slate-50 text-slate-700"}`}>
                                    {item.template_name}{item.is_default && <span className="ml-2 text-xs opacity-70">Default</span>}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => { setTemplate(newTemplate()); setElementId(null); }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700">
                            <Plus size={16} /> New Template
                        </button>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black">Add Elements</h2>
                        <div className="mt-4 space-y-2">
                            <button type="button" onClick={() => addText()} className="inline-flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black"><Type size={16} /> Static Text</button>
                            <button type="button" onClick={addQr} className="inline-flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black"><QrCode size={16} /> QR Code</button>
                            {data.mergeFields.filter((field) => field.key !== "qr_code").map((field) => (
                                <button key={field.key} type="button" onClick={() => addText(field.key)} className="w-full rounded-xl bg-slate-50 px-4 py-3 text-left text-sm font-black">{field.label}</button>
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <input value={template.template_name} onChange={(event) => changeTemplate("template_name", event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" />
                            <input type="number" value={template.badge_width_mm} onChange={(event) => changeTemplate("badge_width_mm", Number(event.target.value))} className="rounded-2xl border border-slate-200 px-4 py-3" title="Width in millimetres" />
                            <input type="number" value={template.badge_height_mm} onChange={(event) => changeTemplate("badge_height_mm", Number(event.target.value))} className="rounded-2xl border border-slate-200 px-4 py-3" title="Height in millimetres" />
                            <input type="color" value={template.background_color} onChange={(event) => changeTemplate("background_color", event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 p-2" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" onClick={() => void save()} disabled={working === "save"} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-50">
                                {working === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Template
                            </button>
                            {template.id && <button type="button" onClick={() => void removeTemplate()} className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-3 font-black text-red-600"><Trash2 size={16} /> Remove</button>}
                        </div>
                    </div>

                    <div className="overflow-auto rounded-[2rem] border border-slate-200 bg-slate-100 p-8 shadow-inner">
                        <div className="relative mx-auto overflow-hidden shadow-xl" style={{ width: template.badge_width_mm * 5, height: template.badge_height_mm * 5, backgroundColor: template.background_color }}>
                            {template.elements.map((element) => {
                                const selected = element.id === elementId;
                                const sample = element.staticText || (element.key ? fieldMap.get(element.key)?.sample : "") || "";
                                return (
                                    <button key={element.id} type="button" onClick={() => setElementId(element.id)} className={`absolute overflow-hidden border ${selected ? "border-[#EC4899] ring-2 ring-[#EC4899]/30" : "border-transparent"}`} style={{ left: element.x * 5, top: element.y * 5, width: element.width * 5, height: element.height * 5, color: element.color, fontSize: (element.fontSize || 12) * 0.85, fontWeight: element.fontWeight, textAlign: element.align }}>
                                        {element.type === "qr" ? <span className="flex h-full w-full items-center justify-center bg-slate-100"><QrCode className="h-4/5 w-4/5" /></span> : sample}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <aside className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black">Element Properties</h2>
                        {!selectedElement ? <p className="mt-4 text-sm leading-6 text-slate-500">Select an element in the preview.</p> : (
                            <div className="mt-4 space-y-3">
                                {selectedElement.type === "text" && (
                                    <>
                                        <select value={selectedElement.key || ""} onChange={(event) => changeElement({ key: event.target.value || undefined, staticText: event.target.value ? undefined : selectedElement.staticText || "Text" })} className="w-full rounded-xl border border-slate-200 px-3 py-3">
                                            <option value="">Static text</option>
                                            {data.mergeFields.filter((field) => field.key !== "qr_code").map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                                        </select>
                                        {!selectedElement.key && <input value={selectedElement.staticText || ""} onChange={(event) => changeElement({ staticText: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-3" />}
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    {(["x", "y", "width", "height"] as const).map((key) => (
                                        <label key={key} className="text-xs font-black capitalize text-slate-500">
                                            {key}
                                            <input type="number" step="0.5" value={selectedElement[key]} onChange={(event) => changeElement({ [key]: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                                        </label>
                                    ))}
                                </div>

                                {selectedElement.type === "text" && (
                                    <>
                                        <input type="number" value={selectedElement.fontSize || 12} onChange={(event) => changeElement({ fontSize: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 px-3 py-3" />
                                        <select value={selectedElement.fontWeight || "normal"} onChange={(event) => changeElement({ fontWeight: event.target.value === "bold" ? "bold" : "normal" })} className="w-full rounded-xl border border-slate-200 px-3 py-3">
                                            <option value="normal">Normal</option><option value="bold">Bold</option>
                                        </select>
                                        <select value={selectedElement.align || "left"} onChange={(event) => changeElement({ align: event.target.value as "left" | "center" | "right" })} className="w-full rounded-xl border border-slate-200 px-3 py-3">
                                            <option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option>
                                        </select>
                                        <input type="color" value={selectedElement.color || "#0F172A"} onChange={(event) => changeElement({ color: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 p-2" />
                                    </>
                                )}

                                <button type="button" onClick={() => { changeTemplate("elements", template.elements.filter((item) => item.id !== selectedElement.id)); setElementId(null); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-600"><Trash2 size={15} /> Delete Element</button>
                            </div>
                        )}
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black">Generate Badges</h2>
                        <label className="relative mt-4 block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests" className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm" />
                        </label>
                        <label className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-black">
                            <input type="checkbox" checked={allVisibleSelected} onChange={() => {
                                if (allVisibleSelected) {
                                    const visible = new Set(filteredGuests.map((guest) => guest.id));
                                    setSelectedGuests((current) => current.filter((value) => !visible.has(value)));
                                } else {
                                    setSelectedGuests((current) => Array.from(new Set([...current, ...filteredGuests.map((guest) => guest.id)])));
                                }
                            }} className="accent-[#4F46E5]" />
                            Select visible guests
                        </label>
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                            {filteredGuests.map((guest) => (
                                <label key={guest.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3 text-sm">
                                    <input type="checkbox" checked={selectedGuests.includes(guest.id)} onChange={() => setSelectedGuests((current) => current.includes(guest.id) ? current.filter((value) => value !== guest.id) : [...current, guest.id])} className="mt-1 accent-[#4F46E5]" />
                                    <span><strong className="block">{guest.full_name}</strong><span className="text-xs text-slate-400">{guest.email}</span></span>
                                </label>
                            ))}
                        </div>
                        <button type="button" onClick={() => void generate()} disabled={working === "job"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-4 font-black text-white disabled:opacity-50">
                            {working === "job" ? <Loader2 size={17} className="animate-spin" /> : <Printer size={17} />} Print {selectedGuests.length} Badge{selectedGuests.length === 1 ? "" : "s"}
                        </button>
                    </div>
                </aside>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div><h2 className="text-2xl font-black">Print Queue</h2><p className="mt-1 text-sm text-slate-500">Open the website print dialog without downloading a file.</p></div>
                    <button type="button" onClick={() => void reload()} className="rounded-xl bg-slate-100 p-3"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Job</th><th className="px-5 py-4">Badges</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">PDF</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.jobs.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center font-bold text-slate-500">No badge jobs yet.</td></tr> : data.jobs.map((job) => (
                                <tr key={job.id}><td className="px-5 py-4 font-black">{job.job_name}</td><td className="px-5 py-4">{job.badge_count}</td><td className="px-5 py-4 capitalize">{job.status}{job.error_message && <p className="mt-1 text-xs text-red-600">{job.error_message}</p>}</td><td className="px-5 py-4"><a href={`/dashboard/events/${eventId}/badges/jobs/${job.id}/print`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 font-black text-[#4F46E5]"><Printer size={15} /> Print</a></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

"use client";

import {
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Image as ImageIcon,
    Landmark,
    Loader2,
    Mail,
    MapPin,
    Palette,
    Phone,
    Plus,
    Printer,
    QrCode,
    RefreshCw,
    Save,
    Search,
    Sparkles,
    Table2,
    Ticket,
    Trash2,
    Type,
    Upload,
    User,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MergeField = { key: string; label: string; sample: string };
type BadgeElement = {
    id: string;
    type: "text" | "qr" | "rectangle" | "line" | "ticket_color" | "image";
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
    rotation?: number;
    dashed?: boolean;
    lineOrientation?: "horizontal" | "vertical";
    imageUrl?: string;
    fill?: boolean;
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

const FIELD_ICONS: Record<string, typeof Type> = {
    full_name: User,
    email: Mail,
    phone: Phone,
    department: Building2,
    ticket_name: Ticket,
    table_name: Table2,
    event_name: Sparkles,
    event_date: CalendarDays,
    event_time: Clock3,
    venue: MapPin,
    company_name: Landmark,
};

function fieldIcon(key: string) {
    return FIELD_ICONS[key] || Type;
}

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    processing: "bg-indigo-50 text-[#4F46E5]",
    ready: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-600",
};

function StatusPill({ status }: { status: string }) {
    const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
    const Icon = status === "failed" ? XCircle : status === "processing" ? Loader2 : CheckCircle2;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black capitalize ${style}`}>
            <Icon size={12} className={status === "processing" ? "animate-spin" : ""} />
            {status}
        </span>
    );
}

function newTemplate(): Template {
    return {
        id: "",
        template_name: "Guest Pass",
        badge_width_mm: 100,
        badge_height_mm: 45,
        orientation: "landscape",
        background_color: "#FFFFFF",
        is_default: false,
        elements: [
            // Header tint behind the ticket-type pill and event name
            { id: id(), type: "rectangle", x: 0, y: 0, width: 72, height: 14, backgroundColor: "#F7F5FF", borderWidth: 0 },

            // Stub (right-hand section, torn-ticket style)
            { id: id(), type: "rectangle", x: 72, y: 0, width: 28, height: 45, backgroundColor: "#1E1B4B", borderWidth: 0 },
            { id: id(), type: "ticket_color", x: 72, y: 0, width: 28, height: 3 },
            { id: id(), type: "line", x: 71.7, y: 0, width: 0.6, height: 45, lineOrientation: "vertical", dashed: true, color: "#94A3B8", borderWidth: 1.2 },
            { id: id(), type: "text", staticText: "SCAN TO CHECK IN", x: 72, y: 4, width: 28, height: 4, fontSize: 5.5, fontWeight: "bold", align: "center", color: "#94A3B8" },
            { id: id(), type: "qr", key: "qr_code", x: 77, y: 9, width: 18, height: 18 },
            { id: id(), type: "text", staticText: "• ADMIT ONE •", x: 72, y: 28, width: 28, height: 15, fontSize: 8, fontWeight: "bold", align: "center", color: "#FFFFFF", rotation: 90 },

            // Main body
            { id: id(), type: "ticket_color", x: 7, y: 6, width: 22, height: 7 },
            { id: id(), type: "text", key: "ticket_name", x: 7, y: 6, width: 22, height: 7, fontSize: 9, fontWeight: "bold", align: "center", color: "#FFFFFF" },
            { id: id(), type: "text", key: "event_name", x: 31, y: 6, width: 37, height: 7, fontSize: 10, fontWeight: "bold", align: "left", color: "#4F46E5" },
            { id: id(), type: "text", key: "full_name", x: 7, y: 16, width: 62, height: 13, fontSize: 21, fontWeight: "bold", align: "left", color: "#0F172A" },
            { id: id(), type: "text", key: "event_date", x: 7, y: 31, width: 20, height: 6, fontSize: 8, fontWeight: "normal", align: "left", color: "#64748B" },
            { id: id(), type: "text", key: "event_time", x: 27, y: 31, width: 18, height: 6, fontSize: 8, fontWeight: "normal", align: "left", color: "#64748B" },
            { id: id(), type: "text", key: "venue", x: 45, y: 31, width: 24, height: 6, fontSize: 8, fontWeight: "normal", align: "left", color: "#64748B" },

            // Outer frame drawn last so it sits on top of every other layer
            { id: id(), type: "rectangle", x: 0, y: 0, width: 100, height: 45, fill: false, borderColor: "#E2E8F0", borderWidth: 1 },
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

    function startDrag(event: React.MouseEvent, element: BadgeElement) {
        event.preventDefault();
        setElementId(element.id);

        const startX = event.clientX;
        const startY = event.clientY;
        const originalX = element.x;
        const originalY = element.y;

        function onMove(moveEvent: MouseEvent) {
            const deltaXmm = (moveEvent.clientX - startX) / 5;
            const deltaYmm = (moveEvent.clientY - startY) / 5;
            const nextX = Math.max(0, Math.round((originalX + deltaXmm) * 2) / 2);
            const nextY = Math.max(0, Math.round((originalY + deltaYmm) * 2) / 2);

            setTemplate((current) => ({
                ...current,
                elements: current.elements.map((item) =>
                    item.id === element.id ? { ...item, x: nextX, y: nextY } : item
                ),
            }));
        }

        function onUp() {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
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

    function addTicketColor() {
        const item: BadgeElement = { id: id(), type: "ticket_color", x: 7, y: 6, width: 30, height: 6 };
        changeTemplate("elements", [...template.elements, item]);
        setElementId(item.id);
    }

    async function uploadImage(file: File): Promise<string | null> {
        setWorking("upload");
        setMessage("");

        try {
            const formData = new FormData();
            formData.set("file", file);

            const response = await fetch(`/api/events/${eventId}/badges/assets`, {
                method: "POST",
                body: formData,
            });
            const result = await readJson(response);

            if (!response.ok) throw new Error(result.error || "Unable to upload the image.");
            if (!result.url) throw new Error("The upload completed without returning an image URL.");

            return result.url as string;
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to upload the image.");
            return null;
        } finally {
            setWorking("");
        }
    }

    async function addImage(file: File) {
        const url = await uploadImage(file);
        if (!url) return;

        const item: BadgeElement = { id: id(), type: "image", x: 7, y: 6, width: 24, height: 24, imageUrl: url };
        changeTemplate("elements", [...template.elements, item]);
        setElementId(item.id);
    }

    async function replaceSelectedImage(file: File) {
        const url = await uploadImage(file);
        if (!url) return;
        changeElement({ imageUrl: url });
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
        return <div className="flex min-h-[450px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white"><Loader2 className="animate-spin text-[#4F46E5]" /></div>;
    }
    if (!data) return <div className="rounded-[2rem] bg-red-50 p-7 text-red-700">{message}</div>;

    const allVisibleSelected = filteredGuests.length > 0 && filteredGuests.every((guest) => selectedGuests.includes(guest.id));

    return (
        <div className="space-y-6">
            {message && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">{message}</div>}

            <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
                <aside className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F5FF] text-[#4F46E5]"><Sparkles size={15} /></span>
                            Templates
                        </h2>
                        <div className="mt-4 space-y-2">
                            {data.templates.map((item) => {
                                const active = template.id === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => { setTemplate(item); setElementId(null); }}
                                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition ${active ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-md" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="truncate">{item.template_name}</span>
                                            {item.is_default && (
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white/20" : "bg-white text-slate-500"}`}>
                                                    Default
                                                </span>
                                            )}
                                        </span>
                                        <span className={`mt-1 block text-xs font-bold ${active ? "text-white/80" : "text-slate-400"}`}>
                                            {item.badge_width_mm} × {item.badge_height_mm} mm
                                        </span>
                                    </button>
                                );
                            })}
                            {data.templates.length === 0 && (
                                <p className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-500">
                                    No templates yet — design one below and save it.
                                </p>
                            )}
                        </div>
                        <button type="button" onClick={() => { setTemplate(newTemplate()); setElementId(null); }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 transition hover:bg-slate-200">
                            <Plus size={16} /> New Template
                        </button>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F5FF] text-[#4F46E5]"><Plus size={15} /></span>
                            Add Elements
                        </h2>
                        <div className="mt-4 space-y-2">
                            <button type="button" onClick={() => addText()} className="inline-flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                                <Type size={16} className="text-slate-400" /> Static Text
                            </button>
                            <button type="button" onClick={addQr} className="inline-flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                                <QrCode size={16} className="text-slate-400" /> QR Code
                            </button>
                            <button type="button" onClick={addTicketColor} className="inline-flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                                <Palette size={16} className="text-slate-400" /> Ticket Colour Swatch
                            </button>
                            <label className="inline-flex w-full cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                                {working === "upload" ? (
                                    <Loader2 size={16} className="animate-spin text-slate-400" />
                                ) : (
                                    <ImageIcon size={16} className="text-slate-400" />
                                )}
                                Image (logo, photo…)
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    hidden
                                    disabled={working === "upload"}
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        event.target.value = "";
                                        if (file) void addImage(file);
                                    }}
                                />
                            </label>

                            <p className="pt-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Guest Fields</p>

                            {data.mergeFields.filter((field) => field.key !== "qr_code").map((field) => {
                                const Icon = fieldIcon(field.key);
                                return (
                                    <button key={field.key} type="button" onClick={() => addText(field.key)} className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-100">
                                        <Icon size={16} className="shrink-0 text-slate-400" /> {field.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <div className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <label className="text-xs font-black text-slate-400">
                                Template Name
                                <input value={template.template_name} onChange={(event) => changeTemplate("template_name", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none focus:border-[#4F46E5]" />
                            </label>
                            <label className="text-xs font-black text-slate-400">
                                Width (mm)
                                <input type="number" value={template.badge_width_mm} onChange={(event) => changeTemplate("badge_width_mm", Number(event.target.value))} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]" />
                            </label>
                            <label className="text-xs font-black text-slate-400">
                                Height (mm)
                                <input type="number" value={template.badge_height_mm} onChange={(event) => changeTemplate("badge_height_mm", Number(event.target.value))} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]" />
                            </label>
                            <label className="text-xs font-black text-slate-400">
                                Background
                                <input type="color" value={template.background_color} onChange={(event) => changeTemplate("background_color", event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 p-2" />
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" onClick={() => void save()} disabled={working === "save"} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-50">
                                {working === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Template
                            </button>
                            {template.id && <button type="button" onClick={() => void removeTemplate()} className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-3 font-black text-red-600 transition hover:bg-red-100"><Trash2 size={16} /> Remove</button>}
                        </div>
                    </div>

                    <div className="overflow-auto rounded-[2rem] border border-slate-200 bg-slate-100 p-8 shadow-inner">
                        <div
                            className="relative mx-auto overflow-hidden rounded-lg shadow-xl ring-1 ring-black/5"
                            style={{
                                width: template.badge_width_mm * 5,
                                height: template.badge_height_mm * 5,
                                backgroundColor: template.background_color,
                                backgroundImage:
                                    "linear-gradient(rgba(15,23,42,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.035) 1px, transparent 1px)",
                                backgroundSize: "25px 25px",
                            }}
                        >
                            {template.elements.map((element) => {
                                const selected = element.id === elementId;
                                const sample = element.staticText || (element.key ? fieldMap.get(element.key)?.sample : "") || "";
                                return (
                                    <button
                                        key={element.id}
                                        type="button"
                                        onMouseDown={(event) => startDrag(event, element)}
                                        className={`group absolute cursor-move overflow-hidden border transition ${selected ? "z-10 border-[#EC4899] ring-2 ring-[#EC4899]/30" : "border-dashed border-slate-300 hover:border-[#4F46E5]/50"}`}
                                        style={{
                                            left: element.x * 5,
                                            top: element.y * 5,
                                            width: element.width * 5,
                                            height: element.height * 5,
                                            color: element.color,
                                            fontSize: (element.fontSize || 12) * 0.85,
                                            fontWeight: element.fontWeight,
                                            textAlign: element.align,
                                            backgroundColor:
                                                element.type === "rectangle"
                                                    ? element.fill === false
                                                        ? "transparent"
                                                        : element.backgroundColor
                                                    : undefined,
                                            borderStyle:
                                                element.type === "rectangle" && element.dashed
                                                    ? "dashed"
                                                    : undefined,
                                        }}
                                    >
                                        {element.type === "qr" && (
                                            <span className="flex h-full w-full items-center justify-center bg-slate-100"><QrCode className="h-4/5 w-4/5 text-slate-400" /></span>
                                        )}
                                        {element.type === "ticket_color" && (
                                            <span
                                                className="flex h-full w-full items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wide text-white"
                                                style={{ background: "linear-gradient(90deg,#4F46E5,#EC4899,#F59E0B)" }}
                                            >
                                                <Palette size={11} /> Ticket Colour
                                            </span>
                                        )}
                                        {element.type === "image" && (
                                            element.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={element.imageUrl}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                    style={{ transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined }}
                                                />
                                            ) : (
                                                <span className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                                                    <ImageIcon className="h-2/5 w-2/5" />
                                                </span>
                                            )
                                        )}
                                        {element.type === "line" && (
                                            element.lineOrientation === "vertical" ? (
                                                <span className="flex h-full w-full justify-center">
                                                    <span className={`h-full w-0 ${element.dashed ? "border-l-2 border-dashed" : "border-l-2"}`} style={{ borderColor: element.color || "#0F172A" }} />
                                                </span>
                                            ) : (
                                                <span className="flex h-full w-full items-center">
                                                    <span className={`w-full h-0 ${element.dashed ? "border-t-2 border-dashed" : "border-t-2"}`} style={{ borderColor: element.color || "#0F172A" }} />
                                                </span>
                                            )
                                        )}
                                        {element.type === "text" && (
                                            <span
                                                className="flex h-full w-full items-center"
                                                style={{
                                                    justifyContent: element.rotation
                                                        ? "center"
                                                        : element.align === "center"
                                                          ? "center"
                                                          : element.align === "right"
                                                            ? "flex-end"
                                                            : "flex-start",
                                                    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {sample}
                                            </span>
                                        )}
                                        {selected && (
                                            <span className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded-md bg-[#EC4899] px-2 py-0.5 text-[10px] font-black text-white">
                                                {element.type === "qr" ? "QR Code" : element.type === "ticket_color" ? "Ticket Colour" : element.type === "image" ? "Image" : element.type === "line" ? "Line" : element.type === "rectangle" ? "Rectangle" : element.key ? fieldMap.get(element.key)?.label || element.key : "Static Text"}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
                            Drag an element to reposition it, or click it to edit precise values on the right. This preview uses sample data — actual badges pull each guest&rsquo;s real details and ticket colour.
                        </p>
                    </div>
                </div>

                <aside className="space-y-5">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black">Element Properties</h2>
                        {!selectedElement ? <p className="mt-4 text-sm leading-6 text-slate-500">Select an element in the preview.</p> : (
                            <div className="mt-4 space-y-4">
                                {selectedElement.type === "text" && (
                                    <div className="space-y-2">
                                        <select value={selectedElement.key || ""} onChange={(event) => changeElement({ key: event.target.value || undefined, staticText: event.target.value ? undefined : selectedElement.staticText || "Text" })} className="w-full rounded-xl border border-slate-200 px-3 py-3 font-bold outline-none focus:border-[#4F46E5]">
                                            <option value="">Static text</option>
                                            {data.mergeFields.filter((field) => field.key !== "qr_code").map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                                        </select>
                                        {!selectedElement.key && <input value={selectedElement.staticText || ""} onChange={(event) => changeElement({ staticText: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#4F46E5]" />}
                                    </div>
                                )}

                                {selectedElement.type === "ticket_color" && (
                                    <p className="rounded-xl bg-indigo-50 p-3 text-xs font-bold leading-5 text-[#4F46E5]">
                                        This swatch automatically fills with each guest&rsquo;s ticket type colour when badges are printed — no colour to set here.
                                    </p>
                                )}

                                {selectedElement.type === "image" && (
                                    <div className="space-y-2">
                                        {selectedElement.imageUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={selectedElement.imageUrl}
                                                alt=""
                                                className="h-24 w-full rounded-xl border border-slate-200 object-cover"
                                            />
                                        )}
                                        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                                            {working === "upload" ? (
                                                <Loader2 size={15} className="animate-spin" />
                                            ) : (
                                                <Upload size={15} />
                                            )}
                                            {selectedElement.imageUrl ? "Replace Image" : "Upload Image"}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg"
                                                hidden
                                                disabled={working === "upload"}
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    event.target.value = "";
                                                    if (file) void replaceSelectedImage(file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Position &amp; Size (mm)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(["x", "y", "width", "height"] as const).map((key) => (
                                            <label key={key} className="text-xs font-black capitalize text-slate-500">
                                                {key}
                                                <input type="number" step="0.5" value={selectedElement[key]} onChange={(event) => changeElement({ [key]: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#4F46E5]" />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {(selectedElement.type === "text" || selectedElement.type === "rectangle" || selectedElement.type === "ticket_color" || selectedElement.type === "image") && (
                                    <label className="block text-xs font-black text-slate-500">
                                        Rotation (degrees) — try 90 for a sideways ticket-stub label
                                        <input type="number" step="15" value={selectedElement.rotation || 0} onChange={(event) => changeElement({ rotation: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#4F46E5]" />
                                    </label>
                                )}

                                {selectedElement.type === "rectangle" && (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
                                            <input type="checkbox" checked={selectedElement.fill !== false} onChange={(event) => changeElement({ fill: event.target.checked })} className="accent-[#4F46E5]" />
                                            Filled
                                        </label>
                                        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
                                            <input type="checkbox" checked={Boolean(selectedElement.dashed)} onChange={(event) => changeElement({ dashed: event.target.checked })} className="accent-[#4F46E5]" />
                                            Dashed border
                                        </label>
                                    </div>
                                )}

                                {selectedElement.type === "line" && (
                                    <div className="space-y-2">
                                        <select value={selectedElement.lineOrientation || "horizontal"} onChange={(event) => changeElement({ lineOrientation: event.target.value === "vertical" ? "vertical" : "horizontal" })} className="w-full rounded-xl border border-slate-200 px-3 py-3 font-bold outline-none focus:border-[#4F46E5]">
                                            <option value="horizontal">Horizontal</option>
                                            <option value="vertical">Vertical</option>
                                        </select>
                                        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
                                            <input type="checkbox" checked={Boolean(selectedElement.dashed)} onChange={(event) => changeElement({ dashed: event.target.checked })} className="accent-[#4F46E5]" />
                                            Dashed (perforation style)
                                        </label>
                                        <input type="color" value={selectedElement.color || "#0F172A"} onChange={(event) => changeElement({ color: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 p-2" />
                                    </div>
                                )}

                                {selectedElement.type === "text" && (
                                    <div>
                                        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Style</p>
                                        <div className="space-y-2">
                                            <input type="number" value={selectedElement.fontSize || 12} onChange={(event) => changeElement({ fontSize: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#4F46E5]" />
                                            <select value={selectedElement.fontWeight || "normal"} onChange={(event) => changeElement({ fontWeight: event.target.value === "bold" ? "bold" : "normal" })} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#4F46E5]">
                                                <option value="normal">Normal</option><option value="bold">Bold</option>
                                            </select>
                                            <select value={selectedElement.align || "left"} onChange={(event) => changeElement({ align: event.target.value as "left" | "center" | "right" })} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#4F46E5]">
                                                <option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option>
                                            </select>
                                            <input type="color" value={selectedElement.color || "#0F172A"} onChange={(event) => changeElement({ color: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 p-2" />
                                        </div>
                                    </div>
                                )}

                                <button type="button" onClick={() => { changeTemplate("elements", template.elements.filter((item) => item.id !== selectedElement.id)); setElementId(null); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"><Trash2 size={15} /> Delete Element</button>
                            </div>
                        )}
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black">Generate Badges</h2>
                        <label className="relative mt-4 block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests" className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-[#4F46E5]" />
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
                            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500">{selectedGuests.length}</span>
                        </label>
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                            {filteredGuests.map((guest) => (
                                <label key={guest.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3 text-sm transition hover:border-slate-200 hover:bg-slate-50">
                                    <input type="checkbox" checked={selectedGuests.includes(guest.id)} onChange={() => setSelectedGuests((current) => current.includes(guest.id) ? current.filter((value) => value !== guest.id) : [...current, guest.id])} className="mt-1 accent-[#4F46E5]" />
                                    <span><strong className="block">{guest.full_name}</strong><span className="text-xs text-slate-400">{guest.email}</span></span>
                                </label>
                            ))}
                        </div>
                        <button type="button" onClick={() => void generate()} disabled={working === "job"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-50">
                            {working === "job" ? <Loader2 size={17} className="animate-spin" /> : <Printer size={17} />} Print {selectedGuests.length} Badge{selectedGuests.length === 1 ? "" : "s"}
                        </button>
                    </div>
                </aside>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div><h2 className="text-2xl font-black">Print Queue</h2><p className="mt-1 text-sm text-slate-500">Open the website print dialog without downloading a file.</p></div>
                    <button type="button" onClick={() => void reload()} className="rounded-xl bg-slate-100 p-3 transition hover:bg-slate-200"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Job</th><th className="px-5 py-4">Badges</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">PDF</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.jobs.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center font-bold text-slate-500">No badge jobs yet.</td></tr> : data.jobs.map((job) => (
                                <tr key={job.id} className="transition hover:bg-slate-50">
                                    <td className="px-5 py-4 font-black">{job.job_name}</td>
                                    <td className="px-5 py-4 font-bold text-slate-600">{job.badge_count}</td>
                                    <td className="px-5 py-4">
                                        <StatusPill status={job.status} />
                                        {job.error_message && <p className="mt-1 text-xs text-red-600">{job.error_message}</p>}
                                    </td>
                                    <td className="px-5 py-4"><a href={`/dashboard/events/${eventId}/badges/jobs/${job.id}/print`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 font-black text-[#4F46E5] transition hover:bg-indigo-100"><Printer size={15} /> Print</a></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

import "server-only";

import {
    PDFDocument,
    StandardFonts,
    degrees,
    rgb,
    type PDFPage,
    type PDFFont,
} from "pdf-lib";
import QRCode from "qrcode";
import type {
    SupabaseClient,
} from "@supabase/supabase-js";
import {
    EventAddonError,
    getAddonActor,
} from "@/lib/event-addons";

export type BadgeMergeKey =
    | "full_name"
    | "email"
    | "phone"
    | "department"
    | "ticket_name"
    | "ticket_colour"
    | "table_name"
    | "event_name"
    | "event_date"
    | "event_time"
    | "venue"
    | "company_name"
    | "qr_code";

export type BadgeElement = {
    id: string;
    type: "text" | "qr" | "rectangle" | "line" | "ticket_color" | "image";
    key?: BadgeMergeKey;
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

export const BADGE_MERGE_FIELDS = [
    ["full_name", "Guest Name", "Alex Tan"],
    ["email", "Email", "alex@example.com"],
    ["phone", "Phone", "+65 9123 4567"],
    ["department", "Department", "Engineering"],
    ["ticket_name", "Ticket Type", "VIP"],
    ["table_name", "Table", "Table 8"],
    ["event_name", "Event Name", "Annual Dinner"],
    ["event_date", "Event Date", "23 Jul 2026"],
    ["event_time", "Event Time", "7:00 PM"],
    ["venue", "Venue", "Grand Ballroom"],
    ["company_name", "Company", "RegiGo Events"],
    ["qr_code", "QR Code", ""],
].map(([key, label, sample]) => ({ key, label, sample }));

export class BadgeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.name = "BadgeError";
        this.status = status;
    }
}

export async function requireBadgeManager(eventId: string) {
    try {
        const actor = await getAddonActor(eventId);

        if (!actor.canManage) {
            throw new BadgeError(
                "You do not have permission to manage badges.",
                403,
            );
        }

        // Route access is permission-based. Company, role, event and add-on
        // switches control whether the links are shown in the UI. This avoids
        // broken redirect loops when an older event is missing an add-on row.
        return {
            actor,
            event: actor.event,
            addons: [],
        };
    } catch (error) {
        if (error instanceof BadgeError) {
            throw error;
        }

        if (error instanceof EventAddonError) {
            throw new BadgeError(
                error.message,
                error.status,
            );
        }

        throw error;
    }
}

function n(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
function hex(value: unknown, fallback: string) {
    const text = typeof value === "string" ? value.trim() : "";
    return /^#[0-9A-Fa-f]{6}$/.test(text) ? text.toUpperCase() : fallback;
}

export function cleanBadgeElements(value: unknown): BadgeElement[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === "object").map((item, index): BadgeElement => {
        const raw = item as Record<string, unknown>;
        const type = ["text", "qr", "rectangle", "line", "ticket_color", "image"].includes(String(raw.type))
            ? String(raw.type) as BadgeElement["type"]
            : "text";
        const key = BADGE_MERGE_FIELDS.some((field) => field.key === raw.key)
            ? raw.key as BadgeMergeKey
            : undefined;
        return {
            id: typeof raw.id === "string" ? raw.id : `element-${index}`,
            type,
            key,
            staticText: typeof raw.staticText === "string" ? raw.staticText.slice(0, 500) : undefined,
            x: n(raw.x, 0),
            y: n(raw.y, 0),
            width: Math.max(n(raw.width, 20), 0.1),
            height: Math.max(n(raw.height, 8), 0.1),
            fontSize: clamp(n(raw.fontSize, 12), 4, 72),
            fontWeight: raw.fontWeight === "bold" ? "bold" : "normal",
            align: raw.align === "center" || raw.align === "right" ? raw.align : "left",
            color: hex(raw.color, "#0F172A"),
            backgroundColor: hex(raw.backgroundColor, "#FFFFFF"),
            borderColor: hex(raw.borderColor, "#CBD5E1"),
            borderWidth: clamp(n(raw.borderWidth, 0), 0, 10),
            rotation: clamp(n(raw.rotation, 0), -359, 359),
            dashed: raw.dashed === true,
            lineOrientation: raw.lineOrientation === "vertical" ? "vertical" : "horizontal",
            imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl.slice(0, 2000) : undefined,
            fill: raw.fill !== false,
        };
    }).slice(0, 100);
}

function mmToPt(mm: number) { return (mm * 72) / 25.4; }
function hexToRgb(value: string) {
    const clean = hex(value, "#000000").slice(1);
    return rgb(parseInt(clean.slice(0, 2), 16) / 255, parseInt(clean.slice(2, 4), 16) / 255, parseInt(clean.slice(4, 6), 16) / 255);
}
function safeText(value: unknown) {
    return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "").trim();
}
function fitText(font: PDFFont, text: string, maxWidth: number, preferred: number) {
    let size = preferred;
    while (size > 4 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
    return size;
}
function alignedX(x: number, width: number, textWidth: number, align?: BadgeElement["align"]) {
    if (align === "center") return x + (width - textWidth) / 2;
    if (align === "right") return x + width - textWidth;
    return x;
}

type BadgeData = Record<BadgeMergeKey, string>;

type EmbeddedImage = Awaited<ReturnType<PDFDocument["embedPng"]>>;

async function embedRemoteImage(
    pdf: PDFDocument,
    url: string,
    cache: Map<string, EmbeddedImage | null>,
): Promise<EmbeddedImage | null> {
    if (cache.has(url)) return cache.get(url) || null;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const bytes = new Uint8Array(await response.arrayBuffer());
        // Sniff the format from the file's magic bytes rather than trusting
        // the response's content-type header, since storage CDNs don't
        // always set it accurately.
        const isPng =
            bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

        const image = isPng
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);

        cache.set(url, image);
        return image;
    } catch {
        cache.set(url, null);
        return null;
    }
}

async function drawElement(args: {
    pdf: PDFDocument; page: PDFPage; normalFont: PDFFont; boldFont: PDFFont;
    element: BadgeElement; pageHeight: number; data: BadgeData;
    imageCache: Map<string, EmbeddedImage | null>;
}) {
    const { pdf, page, normalFont, boldFont, element, pageHeight, data, imageCache } = args;
    const x = mmToPt(element.x);
    const width = mmToPt(element.width);
    const height = mmToPt(element.height);
    const y = pageHeight - mmToPt(element.y) - height;

    if (element.type === "rectangle") {
        page.drawRectangle({
            x, y, width, height,
            color: element.fill === false ? undefined : hexToRgb(element.backgroundColor || "#FFFFFF"),
            borderColor: hexToRgb(element.borderColor || "#CBD5E1"),
            borderWidth: element.borderWidth || 0,
            borderDashArray: element.dashed ? [4, 3] : undefined,
        });
        return;
    }
    if (element.type === "line") {
        const dashArray = element.dashed ? [3, 3] : undefined;
        const thickness = Math.max(element.borderWidth || 1, 0.5);
        if (element.lineOrientation === "vertical") {
            page.drawLine({ start: { x: x + width / 2, y }, end: { x: x + width / 2, y: y + height }, color: hexToRgb(element.color || "#0F172A"), thickness, dashArray });
        } else {
            page.drawLine({ start: { x, y: y + height / 2 }, end: { x: x + width, y: y + height / 2 }, color: hexToRgb(element.color || "#0F172A"), thickness, dashArray });
        }
        return;
    }
    if (element.type === "qr") {
        if (!data.qr_code) return;
        const dataUrl = await QRCode.toDataURL(data.qr_code, { margin: 0, width: 512, errorCorrectionLevel: "M" });
        const image = await pdf.embedPng(Buffer.from(dataUrl.split(",")[1], "base64"));
        page.drawImage(image, { x, y, width, height });
        return;
    }
    if (element.type === "ticket_color") {
        page.drawRectangle({ x, y, width, height, color: hexToRgb(data.ticket_colour || "#94A3B8") });
        return;
    }
    if (element.type === "image") {
        if (!element.imageUrl) return;
        const image = await embedRemoteImage(pdf, element.imageUrl, imageCache);
        if (!image) return;
        page.drawImage(image, { x, y, width, height, rotate: degrees(element.rotation || 0) });
        return;
    }

    const font = element.fontWeight === "bold" ? boldFont : normalFont;
    const text = safeText(element.staticText || (element.key ? data[element.key] : ""));
    if (!text) return;

    const rotation = element.rotation || 0;
    const color = hexToRgb(element.color || "#0F172A");

    if (rotation === 0) {
        const size = fitText(font, text, width, element.fontSize || 12);
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: alignedX(x, width, textWidth, element.align), y: y + Math.max((height - size) / 2, 0), size, font, color, maxWidth: width });
        return;
    }

    // Sideways/rotated labels (e.g. a vertical "ADMIT ONE" ticket-stub tag)
    // fit against the box's other axis and are centred around the box
    // midpoint rather than following the normal left/right alignment math.
    const rotated = ((rotation % 180) + 180) % 180 !== 0;
    const size = fitText(font, text, rotated ? height : width, element.fontSize || 12);
    const textWidth = font.widthOfTextAtSize(text, size);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const halfAscent = size * 0.35;
    const normalized = ((rotation % 360) + 360) % 360;

    let drawX = centerX;
    let drawY = centerY;
    if (normalized === 90) {
        drawX = centerX - halfAscent;
        drawY = centerY - textWidth / 2;
    } else if (normalized === 270) {
        drawX = centerX + halfAscent;
        drawY = centerY + textWidth / 2;
    } else if (normalized === 180) {
        drawX = centerX + textWidth / 2;
        drawY = centerY + halfAscent;
    }

    page.drawText(text, { x: drawX, y: drawY, size, font, color, rotate: degrees(rotation) });
}

export async function buildBadgePdf(args: {
    template: { badge_width_mm: number; badge_height_mm: number; background_color: string; elements: unknown };
    badges: BadgeData[];
}) {
    const { template, badges } = args;
    const pdf = await PDFDocument.create();
    const normalFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const width = mmToPt(Number(template.badge_width_mm));
    const height = mmToPt(Number(template.badge_height_mm));
    const elements = cleanBadgeElements(template.elements);
    // Shared across every badge in this PDF so a repeated logo/image
    // element is only fetched and embedded once, not once per guest.
    const imageCache = new Map<string, EmbeddedImage | null>();

    for (const data of badges) {
        const page = pdf.addPage([width, height]);
        page.drawRectangle({ x: 0, y: 0, width, height, color: hexToRgb(template.background_color || "#FFFFFF") });
        for (const element of elements) await drawElement({ pdf, page, normalFont, boldFont, element, pageHeight: height, data, imageCache });
    }
    return pdf.save();
}

function siteUrl() {
    const configured =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL;

    if (configured) {
        return configured.replace(
            /\/+$/,
            "",
        );
    }

    const vercelHost =
        process.env
            .VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL;

    if (vercelHost) {
        return `https://${vercelHost}`.replace(
            /\/+$/,
            "",
        );
    }

    return "http://localhost:3000";
}

function missingOptionalRelation(error: unknown) {
    const code =
        error && typeof error === "object"
            ? (error as { code?: unknown }).code
            : undefined;

    return Boolean(
        error &&
        [
            "42P01",
            "42703",
            "PGRST200",
            "PGRST204",
            "PGRST205",
        ].includes(String(code || "")),
    );
}

function firstText(
    row: Record<string, unknown> | null | undefined,
    keys: string[],
) {
    for (const key of keys) {
        const value = row?.[key];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim()
        ) {
            return String(value).trim();
        }
    }

    return "";
}

export async function loadBadgeData(args: {
    admin: SupabaseClient;
    eventId: string;
    registrationIds: string[];
}) {
    const {
        admin,
        eventId,
        registrationIds,
    } = args;

    const [
        eventResult,
        registrationsResult,
    ] = await Promise.all([
        admin
            .from("events")
            .select("*")
            .eq("id", eventId)
            .maybeSingle(),

        admin
            .from("registrations")
            .select("*")
            .eq("event_id", eventId)
            .in("id", registrationIds),
    ]);

    if (eventResult.error) {
        throw new BadgeError(
            eventResult.error.message,
        );
    }

    if (registrationsResult.error) {
        throw new BadgeError(
            registrationsResult.error.message,
        );
    }

    if (!eventResult.data) {
        throw new BadgeError(
            "The event could not be found.",
            404,
        );
    }

    const event =
        eventResult.data as Record<
            string,
            unknown
        >;
    const registrations = (
        registrationsResult.data || []
    ) as Record<string, unknown>[];

    let company: Record<
        string,
        unknown
    > | null = null;

    if (event.company_id) {
        const companyResult =
            await admin
                .from("companies")
                .select("*")
                .eq(
                    "id",
                    event.company_id,
                )
                .maybeSingle();

        if (!companyResult.error) {
            company =
                companyResult.data;
        }
    }

    const ticketIds = Array.from(
        new Set(
            registrations
                .map(
                    (row) =>
                        row.ticket_type_id ||
                        row.ticket_id,
                )
                .filter(Boolean)
                .map(String),
        ),
    );

    const ticketMap =
        new Map<string, string>();
    const ticketColourMap =
        new Map<string, string>();

    if (ticketIds.length > 0) {
        const ticketResult =
            await admin
                .from("ticket_types")
                .select("*")
                .in("id", ticketIds);

        if (
            ticketResult.error &&
            !missingOptionalRelation(
                ticketResult.error,
            )
        ) {
            throw new BadgeError(
                ticketResult.error.message,
            );
        }

        for (const ticket of
            ticketResult.data || []) {
            ticketMap.set(
                String(ticket.id),
                firstText(ticket, [
                    "ticket_name",
                    "name",
                    "title",
                ]),
            );
            ticketColourMap.set(
                String(ticket.id),
                hex(
                    ticket.colour ||
                        ticket.color,
                    "#94A3B8",
                ),
            );
        }
    }

    const qrMap =
        new Map<string, string>();

    const qrResult =
        await admin
            .from("qr_tickets")
            .select("*")
            .in(
                "registration_id",
                registrationIds,
            );

    if (
        qrResult.error &&
        !missingOptionalRelation(
            qrResult.error,
        )
    ) {
        throw new BadgeError(
            qrResult.error.message,
        );
    }

    for (const qr of
        qrResult.data || []) {
        const registrationId =
            String(
                qr.registration_id ||
                    "",
            );

        if (
            !registrationId ||
            qr.is_active === false ||
            qrMap.has(registrationId)
        ) {
            continue;
        }

        qrMap.set(
            registrationId,
            firstText(qr, [
                "qr_token",
                "qr_code_url",
                "token",
                "code",
            ]),
        );
    }

    const tableMap =
        new Map<string, string>();

    // table_assignments.event_id is not reliably populated, so scope by
    // registration_id (already limited to this event's registrations) instead.
    const assignmentResult =
        await admin
            .from("table_assignments")
            .select("*")
            .in(
                "registration_id",
                registrationIds,
            );

    if (
        assignmentResult.error &&
        !missingOptionalRelation(
            assignmentResult.error,
        )
    ) {
        throw new BadgeError(
            assignmentResult.error.message,
        );
    }

    const assignments = (
        assignmentResult.data || []
    ) as Record<string, unknown>[];

    const tableIds = Array.from(
        new Set(
            assignments
                .map(
                    (row) =>
                        row.table_id ||
                        row.event_table_id,
                )
                .filter(Boolean)
                .map(String),
        ),
    );

    const tables =
        new Map<string, string>();

    if (tableIds.length > 0) {
        const tableResult =
            await admin
                .from("event_tables")
                .select("*")
                .in("id", tableIds);

        if (
            tableResult.error &&
            !missingOptionalRelation(
                tableResult.error,
            )
        ) {
            throw new BadgeError(
                tableResult.error.message,
            );
        }

        for (const table of
            tableResult.data || []) {
            tables.set(
                String(table.id),
                firstText(table, [
                    "table_name",
                    "name",
                    "label",
                ]),
            );
        }
    }

    for (const assignment of
        assignments) {
        const registrationId =
            String(
                assignment.registration_id ||
                    "",
            );
        const tableId =
            String(
                assignment.table_id ||
                    assignment.event_table_id ||
                    "",
            );

        if (registrationId) {
            tableMap.set(
                registrationId,
                tables.get(tableId) ||
                    firstText(
                        assignment,
                        [
                            "table_name",
                            "table_label",
                        ],
                    ),
            );
        }
    }

    const registrationMap =
        new Map(
            registrations.map((row) => [
                String(row.id),
                row,
            ]),
        );

    const baseUrl = siteUrl();
    const eventSlug = firstText(
        event,
        [
            "event_slug",
            "slug",
        ],
    );
    const badges: BadgeData[] = [];

    for (const registrationId of
        registrationIds) {
        const registration =
            registrationMap.get(
                registrationId,
            );

        if (!registration) {
            continue;
        }

        const ticketId =
            String(
                registration.ticket_type_id ||
                    registration.ticket_id ||
                    "",
            );

        const fallbackPassUrl =
            eventSlug
                ? `${baseUrl}/event/${encodeURIComponent(
                      eventSlug,
                  )}/pass?registration=${encodeURIComponent(
                      registrationId,
                  )}`
                : `${baseUrl}/dashboard/events/${encodeURIComponent(
                      eventId,
                  )}/guests`;

        badges.push({
            full_name:
                firstText(
                    registration,
                    [
                        "full_name",
                        "name",
                        "guest_name",
                    ],
                ),
            email:
                firstText(
                    registration,
                    ["email"],
                ),
            phone:
                firstText(
                    registration,
                    [
                        "phone",
                        "phone_number",
                        "mobile",
                    ],
                ),
            department:
                firstText(
                    registration,
                    [
                        "department",
                        "organisation",
                        "organization",
                        "company",
                    ],
                ),
            ticket_name:
                ticketMap.get(
                    ticketId,
                ) || "",
            ticket_colour:
                ticketColourMap.get(
                    ticketId,
                ) || "#94A3B8",
            table_name:
                tableMap.get(
                    registrationId,
                ) || "",
            event_name:
                firstText(event, [
                    "event_name",
                    "name",
                    "title",
                ]),
            event_date:
                firstText(event, [
                    "event_date",
                    "date",
                ]),
            event_time:
                firstText(event, [
                    "event_time",
                    "time",
                ]),
            venue:
                firstText(event, [
                    "venue",
                    "location",
                ]),
            company_name:
                firstText(company, [
                    "company_name",
                    "name",
                ]),
            qr_code:
                qrMap.get(
                    registrationId,
                ) ||
                fallbackPassUrl,
        });
    }

    return {
        event,
        badges,
    };
}

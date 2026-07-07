import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

type ParamsMaybePromise =
    | Promise<{ eventId: string }>
    | { eventId: string };

type RouteContext = {
    params: ParamsMaybePromise;
};

type GuestBody = Record<string, any>;

const BASIC_COLUMNS = [
    "event_id",
    "full_name",
    "email",
    "phone",
    "country_code",
    "department",
    "dietary_request",
    "require_transport",
    "registration_status",
    "email_verified",
    "ticket_type_id",
    "custom_answers",
    "updated_at",
] as const;

function cleanText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function firstText(...values: unknown[]): string | null {
    for (const value of values) {
        const cleaned = cleanText(value);
        if (cleaned) return cleaned;
    }
    return null;
}

function cleanStatus(value: unknown): string {
    const allowed = new Set([
        "registered",
        "confirmed",
        "checked_in",
        "attended",
        "cancelled",
        "pending",
    ]);

    const cleaned = cleanText(value)?.toLowerCase();
    if (!cleaned) return "registered";
    return allowed.has(cleaned) ? cleaned : "registered";
}

function asObject(value: unknown): Record<string, any> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, any>;
}

async function getEventId(context: RouteContext) {
    const params = await context.params;
    return params.eventId;
}

async function readBody(request: Request): Promise<GuestBody> {
    try {
        const body = await request.json();
        return asObject(body);
    } catch {
        return {};
    }
}

function getRegistrationId(body: GuestBody): string | null {
    return firstText(
        body.id,
        body.registration_id,
        body.registrationId,
        body.guest_id,
        body.guestId,
        body.original_id,
    );
}

function buildCustomAnswers(
    body: GuestBody,
    existing?: Record<string, any> | null,
) {
    const existingAnswers = asObject(existing?.custom_answers);
    const incomingAnswers = asObject(body.custom_answers ?? body.customAnswers ?? body.answers);

    const fullName = firstText(
        body.full_name,
        body.fullName,
        body.name,
        incomingAnswers.full_name,
        incomingAnswers.fullName,
        incomingAnswers.name,
    );

    const email = firstText(body.email, incomingAnswers.email);
    const phone = firstText(body.phone, incomingAnswers.phone);
    const department = firstText(body.department, incomingAnswers.department);
    const tableNumber = firstText(
        body.table_number,
        body.tableNumber,
        body.table_no,
        body.tableNo,
        body.table,
        incomingAnswers.table_number,
        incomingAnswers.tableNumber,
        incomingAnswers.table_no,
        incomingAnswers.tableNo,
        incomingAnswers.table,
    );

    return {
        ...existingAnswers,
        ...incomingAnswers,
        ...(fullName ? { full_name: fullName, name: fullName } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(department ? { department } : {}),
        ...(tableNumber ? { table: tableNumber, table_number: tableNumber } : {}),
    };
}

function buildPayload(
    eventId: string,
    body: GuestBody,
    availableColumns?: Set<string>,
    existing?: Record<string, any> | null,
) {
    const customAnswers = buildCustomAnswers(body, existing);

    const rawPayload: Record<string, any> = {
        event_id: eventId,
        full_name: firstText(body.full_name, body.fullName, body.name, customAnswers.full_name),
        email: firstText(body.email, customAnswers.email),
        phone: firstText(body.phone, customAnswers.phone),
        country_code: firstText(body.country_code, body.countryCode),
        department: firstText(body.department, customAnswers.department),
        dietary_request: firstText(
            body.dietary_request,
            body.dietaryRequest,
            body.dietary_requirements,
            body.dietaryRequirements,
        ),
        require_transport: firstText(body.require_transport, body.requireTransport),
        registration_status: cleanStatus(
            body.registration_status ?? body.registrationStatus ?? body.status,
        ),
        email_verified: body.email_verified ?? body.emailVerified ?? false,
        ticket_type_id: firstText(body.ticket_type_id, body.ticketTypeId),
        custom_answers: customAnswers,
        updated_at: new Date().toISOString(),
    };

    const payload: Record<string, any> = {};

    for (const column of BASIC_COLUMNS) {
        if (availableColumns && !availableColumns.has(column)) continue;

        const value = rawPayload[column];

        if (value === undefined) continue;
        if (value === null && column !== "email" && column !== "phone") continue;

        payload[column] = value;
    }

    return payload;
}

async function getAvailableColumnsForExistingRow(
    supabaseServer: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    eventId: string,
    registrationId: string,
) {
    let existing: Record<string, any> | null = null;

    const first = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("id", registrationId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (first.data) existing = first.data as Record<string, any>;

    if (!existing) {
        const second = await supabaseServer
            .from("registrations")
            .select("*")
            .eq("id", registrationId)
            .maybeSingle();

        if (second.data) existing = second.data as Record<string, any>;
    }

    if (!existing) return { existing: null, columns: null as Set<string> | null };

    return {
        existing,
        columns: new Set(Object.keys(existing)),
    };
}

async function listGuests(eventId: string) {
    const supabaseServer = await createSupabaseServerClient();

    const { data, error } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ guests: data ?? [] });
}

async function createGuest(eventId: string, body: GuestBody) {
    const supabaseServer = await createSupabaseServerClient();
    const payload = buildPayload(eventId, body);

    if (!payload.full_name && !asObject(payload.custom_answers).full_name) {
        return NextResponse.json(
            {
                error: "Guest name is required.",
                receivedKeys: Object.keys(body),
            },
            { status: 400 },
        );
    }

    const { data, error } = await supabaseServer
        .from("registrations")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
        console.error("Create guest failed:", error, { payload });
        return NextResponse.json(
            {
                error: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                payloadKeys: Object.keys(payload),
            },
            { status: 400 },
        );
    }

    return NextResponse.json({ action: "created", guest: data }, { status: 201 });
}

async function updateGuest(eventId: string, body: GuestBody) {
    const registrationId = getRegistrationId(body);

    if (!registrationId) {
        return NextResponse.json(
            {
                error: "Missing registration id for edit.",
                fix: "Send id, registration_id, registrationId, guest_id, or guestId in the request body.",
                receivedKeys: Object.keys(body),
            },
            { status: 400 },
        );
    }

    const supabaseServer = await createSupabaseServerClient();

    const { existing, columns } = await getAvailableColumnsForExistingRow(
        supabaseServer,
        eventId,
        registrationId,
    );

    if (!existing || !columns) {
        return NextResponse.json(
            {
                error: "Registration not found, so edit cannot be saved.",
                registrationId,
                eventId,
            },
            { status: 404 },
        );
    }

    const payload = buildPayload(eventId, body, columns, existing);

    delete payload.id;
    delete payload.created_at;
    delete payload.event_id;

    if (Object.keys(payload).length === 0) {
        return NextResponse.json(
            {
                error: "No editable columns found on registrations row.",
                registrationId,
                existingColumns: Array.from(columns),
            },
            { status: 400 },
        );
    }

    const { data, error } = await supabaseServer
        .from("registrations")
        .update(payload)
        .eq("id", registrationId)
        .select("*")
        .maybeSingle();

    if (error) {
        console.error("Update guest failed:", error, { registrationId, payload });
        return NextResponse.json(
            {
                error: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                registrationId,
                payloadKeys: Object.keys(payload),
            },
            { status: 400 },
        );
    }

    if (!data) {
        return NextResponse.json(
            {
                error: "Supabase update returned no row.",
                registrationId,
                payloadKeys: Object.keys(payload),
            },
            { status: 404 },
        );
    }

    return NextResponse.json({ action: "updated", guest: data });
}

async function saveGuest(request: Request, context: RouteContext) {
    try {
        const eventId = await getEventId(context);

        await requirePermission("can_manage_guests");

        const body = await readBody(request);
        const registrationId = getRegistrationId(body);
        const mode = cleanText(body.mode)?.toLowerCase();

        if (request.method === "POST" && !registrationId && mode !== "update") {
            return createGuest(eventId, body);
        }

        return updateGuest(eventId, body);
    } catch (error) {
        console.error(`${request.method} guest failed:`, error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Failed to save guest.",
            },
            { status: 500 },
        );
    }
}

export async function GET(_request: Request, context: RouteContext) {
    try {
        const eventId = await getEventId(context);
        await requirePermission("can_manage_guests");
        return listGuests(eventId);
    } catch (error) {
        console.error("GET guests failed:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load guests." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request, context: RouteContext) {
    return saveGuest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
    return saveGuest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
    return saveGuest(request, context);
}

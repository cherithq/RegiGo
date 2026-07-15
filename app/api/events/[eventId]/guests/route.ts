import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type GuestRequestBody = {
    id?: string;
    registrationId?: string;
    registration_id?: string;
    mode?: "create" | "update" | string;
    answers?: Record<string, unknown>;
    custom_answers?: Record<string, unknown>;
    formValues?: Record<string, unknown>;
    full_name?: unknown;
    fullName?: unknown;
    name?: unknown;
    email?: unknown;
    email_address?: unknown;
    phone?: unknown;
    mobile?: unknown;
    mobile_number?: unknown;
    department?: unknown;
    outlet?: unknown;
    department_outlet?: unknown;
    dietary_request?: unknown;
    dietary_requirements?: unknown;
    require_transport?: unknown;
    requireTransport?: unknown;
    transport?: unknown;
    registration_status?: unknown;
};

type QrTicket = {
    id?: string;
    registration_id?: string;
    event_id?: string;
    qr_token?: string;
    qr_code_url?: string | null;
    is_active?: boolean;
    issued_at?: string;
    [key: string]: unknown;
};

function normalizeKey(value: unknown) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function cleanText(value: unknown) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
}

function getAnswers(body: GuestRequestBody) {
    return {
        ...(body.custom_answers && typeof body.custom_answers === "object"
            ? body.custom_answers
            : {}),
        ...(body.formValues && typeof body.formValues === "object" ? body.formValues : {}),
        ...(body.answers && typeof body.answers === "object" ? body.answers : {}),
    } as Record<string, unknown>;
}

function readFromBodyAndAnswers(
    body: GuestRequestBody,
    answers: Record<string, unknown>,
    aliases: string[]
) {
    for (const alias of aliases) {
        const directValue = (body as Record<string, unknown>)[alias];
        const directText = cleanText(directValue);
        if (directText !== null) return directText;
    }

    const normalizedAliases = aliases.map(normalizeKey);

    for (const [key, value] of Object.entries(answers)) {
        const normalizedKey = normalizeKey(key);
        if (normalizedAliases.includes(normalizedKey)) {
            const answerText = cleanText(value);
            if (answerText !== null) return answerText;
        }
    }

    return null;
}

function buildPersistedAnswers(body: GuestRequestBody) {
    const answers = getAnswers(body);

    const fullName = readFromBodyAndAnswers(body, answers, [
        "full_name",
        "fullName",
        "fullname",
        "name",
        "guest_name",
        "Full Name",
    ]);

    const email = readFromBodyAndAnswers(body, answers, [
        "email",
        "email_address",
        "emailAddress",
        "Email Address",
    ]);

    const phone = readFromBodyAndAnswers(body, answers, [
        "phone",
        "mobile",
        "mobile_number",
        "mobileNumber",
        "Mobile Number",
    ]);

    const department = readFromBodyAndAnswers(body, answers, [
        "department",
        "department_outlet",
        "departmentOutlet",
        "Department / Outlet",
        "Department",
    ]);

    const outlet = readFromBodyAndAnswers(body, answers, [
        "outlet",
        "outlet_name",
        "outletName",
        "Outlet",
    ]);

    const dietaryRequest = readFromBodyAndAnswers(body, answers, [
        "dietary_request",
        "dietary_requirements",
        "dietaryRequirements",
        "Dietary Requirements",
    ]);

    const requireTransport = readFromBodyAndAnswers(body, answers, [
        "require_transport",
        "requireTransport",
        "transport",
        "require_transport_from_outlet",
        "Require Transport from Outlet",
    ]);

    const customAnswers: Record<string, unknown> = {
        ...answers,
    };

    // Save normalised aliases too. This is what prevents values from disappearing
    // after a page refresh when the table/modal reads a different key style.
    if (fullName !== null) {
        customAnswers.full_name = fullName;
        customAnswers.fullName = fullName;
        customAnswers["Full Name"] = fullName;
    }
    if (email !== null) {
        customAnswers.email = email;
        customAnswers.email_address = email;
        customAnswers["Email Address"] = email;
    }
    if (phone !== null) {
        customAnswers.phone = phone;
        customAnswers.mobile_number = phone;
        customAnswers["Mobile Number"] = phone;
    }
    if (department !== null) {
        customAnswers.department = department;
        customAnswers["Department"] = department;
    }
    if (outlet !== null) {
        customAnswers.outlet = outlet;
        customAnswers.outlet_name = outlet;
        customAnswers["Outlet"] = outlet;
    }
    if (dietaryRequest !== null) {
        customAnswers.dietary_request = dietaryRequest;
        customAnswers.dietary_requirements = dietaryRequest;
        customAnswers["Dietary Requirements"] = dietaryRequest;
    }
    if (requireTransport !== null) {
        // Read old combined names for compatibility, but save only the
        // canonical standalone field going forward.
        customAnswers.require_transport = requireTransport;
        customAnswers["Transport Required"] = requireTransport;

        delete customAnswers.require_transport_from_outlet;
        delete customAnswers["Require Transport from Outlet"];
    }

    return {
        fullName,
        email,
        phone,
        department,
        outlet,
        dietaryRequest,
        requireTransport,
        customAnswers,
    };
}

async function attachQrTickets(supabaseServer: Awaited<ReturnType<typeof createSupabaseServerClient>>, guests: any[]) {
    const registrationIds = guests.map((guest) => guest.id).filter(Boolean);

    if (registrationIds.length === 0) return guests;

    const { data: qrTickets } = await supabaseServer
        .from("qr_tickets")
        .select("*")
        .in("registration_id", registrationIds);

    const qrTicketMap = new Map<string, QrTicket>();

    for (const ticket of (qrTickets || []) as QrTicket[]) {
        if (!ticket.registration_id) continue;

        const existing = qrTicketMap.get(ticket.registration_id);

        if (!existing) {
            qrTicketMap.set(ticket.registration_id, ticket);
            continue;
        }

        if (ticket.is_active !== false && existing.is_active === false) {
            qrTicketMap.set(ticket.registration_id, ticket);
        }
    }

    return guests.map((guest) => ({
        ...guest,
        __qr_ticket: qrTicketMap.get(guest.id) || null,
    }));
}

async function loadGuests(eventId: string) {
    const supabaseServer = await createSupabaseServerClient();

    const { data, error } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return attachQrTickets(supabaseServer, data || []);
}

async function updateRegistration(eventId: string, registrationId: string, body: GuestRequestBody) {
    const supabaseServer = await createSupabaseServerClient();
    const persisted = buildPersistedAnswers(body);

    if (!persisted.fullName) {
        return NextResponse.json(
            { error: "Full Name is required." },
            { status: 400 }
        );
    }

    const fullPayload: Record<string, unknown> = {
        full_name: persisted.fullName,
        email: persisted.email,
        phone: persisted.phone,
        department: persisted.department,
        dietary_request: persisted.dietaryRequest,
        require_transport: persisted.requireTransport,
        custom_answers: persisted.customAnswers,
        updated_at: new Date().toISOString(),
    };

    const safePayload: Record<string, unknown> = {
        full_name: persisted.fullName,
        email: persisted.email,
        phone: persisted.phone,
        custom_answers: persisted.customAnswers,
        updated_at: new Date().toISOString(),
    };

    let result = await supabaseServer
        .from("registrations")
        .update(fullPayload)
        .eq("id", registrationId)
        .eq("event_id", eventId)
        .select("*")
        .maybeSingle();

    if (result.error) {
        result = await supabaseServer
            .from("registrations")
            .update(safePayload)
            .eq("id", registrationId)
            .eq("event_id", eventId)
            .select("*")
            .maybeSingle();
    }

    if (result.error) {
        // Last fallback for older schemas that do not have updated_at.
        const { updated_at, ...withoutUpdatedAt } = safePayload;
        result = await supabaseServer
            .from("registrations")
            .update(withoutUpdatedAt)
            .eq("id", registrationId)
            .eq("event_id", eventId)
            .select("*")
            .maybeSingle();
    }

    if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    if (!result.data) {
        return NextResponse.json(
            { error: "No registration row was updated. Check that the guest ID belongs to this event." },
            { status: 404 }
        );
    }

    const guests = await loadGuests(eventId);

    return NextResponse.json({ guest: result.data, guests });
}

async function createRegistration(eventId: string, body: GuestRequestBody) {
    const supabaseServer = await createSupabaseServerClient();
    const persisted = buildPersistedAnswers(body);

    if (!persisted.fullName) {
        return NextResponse.json(
            { error: "Full Name is required." },
            { status: 400 }
        );
    }

    const fullPayload: Record<string, unknown> = {
        event_id: eventId,
        full_name: persisted.fullName,
        email: persisted.email,
        phone: persisted.phone,
        department: persisted.department,
        dietary_request: persisted.dietaryRequest,
        require_transport: persisted.requireTransport,
        custom_answers: persisted.customAnswers,
        registration_status: cleanText(body.registration_status) || "registered",
        email_verified: true,
    };

    const safePayload: Record<string, unknown> = {
        event_id: eventId,
        full_name: persisted.fullName,
        email: persisted.email,
        phone: persisted.phone,
        custom_answers: persisted.customAnswers,
        registration_status: cleanText(body.registration_status) || "registered",
        email_verified: true,
    };

    let result = await supabaseServer
        .from("registrations")
        .insert(fullPayload)
        .select("*")
        .single();

    if (result.error) {
        result = await supabaseServer
            .from("registrations")
            .insert(safePayload)
            .select("*")
            .single();
    }

    if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    const guests = await loadGuests(eventId);

    return NextResponse.json({ guest: result.data, guests }, { status: 201 });
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await context.params;
        await requirePermission("can_manage_guests");

        const guests = await loadGuests(eventId);
        return NextResponse.json({ guests });
    } catch (error) {
        console.error("GET guests failed:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to load guests." },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await context.params;
        await requirePermission("can_manage_guests");

        const body = (await request.json()) as GuestRequestBody;
        const registrationId = cleanText(body.registrationId || body.registration_id || body.id);

        if (registrationId || body.mode === "update") {
            if (!registrationId) {
                return NextResponse.json({ error: "Registration ID is required for edit." }, { status: 400 });
            }
            return updateRegistration(eventId, registrationId, body);
        }

        return createRegistration(eventId, body);
    } catch (error) {
        console.error("POST guest failed:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to save guest." },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await context.params;
        await requirePermission("can_manage_guests");

        const body = (await request.json()) as GuestRequestBody;
        const registrationId = cleanText(body.registrationId || body.registration_id || body.id);

        if (!registrationId) {
            return NextResponse.json({ error: "Registration ID is required for edit." }, { status: 400 });
        }

        return updateRegistration(eventId, registrationId, body);
    } catch (error) {
        console.error("PUT guest failed:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update guest." },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ eventId: string }> }
) {
    return PUT(request, context);
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    cleanOrganizerEnabledModules,
    defaultOrganizerEnabledModules,
} from "@/lib/event-modules";

type SettingsPayload = {
    enabled_modules?: Record<string, boolean>;
    registration_is_open?: boolean;
    registration_closed_message?: string;
};

const defaultClosedMessage = "Registration for this event is currently closed.";

function cleanClosedMessage(value: unknown) {
    if (typeof value !== "string") return defaultClosedMessage;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : defaultClosedMessage;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { eventId } = await context.params;
        const body = (await request.json()) as SettingsPayload;

        const supabaseServer = await createSupabaseServerClient();

        const {
            data: { user },
        } = await supabaseServer.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "You must be logged in to update event settings." },
                { status: 401 },
            );
        }

        const { data: profile, error: profileError } = await supabaseServer
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            return NextResponse.json(
                { error: profileError.message },
                { status: 400 },
            );
        }

        const role = profile?.role;
        const isAdmin = role === "admin";
        const isOrganizer = role === "organizer";

        if (!isAdmin && !isOrganizer) {
            return NextResponse.json(
                { error: "You do not have permission to update event settings." },
                { status: 403 },
            );
        }

        const { data: existingSettings, error: existingError } =
            await supabaseServer
                .from("event_settings")
                .select(
                    "id,event_id,enabled_modules,registration_is_open,registration_closed_message",
                )
                .eq("event_id", eventId)
                .maybeSingle();

        if (existingError) {
            return NextResponse.json(
                { error: existingError.message },
                { status: 400 },
            );
        }

        const existingModules = cleanOrganizerEnabledModules(
            existingSettings?.enabled_modules,
        );

        // Admin can update organizer module visibility.
        // Organizer can update only registration open/closed status and message.
        const nextEnabledModules = isAdmin
            ? cleanOrganizerEnabledModules(body.enabled_modules ?? existingModules)
            : existingModules;

        const nextRegistrationIsOpen =
            typeof body.registration_is_open === "boolean"
                ? body.registration_is_open
                : existingSettings?.registration_is_open ?? true;

        const nextClosedMessage =
            body.registration_closed_message !== undefined
                ? cleanClosedMessage(body.registration_closed_message)
                : existingSettings?.registration_closed_message || defaultClosedMessage;

        const payload = {
            event_id: eventId,
            enabled_modules: nextEnabledModules || defaultOrganizerEnabledModules,
            registration_is_open: nextRegistrationIsOpen,
            registration_closed_message: nextClosedMessage,
        };

        if (existingSettings?.id) {
            const { data, error } = await supabaseServer
                .from("event_settings")
                .update(payload)
                .eq("id", existingSettings.id)
                .select("*")
                .single();

            if (error) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 },
                );
            }

            return NextResponse.json({ settings: data });
        }

        const { data, error } = await supabaseServer
            .from("event_settings")
            .insert(payload)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ settings: data }, { status: 201 });
    } catch (error) {
        console.error("Save settings failed:", error);

        return NextResponse.json(
            { error: "Failed to save settings." },
            { status: 500 },
        );
    }
}

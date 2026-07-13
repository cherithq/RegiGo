import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    cleanOrganizerEnabledModules,
    defaultOrganizerEnabledModules,
} from "@/lib/event-modules";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SettingsPayload = {
    enabled_modules?: Record<string, boolean>;
    registration_is_open?: boolean;
    registration_closed_message?: string;
};

const defaultClosedMessage =
    "Registration for this event is currently closed.";

function jsonNoStore(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}

function cleanClosedMessage(value: unknown) {
    if (typeof value !== "string") return defaultClosedMessage;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : defaultClosedMessage;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { eventId } = await context.params;

        let body: SettingsPayload;

        try {
            body = (await request.json()) as SettingsPayload;
        } catch {
            return jsonNoStore({ error: "Invalid JSON request body." }, 400);
        }

        const supabaseServer = await createSupabaseServerClient();

        const {
            data: { user },
        } = await supabaseServer.auth.getUser();

        if (!user) {
            return jsonNoStore(
                { error: "You must be logged in to update event settings." },
                401,
            );
        }

        const { data: profile, error: profileError } = await supabaseServer
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            return jsonNoStore({ error: profileError.message }, 400);
        }

        const role = profile?.role;
        const isAdmin = role === "admin";
        const isOrganizer =
            role === "organizer" || role === "organiser";

        if (!isAdmin && !isOrganizer) {
            return jsonNoStore(
                { error: "You do not have permission to update event settings." },
                403,
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
            return jsonNoStore({ error: existingError.message }, 400);
        }

        const existingModules = cleanOrganizerEnabledModules(
            existingSettings?.enabled_modules,
        );

        // Module visibility remains an admin-controlled setting.
        // The canonical cleaner now includes glitter_games, so the value is kept.
        const nextEnabledModules = isAdmin
            ? cleanOrganizerEnabledModules(
                  body.enabled_modules ?? existingModules,
              )
            : existingModules;

        const nextRegistrationIsOpen =
            typeof body.registration_is_open === "boolean"
                ? body.registration_is_open
                : existingSettings?.registration_is_open ?? true;

        const nextClosedMessage =
            body.registration_closed_message !== undefined
                ? cleanClosedMessage(body.registration_closed_message)
                : existingSettings?.registration_closed_message ||
                  defaultClosedMessage;

        const payload = {
            event_id: eventId,
            enabled_modules:
                nextEnabledModules || defaultOrganizerEnabledModules,
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
                return jsonNoStore({ error: error.message }, 400);
            }

            return jsonNoStore({ settings: data });
        }

        const { data, error } = await supabaseServer
            .from("event_settings")
            .insert(payload)
            .select("*")
            .single();

        if (error) {
            return jsonNoStore({ error: error.message }, 400);
        }

        return jsonNoStore({ settings: data }, 201);
    } catch (error) {
        console.error("Save settings failed:", error);

        return jsonNoStore({ error: "Failed to save settings." }, 500);
    }
}

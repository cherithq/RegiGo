import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getRegistrationOpenState(eventId: string) {
    const supabaseServer = await createSupabaseServerClient();

    const { data: settings } = await supabaseServer
        .from("event_settings")
        .select("registration_is_open, registration_closed_message")
        .eq("event_id", eventId)
        .maybeSingle();

    return {
        isOpen: settings?.registration_is_open !== false,
        closedMessage:
            settings?.registration_closed_message ||
            "Registration for this event is currently closed.",
    };
}
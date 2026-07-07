import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
    canRoleSeeEventModule,
    cleanOrganizerEnabledModules,
    defaultOrganizerEnabledModules,
    type EventModuleKey,
} from "@/lib/event-modules";

export type UserRole = "admin" | "organizer" | "viewer" | "scanner";

export async function getCurrentDashboardRole() {
    const supabaseServer = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabaseServer
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

    const role = profile?.role;

    if (
        role === "admin" ||
        role === "organizer" ||
        role === "viewer" ||
        role === "scanner"
    ) {
        return role as UserRole;
    }

    return null;
}

export async function getEventEnabledModules(eventId: string) {
    const supabaseServer = await createSupabaseServerClient();

    const { data } = await supabaseServer
        .from("event_settings")
        .select("enabled_modules")
        .eq("event_id", eventId)
        .maybeSingle();

    return cleanOrganizerEnabledModules(data?.enabled_modules);
}

export async function getEventModuleAccess(eventId: string) {
    const role = await getCurrentDashboardRole();
    const enabledModules = eventId
        ? await getEventEnabledModules(eventId)
        : defaultOrganizerEnabledModules;

    return {
        role,
        enabledModules,
        canSeeModule(moduleKey?: EventModuleKey | null) {
            return canRoleSeeEventModule({
                role,
                enabledModules,
                moduleKey,
            });
        },
    };
}

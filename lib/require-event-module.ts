import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  canRoleSeeEventModule,
  cleanOrganizerEnabledModules,
  type EventModuleKey,
} from "@/lib/event-modules";

export async function requireEventModule(
  eventId: string,
  moduleKey: EventModuleKey,
) {
  const supabaseServer = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;

  // Admin always has full access.
  if (role === "admin") return;

  const { data: settings } = await supabaseServer
    .from("event_settings")
    .select("enabled_modules")
    .eq("event_id", eventId)
    .maybeSingle();

  const enabledModules = cleanOrganizerEnabledModules(
    settings?.enabled_modules,
  );

  const allowed = canRoleSeeEventModule({
    role,
    enabledModules,
    moduleKey,
  });

  if (!allowed) {
    notFound();
  }
}

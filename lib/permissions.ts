import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getCurrentPermissions() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    return {
        user,
        profile,
        role: profile?.role ?? "Organization Owner",
        permissions: {
            can_manage_events: true,
            can_manage_guests: true,
            can_scan_qr: true,
            can_manage_reports: true,
            can_manage_company: true,
            can_manage_team: true,
            can_manage_settings: true,
        },
    };
}

export async function requirePermission(_permissionKey: string) {
    // Only verify the user is logged in.
    return await getCurrentPermissions();
}
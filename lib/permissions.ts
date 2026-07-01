import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export async function getCurrentPermissions() {
    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile } = await supabaseServer
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    const role = profile?.role || "Viewer";

    const { data: permissions } = await supabaseServer
        .from("role_permissions")
        .select("*")
        .eq("role", role)
        .maybeSingle();

    return {
        user,
        profile,
        role,
        permissions,
    };
}

export async function requirePermission(permissionKey: string) {
    const data = await getCurrentPermissions();

    if (!data.permissions?.[permissionKey]) {
        redirect("/dashboard/unauthorized");
    }

    return data;
}
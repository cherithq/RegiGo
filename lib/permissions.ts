import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type UserRole =
    | "admin"
    | "organizer"
    | "organiser"
    | "viewer"
    | "scanner";

export type PermissionKey =
    | "can_create_events"
    | "can_manage_events"
    | "can_manage_guests"
    | "can_scan_qr"
    | "can_manage_reports"
    | "can_manage_settings"
    | "can_manage_event_setup"
    | "can_manage_event_settings"
    | "can_manage_users"
    | "can_manage_roles";

export type Profile = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
};

type PermissionMap = Record<PermissionKey, boolean>;

const ADMIN_PERMISSIONS: PermissionMap = {
    can_create_events: true,
    can_manage_events: true,
    can_manage_guests: true,
    can_scan_qr: true,
    can_manage_reports: true,
    can_manage_settings: true,
    can_manage_event_setup: true,
    can_manage_event_settings: true,
    can_manage_users: true,
    can_manage_roles: true,
};

const ORGANIZER_PERMISSIONS: PermissionMap = {
    can_create_events: false,
    can_manage_events: true,
    can_manage_guests: true,
    can_scan_qr: true,
    can_manage_reports: true,
    can_manage_settings: true,
    can_manage_event_setup: true,
    can_manage_event_settings: false,
    can_manage_users: false,
    can_manage_roles: false,
};

const ROLE_PERMISSIONS: Record<UserRole, PermissionMap> = {
    admin: ADMIN_PERMISSIONS,
    organizer: ORGANIZER_PERMISSIONS,
    organiser: ORGANIZER_PERMISSIONS,
    viewer: {
        can_create_events: false,
        can_manage_events: false,
        can_manage_guests: false,
        can_scan_qr: false,
        can_manage_reports: true,
        can_manage_settings: false,
        can_manage_event_setup: false,
        can_manage_event_settings: false,
        can_manage_users: false,
        can_manage_roles: false,
    },
    scanner: {
        can_create_events: false,
        can_manage_events: false,
        can_manage_guests: false,
        can_scan_qr: true,
        can_manage_reports: false,
        can_manage_settings: false,
        can_manage_event_setup: false,
        can_manage_event_settings: false,
        can_manage_users: false,
        can_manage_roles: false,
    },
};

export function isAdmin(profile: Profile | null) {
    return profile?.role === "admin";
}

export function isOrganizer(profile: Profile | null) {
    return profile?.role === "organizer" || profile?.role === "organiser";
}

export function hasPermission(
    profileOrRole: Profile | UserRole | null,
    permission: PermissionKey
) {
    const role =
        typeof profileOrRole === "string"
            ? profileOrRole
            : profileOrRole?.role;

    if (!role) return false;

    return Boolean(ROLE_PERMISSIONS[role]?.[permission]);
}

export async function getSessionProfile() {
    const supabaseServer = await createSupabaseServerClient();

    const {
        data: { user },
        error: userError,
    } = await supabaseServer.auth.getUser();

    if (userError || !user) {
        return {
            supabaseServer,
            user: null,
            profile: null as Profile | null,
        };
    }

    const { data: profile, error: profileError } = await supabaseServer
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
        return {
            supabaseServer,
            user,
            profile: null as Profile | null,
        };
    }

    return {
        supabaseServer,
        user,
        profile: profile as Profile,
    };
}

export async function requireProfile() {
    const session = await getSessionProfile();

    if (!session.user) {
        redirect("/auth/login");
    }

    if (!session.profile) {
        redirect("/auth/login?error=missing-profile");
    }

    return session as Awaited<ReturnType<typeof getSessionProfile>> & {
        user: NonNullable<Awaited<ReturnType<typeof getSessionProfile>>["user"]>;
        profile: Profile;
    };
}

export async function requireAdmin() {
    const session = await requireProfile();

    if (!isAdmin(session.profile)) {
        redirect("/dashboard/events");
    }

    return session;
}

export async function requirePermission(permission: PermissionKey) {
    const session = await requireProfile();

    if (!hasPermission(session.profile, permission)) {
        redirect("/dashboard/events");
    }

    return session;
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!value) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
    }

    return value;
}

function getSupabaseAnonKey() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!value) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }

    return value;
}

function getServiceRoleKey() {
    const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!value) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
    }

    return value;
}

function createSupabaseAdmin() {
    return createClient(getSupabaseUrl(), getServiceRoleKey(), {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

function createAuthedSupabase(accessToken: string) {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

async function requireAdmin(request: Request) {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!accessToken) {
        return {
            error: "Missing authorization token.",
            status: 401,
            adminClient: null,
            userId: null,
        };
    }

    const authedClient = createAuthedSupabase(accessToken);
    const adminClient = createSupabaseAdmin();

    const {
        data: { user },
        error: userError,
    } = await authedClient.auth.getUser();

    if (userError || !user) {
        return {
            error: "Invalid or expired session.",
            status: 401,
            adminClient: null,
            userId: null,
        };
    }

    const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return {
            error: "Unable to verify admin profile.",
            status: 403,
            adminClient: null,
            userId: null,
        };
    }

    if (profile.role !== "admin") {
        return {
            error: "Only admin users can delete users.",
            status: 403,
            adminClient: null,
            userId: null,
        };
    }

    return {
        error: null,
        status: 200,
        adminClient,
        userId: user.id,
    };
}

function shouldIgnoreOptionalDeleteError(error: any) {
    const message = String(error?.message || "").toLowerCase();

    return (
        message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("relation") ||
        message.includes("schema cache")
    );
}

async function safeDeleteRows({
    adminClient,
    table,
    column,
    userId,
}: {
    adminClient: ReturnType<typeof createSupabaseAdmin>;
    table: string;
    column: string;
    userId: string;
}) {
    const { error } = await adminClient.from(table).delete().eq(column, userId);

    if (error && !shouldIgnoreOptionalDeleteError(error)) {
        console.warn(`Failed to clean ${table}.${column}:`, error.message);
    }
}

export async function DELETE(request: Request) {
    try {
        const adminCheck = await requireAdmin(request);

        if (adminCheck.error || !adminCheck.adminClient || !adminCheck.userId) {
            return NextResponse.json(
                { error: adminCheck.error },
                { status: adminCheck.status }
            );
        }

        const body = await request.json();
        const userId = String(body.userId || body.user_id || "").trim();

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId." },
                { status: 400 }
            );
        }

        if (userId === adminCheck.userId) {
            return NextResponse.json(
                { error: "You cannot delete your own logged-in admin account." },
                { status: 400 }
            );
        }

        const adminClient = adminCheck.adminClient;

        await safeDeleteRows({
            adminClient,
            table: "event_users",
            column: "user_id",
            userId,
        });

        await safeDeleteRows({
            adminClient,
            table: "event_members",
            column: "user_id",
            userId,
        });

        await safeDeleteRows({
            adminClient,
            table: "event_assignments",
            column: "user_id",
            userId,
        });

        await safeDeleteRows({
            adminClient,
            table: "user_events",
            column: "user_id",
            userId,
        });

        await safeDeleteRows({
            adminClient,
            table: "event_user_roles",
            column: "user_id",
            userId,
        });

        await adminClient.from("profiles").delete().eq("id", userId);

        const { error: authDeleteError } =
            await adminClient.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            return NextResponse.json(
                { error: authDeleteError.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "User deleted successfully.",
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error?.message || "Failed to delete user.",
            },
            { status: 500 }
        );
    }
}
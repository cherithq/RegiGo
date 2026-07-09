import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role = "admin" | "organizer" | "viewer" | "scanner";

const validRoles: Role[] = ["admin", "organizer", "viewer", "scanner"];

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
            error: "Only admin users can edit users.",
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

export async function PATCH(request: Request) {
    try {
        const adminCheck = await requireAdmin(request);

        if (adminCheck.error || !adminCheck.adminClient) {
            return NextResponse.json(
                { error: adminCheck.error },
                { status: adminCheck.status }
            );
        }

        const body = await request.json();

        const userId = String(body.userId || body.user_id || "").trim();
        const fullName = String(body.fullName || body.full_name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const role = String(body.role || "").trim() as Role;
        const password = body.password ? String(body.password).trim() : "";

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId." },
                { status: 400 }
            );
        }

        if (!fullName || !email || !role) {
            return NextResponse.json(
                { error: "Full name, email and role are required." },
                { status: 400 }
            );
        }

        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: "Invalid role selected." },
                { status: 400 }
            );
        }

        if (password && password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            );
        }

        const authUpdate: Record<string, unknown> = {
            email,
            user_metadata: {
                full_name: fullName,
            },
        };

        if (password) {
            authUpdate.password = password;
        }

        const { error: authError } =
            await adminCheck.adminClient.auth.admin.updateUserById(
                userId,
                authUpdate
            );

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        const { error: profileError } = await adminCheck.adminClient
            .from("profiles")
            .update({
                full_name: fullName,
                email,
                role,
            })
            .eq("id", userId);

        if (profileError) {
            return NextResponse.json(
                { error: profileError.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "User updated successfully.",
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error?.message || "Failed to update user.",
            },
            { status: 500 }
        );
    }
}
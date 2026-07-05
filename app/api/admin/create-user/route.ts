import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role = "admin" | "organizer" | "viewer" | "scanner";
type EventRole = "organizer" | "viewer" | "scanner";

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey =
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !anonKey || !serviceRoleKey) {
            return NextResponse.json(
                {
                    error:
                        "Missing env values. Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
                },
                { status: 500 }
            );
        }

        const authHeader = req.headers.get("authorization");

        if (!authHeader) {
            return NextResponse.json(
                {
                    error:
                        "Missing authorization token. Please log out and log in again.",
                },
                { status: 401 }
            );
        }

        const token = authHeader.replace("Bearer ", "");

        const supabaseUser = createClient(supabaseUrl, anonKey);
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const {
            data: { user: currentUser },
            error: currentUserError,
        } = await supabaseUser.auth.getUser(token);

        if (currentUserError || !currentUser) {
            return NextResponse.json(
                { error: "Invalid session. Please log out and log in again." },
                { status: 401 }
            );
        }

        const { data: currentProfile, error: currentProfileError } =
            await supabaseAdmin
                .from("profiles")
                .select("id, email, role")
                .eq("id", currentUser.id)
                .single();

        if (currentProfileError || !currentProfile) {
            return NextResponse.json(
                { error: "Could not find your profile in the profiles table." },
                { status: 403 }
            );
        }

        if (currentProfile.role !== "admin") {
            return NextResponse.json(
                {
                    error: `Only admin can create users. Your current role is ${currentProfile.role}.`,
                },
                { status: 403 }
            );
        }

        const body = await req.json();

        const fullName = String(body.fullName || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const role = String(body.role || "") as Role;
        const eventId = body.eventId ? String(body.eventId) : null;
        const eventRole = body.eventRole ? String(body.eventRole) : null;

        const validRoles: Role[] = ["admin", "organizer", "viewer", "scanner"];
        const validEventRoles: EventRole[] = ["organizer", "viewer", "scanner"];

        if (!fullName || !email || !password || !role) {
            return NextResponse.json(
                { error: "Please fill in full name, email, password and role." },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            );
        }

        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: "Invalid role selected." },
                { status: 400 }
            );
        }

        if (role !== "admin" && !eventId) {
            return NextResponse.json(
                { error: "Please assign the user to an event." },
                { status: 400 }
            );
        }

        if (role !== "admin" && eventId) {
            const { data: eventExists, error: eventError } = await supabaseAdmin
                .from("events")
                .select("id")
                .eq("id", eventId)
                .single();

            if (eventError || !eventExists) {
                return NextResponse.json(
                    { error: "Selected event does not exist or cannot be accessed." },
                    { status: 400 }
                );
            }
        }

        const {
            data: { user: newUser },
            error: createUserError,
        } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
            },
        });

        if (createUserError || !newUser) {
            return NextResponse.json(
                { error: createUserError?.message || "Failed to create auth user." },
                { status: 400 }
            );
        }

        const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
            {
                id: newUser.id,
                full_name: fullName,
                email,
                role,
            },
            {
                onConflict: "id",
            }
        );

        if (profileError) {
            return NextResponse.json(
                {
                    error: `User was created in Auth, but profile failed: ${profileError.message}`,
                },
                { status: 400 }
            );
        }

        if (role !== "admin" && eventId) {
            const cleanEventRole: EventRole =
                eventRole && validEventRoles.includes(eventRole as EventRole)
                    ? (eventRole as EventRole)
                    : role === "scanner"
                        ? "scanner"
                        : role === "viewer"
                            ? "viewer"
                            : "organizer";

            const { error: eventMemberError } = await supabaseAdmin
                .from("event_members")
                .upsert(
                    {
                        event_id: eventId,
                        profile_id: newUser.id,
                        role: cleanEventRole,
                    },
                    {
                        onConflict: "event_id,profile_id",
                    }
                );

            if (eventMemberError) {
                return NextResponse.json(
                    {
                        error: `User was created, but event assignment failed: ${eventMemberError.message}`,
                    },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "User created successfully.",
            userId: newUser.id,
        });
    } catch (error) {
        console.error("Create user API error:", error);

        return NextResponse.json(
            { error: "Server error creating user. Check VS Code terminal." },
            { status: 500 }
        );
    }
}
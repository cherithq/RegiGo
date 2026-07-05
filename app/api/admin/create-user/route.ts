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

        if (!supabaseUrl) {
            return NextResponse.json(
                { error: "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local" },
                { status: 500 }
            );
        }

        if (!anonKey) {
            return NextResponse.json(
                { error: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local" },
                { status: 500 }
            );
        }

        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local" },
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
                {
                    error:
                        currentUserError?.message ||
                        "Invalid session. Please log out and log in again.",
                },
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
                {
                    error:
                        currentProfileError?.message ||
                        "Could not find your profile in the profiles table.",
                },
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
                    { error: "Selected event does not exist." },
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

        const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", newUser.id)
            .maybeSingle();

        if (existingProfile) {
            const { error: updateProfileError } = await supabaseAdmin
                .from("profiles")
                .update({
                    full_name: fullName,
                    email,
                    role,
                })
                .eq("id", newUser.id);

            if (updateProfileError) {
                return NextResponse.json(
                    {
                        error: `User was created in Auth, but profile update failed: ${updateProfileError.message}`,
                    },
                    { status: 400 }
                );
            }
        } else {
            const { error: insertProfileError } = await supabaseAdmin
                .from("profiles")
                .insert({
                    id: newUser.id,
                    full_name: fullName,
                    email,
                    role,
                });

            if (insertProfileError) {
                return NextResponse.json(
                    {
                        error: `User was created in Auth, but profile insert failed: ${insertProfileError.message}`,
                    },
                    { status: 400 }
                );
            }
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

            const { data: existingMember, error: existingMemberError } =
                await supabaseAdmin
                    .from("event_members")
                    .select("id")
                    .eq("event_id", eventId)
                    .eq("profile_id", newUser.id)
                    .maybeSingle();

            if (existingMemberError) {
                return NextResponse.json(
                    {
                        error: `Failed to check existing event assignment: ${existingMemberError.message}`,
                    },
                    { status: 400 }
                );
            }

            if (existingMember) {
                const { error: updateMemberError } = await supabaseAdmin
                    .from("event_members")
                    .update({
                        role: cleanEventRole,
                    })
                    .eq("id", existingMember.id);

                if (updateMemberError) {
                    return NextResponse.json(
                        {
                            error: `User was created, but event assignment update failed: ${updateMemberError.message}`,
                        },
                        { status: 400 }
                    );
                }
            } else {
                const { error: insertMemberError } = await supabaseAdmin
                    .from("event_members")
                    .insert({
                        event_id: eventId,
                        profile_id: newUser.id,
                        role: cleanEventRole,
                    });

                if (insertMemberError) {
                    return NextResponse.json(
                        {
                            error: `User was created, but event assignment insert failed: ${insertMemberError.message}`,
                        },
                        { status: 400 }
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: "User created successfully.",
            userId: newUser.id,
        });
    } catch (error: any) {
        console.error("Create user API error:", error);

        return NextResponse.json(
            {
                error: error?.message || "Server error creating user.",
            },
            { status: 500 }
        );
    }
}
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { defaultOrganizerEnabledModules } from "@/lib/event-modules";
import {
    cleanGlitterGamesConfig,
    type GlitterGamesConfig,
} from "@/lib/glitter-games";

type RequestBody = {
    games?: Partial<Record<keyof GlitterGamesConfig, unknown>>;
};

const defaultClosedMessage = "Registration for this event is currently closed.";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { eventId } = await context.params;

        if (!eventId) {
            return NextResponse.json(
                { error: "Missing event ID." },
                { status: 400 },
            );
        }

        let body: RequestBody;

        try {
            body = (await request.json()) as RequestBody;
        } catch {
            return NextResponse.json(
                { error: "The request body must be valid JSON." },
                { status: 400 },
            );
        }

        if (!body.games || typeof body.games !== "object" || Array.isArray(body.games)) {
            return NextResponse.json(
                { error: "A games configuration object is required." },
                { status: 400 },
            );
        }

        const supabaseServer = await createSupabaseServerClient();

        const {
            data: { user },
        } = await supabaseServer.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "You must be logged in to update game settings." },
                { status: 401 },
            );
        }

        const [profileResult, eventResult] = await Promise.all([
            supabaseServer
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle(),
            supabaseServer
                .from("events")
                .select("id")
                .eq("id", eventId)
                .maybeSingle(),
        ]);

        if (profileResult.error) {
            return NextResponse.json(
                { error: profileResult.error.message },
                { status: 400 },
            );
        }

        if (eventResult.error) {
            return NextResponse.json(
                { error: eventResult.error.message },
                { status: 400 },
            );
        }

        if (!eventResult.data) {
            return NextResponse.json(
                { error: "Event not found or you do not have access to it." },
                { status: 404 },
            );
        }

        const role = profileResult.data?.role;
        const canManageGames =
            role === "admin" || role === "organizer" || role === "organiser";

        if (!canManageGames) {
            return NextResponse.json(
                { error: "You do not have permission to update game settings." },
                { status: 403 },
            );
        }

        const nextConfig = cleanGlitterGamesConfig(body.games);

        const { data: existingSettings, error: settingsError } =
            await supabaseServer
                .from("event_settings")
                .select("id")
                .eq("event_id", eventId)
                .maybeSingle();

        if (settingsError) {
            return NextResponse.json(
                { error: settingsError.message },
                { status: 400 },
            );
        }

        if (existingSettings?.id) {
            const { data, error } = await supabaseServer
                .from("event_settings")
                .update({ glitter_games_config: nextConfig })
                .eq("id", existingSettings.id)
                .select("glitter_games_config")
                .single();

            if (error) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 },
                );
            }

            return NextResponse.json({
                games: cleanGlitterGamesConfig(data.glitter_games_config),
            });
        }

        const { data, error } = await supabaseServer
            .from("event_settings")
            .insert({
                event_id: eventId,
                enabled_modules: defaultOrganizerEnabledModules,
                registration_is_open: true,
                registration_closed_message: defaultClosedMessage,
                glitter_games_config: nextConfig,
            })
            .select("glitter_games_config")
            .single();

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { games: cleanGlitterGamesConfig(data.glitter_games_config) },
            { status: 201 },
        );
    } catch (error) {
        console.error("Save Glitter Games settings failed:", error);

        return NextResponse.json(
            { error: "Failed to save Glitter Games settings." },
            { status: 500 },
        );
    }
}

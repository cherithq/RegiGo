import {
    createClient,
} from "@supabase/supabase-js";
import LuckyDrawAudienceDisplay from "@/components/lucky-draw/LuckyDrawAudienceDisplay";

export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Supabase server configuration is missing.",
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

export default async function LuckyDrawAudiencePage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const {
        eventId,
    } = await params;
    const admin =
        adminClient();

    const [
        eventResult,
        settingsResult,
        winnersResult,
    ] =
        await Promise.all([
            admin
                .from(
                    "events",
                )
                .select(
                    "id, event_name",
                )
                .eq(
                    "id",
                    eventId,
                )
                .maybeSingle(),

            admin
                .from(
                    "lucky_draw_settings",
                )
                .select(
                    "background_mode, background_color, gradient_start, gradient_end, background_image_url",
                )
                .eq(
                    "event_id",
                    eventId,
                )
                .maybeSingle(),

            admin
                .from(
                    "lucky_draw_winners",
                )
                .select("*")
                .eq(
                    "event_id",
                    eventId,
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    },
                ),
        ]);

    if (
        eventResult.error ||
        !eventResult.data
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
                <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center backdrop-blur-xl">
                    <h1 className="text-3xl font-black">
                        Audience display unavailable
                    </h1>

                    <p className="mt-4 text-sm leading-7 text-white/70">
                        {eventResult
                            .error
                            ?.message ||
                            "The event could not be found."}
                    </p>
                </section>
            </main>
        );
    }

    return (
        <LuckyDrawAudienceDisplay
            eventId={
                eventId
            }
            eventName={
                eventResult
                    .data
                    .event_name ||
                "Event"
            }
            initialWinners={
                winnersResult.data ||
                []
            }
            displaySettings={
                settingsResult.data ||
                {
                    background_mode:
                        "gradient",
                    background_color:
                        "#050816",
                    gradient_start:
                        "#4F46E5",
                    gradient_end:
                        "#EC4899",
                    background_image_url:
                        null,
                }
            }
        />
    );
}

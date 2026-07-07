// Add this to each event module page if you want direct URL access blocked too.
// Example for app/dashboard/events/[eventId]/guests/page.tsx:

import { requireEventModule } from "@/lib/require-event-module";

export default async function GuestsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    await requireEventModule(eventId, "guests");

    // existing page code below...
}

// Module key mapping:
// /dashboard/events/[eventId]                    -> "overview"
// /dashboard/events/[eventId]/guests             -> "guests"
// /dashboard/events/[eventId]/tickets            -> "tickets"
// /dashboard/events/[eventId]/tables             -> "tables"
// /dashboard/events/[eventId]/floor-plan         -> "floor_plan"
// /dashboard/events/[eventId]/speakers           -> "speakers"
// /dashboard/events/[eventId]/agenda             -> "agenda"
// /dashboard/events/[eventId]/scanner            -> "scanner"
// /dashboard/events/[eventId]/lucky-draw         -> "lucky_draw"
// /dashboard/events/[eventId]/analytics          -> "analytics"
// /dashboard/events/[eventId]/registration       -> "registration"
// /dashboard/events/[eventId]/website            -> "website"
// /dashboard/events/[eventId]/branding           -> "branding"
// /dashboard/events/[eventId]/emails             -> "emails"
// /dashboard/events/[eventId]/settings           -> "settings"
// /dashboard/events/[eventId]/lucky-draw/settings -> "lucky_draw_settings"

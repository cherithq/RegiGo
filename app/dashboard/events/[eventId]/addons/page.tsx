import {
    redirect,
} from "next/navigation";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default async function LegacyAddonsPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const { eventId } =
        await params;

    redirect(
        `/dashboard/events/${eventId}/settings#addons`,
    );
}

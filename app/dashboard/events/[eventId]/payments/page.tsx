import {
    redirect,
} from "next/navigation";

export const dynamic =
    "force-dynamic";

export default async function LegacyPaymentsPage({
    params,
}: {
    params: Promise<{
        eventId: string;
    }>;
}) {
    const {
        eventId,
    } = await params;

    redirect(
        `/dashboard/events/${eventId}/tickets`,
    );
}

import { requireEventAddonEnabled } from "@/lib/event-addons";

export const dynamic = "force-dynamic";

export default async function InvitationsAddonLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{
        eventId: string;
    }>;
}) {
    const { eventId } = await params;

    await requireEventAddonEnabled(
        eventId,
        "guest_invitations",
    );

    return children;
}

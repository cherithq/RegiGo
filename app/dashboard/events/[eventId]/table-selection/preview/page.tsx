import TableSelectionPreview from "@/components/tables/TableSelectionPreview";
import { requireTableSelectionManager } from "@/lib/table-selection";
import BackButton from "@/components/layout/BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TableSelectionPreviewPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;
    const configuration = await requireTableSelectionManager(eventId);

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <BackButton
                    href={`/dashboard/events/${eventId}/table-selection`}
                >
                    Back to Table Selection
                </BackButton>

                <p className="text-sm font-semibold text-slate-500">{configuration.event.event_name}</p>

                <TableSelectionPreview eventId={eventId} />
            </div>
        </main>
    );
}

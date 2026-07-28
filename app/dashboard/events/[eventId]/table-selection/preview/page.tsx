import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TableSelectionPreview from "@/components/tables/TableSelectionPreview";
import { requireTableSelectionManager } from "@/lib/table-selection";

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
                <Link
                    href={`/dashboard/events/${eventId}/table-selection`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Table Selection
                </Link>

                <p className="text-sm font-semibold text-slate-500">{configuration.event.event_name}</p>

                <TableSelectionPreview eventId={eventId} />
            </div>
        </main>
    );
}

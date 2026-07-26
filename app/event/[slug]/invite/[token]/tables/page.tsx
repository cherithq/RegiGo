import {
    CalendarDays,
    MapPin,
    TableProperties,
    Users,
} from "lucide-react";
import PublicTableSelector from "@/components/tables/PublicTableSelector";
import {
    TableSelectionError,
    getTableSelectionSnapshot,
} from "@/lib/table-selection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicTablesPage({
    params,
}: {
    params: Promise<{
        slug: string;
        token: string;
    }>;
}) {
    const { slug, token } = await params;

    try {
        const snapshot =
            await getTableSelectionSnapshot({
                slug,
                token,
            });

        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-10">
                <div className="mx-auto max-w-5xl space-y-6">
                    <section
                        className="relative overflow-hidden rounded-[2rem] p-7 text-white shadow-xl md:p-10"
                        style={{
                            backgroundImage:
                                snapshot.settings.banner_image_url
                                    ? `linear-gradient(rgba(2,6,23,.35), rgba(2,6,23,.55)), url("${snapshot.settings.banner_image_url}")`
                                    : `linear-gradient(to right, ${
                                          snapshot.settings
                                              .banner_color_from ||
                                          "#4F46E5"
                                      }, ${
                                          snapshot.settings
                                              .banner_color_to ||
                                          "#EC4899"
                                      })`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">
                            Guest Table Selection
                        </p>
                        <h1 className="mt-4 text-4xl font-black md:text-5xl">
                            {snapshot.settings.page_title ||
                                snapshot.event.event_name}
                        </h1>

                        <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-white/85">
                            <span className="inline-flex items-center gap-2">
                                <CalendarDays size={16} />
                                {snapshot.event.event_date}
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <MapPin size={16} />
                                {snapshot.event.venue}
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Users size={16} />
                                Party of {snapshot.partySize}
                            </span>
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                <TableProperties size={22} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black">
                                    Choose a table
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Guest:{" "}
                                    {snapshot.registration.full_name}
                                </p>
                            </div>
                        </div>

                        {snapshot.settings.instructions && (
                            <p className="mt-5 rounded-2xl bg-indigo-50 px-5 py-4 text-sm font-bold leading-6 text-indigo-800">
                                {snapshot.settings.instructions}
                            </p>
                        )}

                        <PublicTableSelector
                            slug={slug}
                            token={token}
                            completionUrl={`/event/${encodeURIComponent(
                                slug,
                            )}/invite/${encodeURIComponent(
                                token,
                            )}`}
                            completionLabel="Return to Invitation"
                            initialData={{
                                guest: {
                                    partySize: snapshot.partySize,
                                },
                                settings: snapshot.settings,
                                tables: snapshot.tables,
                                currentAssignment:
                                    snapshot.currentAssignment,
                                currentHold:
                                    snapshot.currentHold,
                            }}
                        />
                    </section>
                </div>
            </main>
        );
    } catch (error) {
        const message =
            error instanceof TableSelectionError ||
            error instanceof Error
                ? error.message
                : "Table selection is unavailable.";

        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
                <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                    <h1 className="text-3xl font-black">
                        Table selection unavailable
                    </h1>
                    <p className="mt-4 leading-7 text-slate-600">
                        {message}
                    </p>
                </section>
            </main>
        );
    }
}

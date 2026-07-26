import {
    CalendarDays,
    MapPin,
    TableProperties,
    Users,
} from "lucide-react";
import PublicTableSelector from "@/components/tables/PublicTableSelector";
import {
    TableSelectionError,
} from "@/lib/table-selection";
import {
    getRegistrationTableSelectionSnapshot,
} from "@/lib/registration-table-selection";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default async function RegistrationTablesPage({
    params,
}: {
    params: Promise<{
        slug: string;
        token: string;
    }>;
}) {
    const {
        slug,
        token,
    } = await params;

    try {
        const snapshot =
            await getRegistrationTableSelectionSnapshot(
                {
                    slug,
                    token,
                },
            );
        const endpoint =
            `/api/public/events/${encodeURIComponent(
                slug,
            )}/registration/${encodeURIComponent(
                token,
            )}/tables`;

        return (
            <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 md:p-10">
                <div className="mx-auto max-w-5xl space-y-6">
                    <section
                        className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-xl sm:p-8 md:p-10"
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
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75 sm:text-sm">
                            Registration Complete
                        </p>

                        <h1 className="mt-4 text-3xl font-black sm:text-4xl md:text-5xl">
                            {snapshot.settings.page_title ||
                                "Choose your table"}
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                            {snapshot.settings.page_subtitle ||
                                "Your registration has been saved. Choose a table for your party before continuing to your QR pass."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-white/85">
                            <span className="inline-flex items-center gap-2">
                                <CalendarDays
                                    size={16}
                                />
                                {
                                    snapshot
                                        .event
                                        .event_date
                                }
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <MapPin
                                    size={16}
                                />
                                {
                                    snapshot
                                        .event
                                        .venue
                                }
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Users
                                    size={16}
                                />
                                Party of{" "}
                                {
                                    snapshot.partySize
                                }
                            </span>
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                <TableProperties
                                    size={22}
                                />
                            </div>

                            <div>
                                <h2 className="text-xl font-black sm:text-2xl">
                                    Available tables
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Guest:{" "}
                                    {
                                        snapshot
                                            .registration
                                            .full_name
                                    }
                                </p>
                            </div>
                        </div>

                        {snapshot.settings
                            .instructions && (
                            <p className="mt-5 rounded-2xl bg-indigo-50 px-5 py-4 text-sm font-bold leading-6 text-indigo-800">
                                {
                                    snapshot
                                        .settings
                                        .instructions
                                }
                            </p>
                        )}

                        <PublicTableSelector
                            apiPath={
                                endpoint
                            }
                            completionUrl={
                                snapshot.qrPassUrl
                            }
                            completionLabel="Continue to QR Pass"
                            initialData={{
                                guest: {
                                    partySize:
                                        snapshot.partySize,
                                },
                                settings:
                                    snapshot.settings,
                                tables:
                                    snapshot.tables,
                                currentAssignment:
                                    snapshot.currentAssignment,
                                currentHold:
                                    snapshot.currentHold,
                            }}
                        />

                        {!snapshot.settings
                            .selection_required &&
                            !snapshot.currentAssignment && (
                            <a
                                href={
                                    snapshot.qrPassUrl
                                }
                                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                            >
                                Skip for Now
                            </a>
                        )}
                    </section>
                </div>
            </main>
        );
    } catch (error) {
        const message =
            error instanceof
                TableSelectionError ||
            error instanceof
                Error
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

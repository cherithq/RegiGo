import TapTournamentPlayer from "@/components/games/TapTournamentPlayer";

export const dynamic = "force-dynamic";

export default async function PublicTapTournamentPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <main className="min-h-[100dvh] bg-[#F7F5FF] px-4 py-6 text-slate-950 sm:px-6 md:py-10">
            <TapTournamentPlayer slug={slug} />
        </main>
    );
}

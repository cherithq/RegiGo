import TapTournamentDisplay from "@/components/games/TapTournamentDisplay";

export const dynamic = "force-dynamic";

export default async function TapTournamentDisplayPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <TapTournamentDisplay slug={slug} />
    );
}

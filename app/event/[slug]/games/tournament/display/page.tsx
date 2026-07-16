import TapTournamentDisplay from "@/components/games/TapTournamentDisplay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TournamentDisplayPage({
    params,
}: {
    params:
        | Promise<{ slug: string }>
        | { slug: string };
}) {
    const { slug } = await params;

    return (
        <TapTournamentDisplay
            slug={slug}
        />
    );
}

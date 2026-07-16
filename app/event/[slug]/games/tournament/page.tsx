import TapTournamentPlayer from "@/components/games/TapTournamentPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TournamentPlayerPage({
    params,
}: {
    params:
        | Promise<{ slug: string }>
        | { slug: string };
}) {
    const { slug } = await params;

    return (
        <TapTournamentPlayer
            slug={slug}
        />
    );
}

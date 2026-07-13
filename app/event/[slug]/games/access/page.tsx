import GuestGamesAccess from "@/components/games/GuestGamesAccess";

export const dynamic = "force-dynamic";

export default async function GlitterGamesAccessPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ code?: string | string[] }>;
}) {
    const { slug } = await params;
    const query = await searchParams;
    const accessToken = Array.isArray(query.code)
        ? query.code[0] || ""
        : query.code || "";

    return <GuestGamesAccess slug={slug} accessToken={accessToken} />;
}

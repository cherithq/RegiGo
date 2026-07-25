import PaymentResult from "@/components/payments/PaymentResult";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{
        slug: string;
        token: string;
    }>;
    searchParams: Promise<{
        session_id?: string;
        free_order?: string;
    }>;
}) {
    const { slug, token } = await params;
    const query = await searchParams;

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <PaymentResult
                slug={slug}
                token={token}
                sessionId={
                    query.session_id || null
                }
                freeOrder={
                    query.free_order || null
                }
            />
        </main>
    );
}

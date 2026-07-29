import PaymentResult from "@/components/payments/PaymentResult";

export const dynamic = "force-dynamic";

export default async function RegisterPaymentSuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{
        slug: string;
    }>;
    searchParams: Promise<{
        session_id?: string;
        free_order?: string;
        registration?: string;
    }>;
}) {
    const { slug } = await params;
    const query = await searchParams;

    const statusQuery = [
        query.session_id
            ? `session_id=${encodeURIComponent(query.session_id)}`
            : `free_order=${encodeURIComponent(query.free_order || "")}`,
        `registrationId=${encodeURIComponent(query.registration || "")}`,
    ].join("&");

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <PaymentResult
                statusUrl={`/api/public/events/${encodeURIComponent(
                    slug,
                )}/register/order-status?${statusQuery}`}
            />
        </main>
    );
}

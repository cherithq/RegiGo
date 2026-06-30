import Link from "next/link";

export default async function SuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ registration?: string }>;
}) {
    const { slug } = await params;
    const { registration } = await searchParams;

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-2xl">

                <div className="text-7xl">
                    🎉
                </div>

                <h1 className="mt-6 text-4xl font-black">
                    Registration Successful
                </h1>

                <p className="mt-4 text-slate-500">
                    Thank you for registering.
                    <br />
                    Your QR Pass has been generated.
                </p>

                <div className="mt-10 space-y-4">

                    <Link
                        href={`/event/${slug}/pass?registration=${registration}`}
                        className="block rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] py-4 text-center font-black text-white"
                    >
                        View QR Pass
                    </Link>

                    <Link
                        href={`/event/${slug}`}
                        className="block rounded-2xl border border-slate-300 py-4 text-center font-bold"
                    >
                        Back to Event
                    </Link>

                </div>

            </div>
        </main>
    );
}
import { XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegisterPaymentCancelledPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] p-5">
            <section className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                <XCircle
                    size={46}
                    className="mx-auto text-amber-600"
                />
                <h1 className="mt-5 text-3xl font-black">
                    Payment cancelled
                </h1>
                <p className="mt-4 leading-7 text-slate-600">
                    Your registration was saved, but payment was not
                    completed, so your QR pass isn&apos;t active yet.
                    Contact the event organiser to finish payment, or
                    register again if you&apos;d like to try once more.
                </p>
            </section>
        </main>
    );
}

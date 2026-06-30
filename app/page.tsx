import Navbar from "@/components/layout/Navbar";
import Button from "@/components/ui/Button";

export default function Home() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] text-slate-950">
            <Navbar />

            <section className="mx-auto max-w-7xl px-6 py-24">
                <div>
                    <p className="mb-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-[#EC4899] shadow-sm">
                        Smart Event Registration & QR Check-In
                    </p>

                    <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
                        Create events.
                        <br />
                        Register guests.
                        <br />
                        <span className="bg-gradient-to-r from-[#4F46E5] to-[#EC4899] bg-clip-text text-transparent">
                            Scan QR instantly.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                        RegiGo helps companies build branded event pages, collect registrations,
                        verify emails, issue QR tickets, and track attendance live.
                    </p>

                    <div className="mt-10 flex flex-wrap gap-4">
                        <Button href="/auth/register">Start Free</Button>
                        <Button href="/features" variant="outline">View Features</Button>
                    </div>
                </div>
            </section>
        </main>
    );
}
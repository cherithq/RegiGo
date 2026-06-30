import RegisterForm from "@/components/forms/RegisterForm";
import Logo from "@/components/layout/Logo";
import Link from "next/link";

export default function RegisterPage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] px-6 py-10 text-slate-950">
            <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1fr_1.1fr]">
                <section className="bg-gradient-to-br from-[#4F46E5] to-[#EC4899] p-10 text-white lg:p-14">
                    <Logo />

                    <h1 className="mt-16 text-5xl font-black leading-tight">
                        Start building better events today.
                    </h1>

                    <p className="mt-5 text-lg leading-8 text-white/85">
                        Create event pages, collect registrations, send QR passes, and
                        check in guests with RegiGo.
                    </p>

                    <div className="mt-10 space-y-4">
                        <Benefit text="Create unlimited event pages" />
                        <Benefit text="Custom registration forms" />
                        <Benefit text="QR ticket and check-in system" />
                        <Benefit text="Live guest list and reports" />
                    </div>
                </section>

                <section className="p-8 lg:p-12">
                    <div className="mb-8">
                        <h2 className="text-4xl font-black">Create account</h2>
                        <p className="mt-2 text-slate-500">
                            Set up your organizer account.
                        </p>
                    </div>

                    <RegisterForm />

                    <p className="mt-8 text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="font-bold text-[#4F46E5]">
                            Login
                        </Link>
                    </p>
                </section>
            </div>
        </main>
    );
}

function Benefit({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4 font-semibold backdrop-blur">
            <span>✅</span>
            <span>{text}</span>
        </div>
    );
}
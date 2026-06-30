import Link from "next/link";
import Logo from "@/components/layout/Logo";

export default function AuthCallbackPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
                <div className="flex justify-center"><Logo /></div>

                <div className="mt-8 text-5xl">✅</div>

                <h1 className="mt-6 text-3xl font-black">Email verified</h1>

                <p className="mt-3 text-slate-600">
                    Your account has been verified. You can now login and manage your events.
                </p>

                <Link
                    href="/auth/login"
                    className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white shadow-lg"
                >
                    Go to Login
                </Link>
            </div>
        </main>
    );
}
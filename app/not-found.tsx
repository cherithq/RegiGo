import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
            <div className="max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-xl">
                <h1 className="text-6xl font-black">404</h1>

                <p className="mt-4 text-xl font-bold">Page not found</p>

                <p className="mt-2 text-slate-600">
                    The page you are looking for does not exist.
                </p>

                <Link
                    href="/"
                    className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-bold text-white"
                >
                    Back to Home
                </Link>
            </div>
        </main>
    );
}
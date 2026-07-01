import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-10 text-center shadow-xl">
            <div className="text-6xl">🔒</div>

            <h1 className="mt-6 text-4xl font-black">Access Denied</h1>

            <p className="mt-3 text-slate-600">
                You do not have permission to access this page.
            </p>

            <Link
                href="/dashboard"
                className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white"
            >
                Back to Dashboard
            </Link>
        </div>
    );
}
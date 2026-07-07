import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function RegistrationClosedNotice({
    eventName,
    message,
}: {
    eventName?: string;
    message: string;
}) {
    return (
        <main className="min-h-screen bg-[#F7F5FF] px-6 py-16 text-slate-950">
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <LockKeyhole size={30} />
                </div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-[#4F46E5]">
                    Registration Closed
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                    {eventName || "This event"} is not accepting registrations
                </h1>

                <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-slate-600">
                    {message}
                </p>

                <Link
                    href="/"
                    className="mt-8 inline-flex rounded-2xl bg-[#4F46E5] px-6 py-3 text-sm font-black text-white transition hover:bg-[#4338CA]"
                >
                    Back to Home
                </Link>
            </div>
        </main>
    );
}
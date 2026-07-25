"use client";

import Link from "next/link";
import {
    MonitorPlay,
    Printer,
} from "lucide-react";

export default function DirectPrintingManager({
    eventId,
}: {
    eventId: string;
}) {
    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                    <Printer size={22} />
                </span>

                <div>
                    <h2 className="text-2xl font-black">
                        Browser Printing
                    </h2>
                    <p className="mt-2 max-w-2xl leading-7 text-slate-600">
                        The old local printer bridge has
                        been replaced. RegiGo now uses
                        the browser print dialog, which
                        can access any printer installed
                        on the event computer.
                    </p>

                    <Link
                        href={`/dashboard/events/${eventId}/check-in-printing`}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 font-black text-white"
                    >
                        <MonitorPlay size={17} />
                        Open Print Station
                    </Link>
                </div>
            </div>
        </section>
    );
}

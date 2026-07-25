"use client";

import {
    Printer,
    X,
} from "lucide-react";
import {
    useEffect,
    useRef,
} from "react";

export default function AutoPrintController({
    eventId,
    requestId,
}: {
    eventId?: string;
    requestId?: string;
}) {
    const opened = useRef(false);
    const acknowledged =
        useRef(false);

    useEffect(() => {
        if (opened.current) {
            return;
        }

        opened.current = true;

        const acknowledge = async () => {
            if (
                !eventId ||
                !requestId ||
                acknowledged.current
            ) {
                return;
            }

            acknowledged.current = true;

            try {
                await fetch(
                    `/api/events/${eventId}/check-in-printing/ack`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            requestId,
                            status:
                                "presented",
                        }),
                        keepalive: true,
                    },
                );
            } finally {
                window.setTimeout(
                    () => {
                        window.location.replace(
                            "about:blank",
                        );
                    },
                    500,
                );
            }
        };

        const handleAfterPrint = () => {
            void acknowledge();
        };

        window.addEventListener(
            "afterprint",
            handleAfterPrint,
        );

        const timer =
            window.setTimeout(
                () => {
                    window.print();
                },
                500,
            );

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener(
                "afterprint",
                handleAfterPrint,
            );
        };
    }, [eventId, requestId]);

    return (
        <div className="print-toolbar">
            <div>
                <p className="font-black">
                    RegiGo Browser Printing
                </p>
                <p className="text-sm text-slate-500">
                    Select any printer available on this
                    computer.
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() =>
                        window.print()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-3 font-black text-white"
                >
                    <Printer size={16} />
                    Print Again
                </button>

                {!requestId && (
                    <button
                        type="button"
                        onClick={() =>
                            window.close()
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700"
                    >
                        <X size={16} />
                        Close
                    </button>
                )}
            </div>
        </div>
    );
}

"use client";

import {
    AlertTriangle,
    Loader2,
    Trash2,
    X,
} from "lucide-react";
import {
    useRouter,
} from "next/navigation";
import {
    useState,
} from "react";

async function readJson(
    response: Response,
) {
    const text =
        await response.text();

    if (!text.trim()) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            error:
                text ||
                "The server returned an invalid response.",
        };
    }
}

export default function DeleteEventButton({
    eventId,
    eventName,
    redirectAfterDelete,
    compact = false,
}: {
    eventId: string;
    eventName: string;
    redirectAfterDelete?: string;
    compact?: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] =
        useState(false);
    const [confirmation, setConfirmation] =
        useState("");
    const [deleting, setDeleting] =
        useState(false);
    const [error, setError] =
        useState("");

    const matches =
        confirmation === eventName;

    function close() {
        if (deleting) {
            return;
        }

        setOpen(false);
        setConfirmation("");
        setError("");
    }

    async function removeEvent() {
        if (!matches || deleting) {
            return;
        }

        setDeleting(true);
        setError("");

        try {
            const response = await fetch(
                `/api/events/${eventId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        confirmationName:
                            confirmation,
                    }),
                },
            );

            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to delete the event.",
                );
            }

            setOpen(false);
            setConfirmation("");

            if (redirectAfterDelete) {
                router.replace(
                    redirectAfterDelete,
                );
            }

            router.refresh();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Unable to delete the event.",
            );
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() =>
                    setOpen(true)
                }
                className={
                    compact
                        ? "inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                        : "inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:border-red-300 hover:bg-red-100"
                }
            >
                <Trash2
                    size={
                        compact
                            ? 14
                            : 16
                    }
                />
                Delete Event
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-event-title"
                >
                    <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                            <div className="flex items-start gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                    <AlertTriangle
                                        size={23}
                                    />
                                </span>

                                <div>
                                    <h2
                                        id="delete-event-title"
                                        className="text-2xl font-black text-slate-950"
                                    >
                                        Delete Event
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        This permanently
                                        removes the event
                                        workspace and its
                                        event-related data.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={close}
                                disabled={
                                    deleting
                                }
                                className="rounded-xl bg-slate-100 p-2.5 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                                aria-label="Close delete event dialog"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800">
                                Guests, check-ins,
                                tickets, tables, emails,
                                badges, add-ons and other
                                event records may also be
                                removed. This cannot be
                                undone.
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-600">
                                    Type the exact event
                                    name to confirm:
                                </p>

                                <div className="mt-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-900">
                                    {eventName}
                                </div>

                                <input
                                    autoFocus
                                    value={
                                        confirmation
                                    }
                                    onChange={(event) =>
                                        setConfirmation(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key ===
                                                "Enter" &&
                                            matches
                                        ) {
                                            void removeEvent();
                                        }
                                    }}
                                    placeholder="Enter the event name"
                                    className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none transition focus:border-red-400"
                                />
                            </div>

                            {error && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={close}
                                    disabled={
                                        deleting
                                    }
                                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void removeEvent()
                                    }
                                    disabled={
                                        !matches ||
                                        deleting
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {deleting ? (
                                        <Loader2
                                            size={
                                                16
                                            }
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Trash2
                                            size={
                                                16
                                            }
                                        />
                                    )}
                                    Permanently Delete
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

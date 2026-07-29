"use client";

import {
    ExternalLink,
    Globe2,
    Loader2,
    Trash2,
} from "lucide-react";
import {
    useEffect,
    useState,
} from "react";
import {
    useRouter,
} from "next/navigation";
import Link from "next/link";

type EligibilityPayload = {
    success?: boolean;
    allowed?: boolean;
    reason?: string;
    eventName?:
        | string
        | null;
    planName?:
        | string
        | null;
    error?: string;
};

async function readJson(
    response: Response,
): Promise<EligibilityPayload> {
    const raw =
        await response.text();

    if (
        !raw.trim()
    ) {
        return {};
    }

    try {
        return JSON.parse(
            raw,
        ) as EligibilityPayload;
    } catch {
        return {
            error:
                `The event deletion route returned an invalid response (HTTP ${response.status}).`,
        };
    }
}

export default function DeleteEventButton({
    eventId,
    eventName,
    className =
        "",
    showLockedMessage =
        false,
    redirectAfterDelete =
        "/dashboard/events",
    compact =
        false,
    eventSlug,
    showWebsiteLink =
        true,
}: {
    eventId: string;
    eventName?:
        | string
        | null;
    className?: string;
    showLockedMessage?: boolean;
    redirectAfterDelete?: string;
    compact?: boolean;
    eventSlug?:
        | string
        | null;
    showWebsiteLink?: boolean;
}) {
    const router =
        useRouter();
    const [
        loadingAccess,
        setLoadingAccess,
    ] = useState(true);
    const [
        allowed,
        setAllowed,
    ] = useState(false);
    const [
        reason,
        setReason,
    ] = useState("");
    const [
        deleting,
        setDeleting,
    ] = useState(false);
    const [
        error,
        setError,
    ] = useState("");

    useEffect(() => {
        let cancelled =
            false;

        async function loadAccess() {
            setLoadingAccess(
                true,
            );
            setError(
                "",
            );

            try {
                const response =
                    await fetch(
                        `/api/events/${encodeURIComponent(
                            eventId,
                        )}/delete`,
                        {
                            method:
                                "GET",
                            cache:
                                "no-store",
                        },
                    );
                const payload =
                    await readJson(
                        response,
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        payload.error ||
                            "Unable to check event deletion access.",
                    );
                }

                if (
                    cancelled
                ) {
                    return;
                }

                setAllowed(
                    payload.allowed ===
                        true,
                );
                setReason(
                    payload.reason ||
                        "",
                );
            } catch (caught) {
                if (
                    cancelled
                ) {
                    return;
                }

                setAllowed(
                    false,
                );
                setError(
                    caught instanceof
                        Error
                        ? caught.message
                        : "Unable to check event deletion access.",
                );
            } finally {
                if (
                    !cancelled
                ) {
                    setLoadingAccess(
                        false,
                    );
                }
            }
        }

        void loadAccess();

        return () => {
            cancelled =
                true;
        };
    }, [
        eventId,
    ]);

    async function removeEvent() {
        if (
            deleting ||
            !allowed
        ) {
            return;
        }

        const label =
            eventName?.trim() ||
            "this event";
        const confirmed =
            window.confirm(
                `Permanently delete ${label}? This cannot be undone.`,
            );

        if (
            !confirmed
        ) {
            return;
        }

        setDeleting(
            true,
        );
        setError(
            "",
        );

        try {
            const response =
                await fetch(
                    `/api/events/${encodeURIComponent(
                        eventId,
                    )}/delete`,
                    {
                        method:
                            "DELETE",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    },
                );
            const payload =
                await readJson(
                    response,
                );

            if (
                !response.ok
            ) {
                throw new Error(
                    payload.error ||
                        "Unable to delete the event.",
                );
            }

            router.replace(
                redirectAfterDelete,
            );
            router.refresh();
        } catch (caught) {
            setError(
                caught instanceof
                    Error
                    ? caught.message
                    : "Unable to delete the event.",
            );
        } finally {
            setDeleting(
                false,
            );
        }
    }

    const cleanEventSlug =
        String(
            eventSlug ||
                "",
        ).trim();

    const websiteAction =
        compact && showWebsiteLink ? (
            cleanEventSlug ? (
                <Link
                    href={`/event/${encodeURIComponent(
                        cleanEventSlug,
                    )}?preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5] transition hover:border-[#4F46E5] hover:bg-white"
                >
                    <Globe2
                        size={
                            17
                        }
                    />
                    View Website
                    <ExternalLink
                        size={
                            14
                        }
                    />
                </Link>
            ) : (
                <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-400">
                    Website not ready
                </span>
            )
        ) : null;

    if (
        loadingAccess
    ) {
        return websiteAction ? (
            <div className="flex w-full items-center gap-3">
                {
                    websiteAction
                }
            </div>
        ) : null;
    }

    if (
        !allowed
    ) {
        if (
            compact &&
            websiteAction
        ) {
            return (
                <div className="w-full space-y-2">
                    <div className="flex w-full items-center gap-3">
                        {
                            websiteAction
                        }
                    </div>

                    {showLockedMessage && (
                        <p className="text-xs font-semibold leading-5 text-slate-500">
                            {error ||
                                reason ||
                                "Event deletion is unavailable for this account."}
                        </p>
                    )}
                </div>
            );
        }

        if (
            !showLockedMessage
        ) {
            return null;
        }

        return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                {error ||
                    reason ||
                    "Event deletion is unavailable for this account."}
            </div>
        );
    }

    const accessibleLabel =
        deleting
            ? "Deleting event"
            : `Delete ${
                  eventName?.trim() ||
                  "event"
              }`;

    return (
        <div
            className={
                compact
                    ? "flex w-full flex-col gap-2"
                    : "space-y-2"
            }
        >
            <div
                className={
                    compact
                        ? "flex w-full items-center gap-3"
                        : ""
                }
            >
                {
                    websiteAction
                }

            <button
                type="button"
                onClick={() =>
                    void removeEvent()
                }
                disabled={
                    deleting
                }
                aria-label={
                    accessibleLabel
                }
                title={
                    compact
                        ? accessibleLabel
                        : undefined
                }
                className={[
                    compact
                        ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-0 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50",
                    className,
                ].join(
                    " ",
                )}
            >
                {deleting ? (
                    <Loader2
                        size={
                            compact
                                ? 16
                                : 17
                        }
                        className="animate-spin"
                    />
                ) : (
                    <Trash2
                        size={
                            compact
                                ? 16
                                : 17
                        }
                    />
                )}

                {!compact && (
                    <span>
                        {deleting
                            ? "Deleting Event…"
                            : "Delete Event"}
                    </span>
                )}
            </button>
            </div>

            {error && (
                <p
                    className={[
                        "text-sm font-semibold leading-6 text-red-600",
                        compact
                            ? "max-w-64 text-right"
                            : "max-w-xl",
                    ].join(
                        " ",
                    )}
                >
                    {
                        error
                    }
                </p>
            )}
        </div>
    );
}
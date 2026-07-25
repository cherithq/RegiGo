"use client";

import Link from "next/link";
import {
    CheckCircle2,
    Loader2,
    TableProperties,
    Ticket,
    XCircle,
} from "lucide-react";
import { useState } from "react";

type Status =
    | "pending"
    | "opened"
    | "accepted"
    | "declined"
    | "cancelled"
    | "expired";

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};

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

export default function GuestInvitationResponse({
    slug,
    token,
    initialStatus,
    initialDeclineReason,
    allowChanges,
    primaryColor,
    ticketSelectionUrl,
    tableSelectionUrl,
}: {
    slug: string;
    token: string;
    initialStatus: Status;
    initialDeclineReason: string;
    allowChanges: boolean;
    primaryColor: string;
    ticketSelectionUrl?: string | null;
    tableSelectionUrl?: string | null;
}) {
    const [status, setStatus] =
        useState<Status>(initialStatus);
    const [declineReason, setDeclineReason] =
        useState(initialDeclineReason);
    const [working, setWorking] = useState<
        "accepted" | "declined" | ""
    >("");
    const [message, setMessage] = useState("");

    const responded =
        status === "accepted" || status === "declined";
    const inactive =
        status === "cancelled" || status === "expired";

    async function respond(
        responseValue: "accepted" | "declined",
    ) {
        setWorking(responseValue);
        setMessage("");

        try {
            const response = await fetch(
                `/api/public/events/${encodeURIComponent(
                    slug,
                )}/invite/${encodeURIComponent(token)}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        response: responseValue,
                        declineReason:
                            responseValue === "declined"
                                ? declineReason
                                : "",
                    }),
                },
            );
            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to save your RSVP.",
                );
            }

            setStatus(responseValue);
            setMessage(
                result.message ||
                    "Your response has been saved.",
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save your RSVP.",
            );
        } finally {
            setWorking("");
        }
    }

    if (inactive) {
        return (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                <p className="font-black">
                    This invitation is no longer active.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-7">
            {responded && (
                <div
                    className={`rounded-2xl border p-5 ${
                        status === "accepted"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-800"
                    }`}
                >
                    <div className="flex items-start gap-3">
                        {status === "accepted" ? (
                            <CheckCircle2 size={23} />
                        ) : (
                            <XCircle size={23} />
                        )}
                        <div>
                            <p className="font-black">
                                {status === "accepted"
                                    ? "Attendance confirmed"
                                    : "Decline recorded"}
                            </p>
                            <p className="mt-1 text-sm leading-6">
                                {status === "accepted"
                                    ? "The event organiser can now see that you are attending."
                                    : "The event organiser can now see that you are unable to attend."}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {status === "accepted" &&
                ticketSelectionUrl && (
                    <Link
                        href={ticketSelectionUrl}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white shadow-lg"
                        style={{
                            backgroundColor: primaryColor,
                        }}
                    >
                        <Ticket size={18} />
                        Choose Ticket
                    </Link>
                )}

            {status === "accepted" &&
                !ticketSelectionUrl &&
                tableSelectionUrl && (
                    <Link
                        href={tableSelectionUrl}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white shadow-lg"
                        style={{
                            backgroundColor: primaryColor,
                        }}
                    >
                        <TableProperties size={18} />
                        Choose Table
                    </Link>
                )}

            {message && (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    {message}
                </div>
            )}

            {(!responded || allowChanges) && (
                <div className="mt-6 space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-black text-slate-700">
                            Optional reason if declining
                        </label>
                        <textarea
                            value={declineReason}
                            onChange={(event) =>
                                setDeclineReason(
                                    event.target.value.slice(
                                        0,
                                        500,
                                    ),
                                )
                            }
                            rows={3}
                            placeholder="You may leave this blank"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() =>
                                void respond("accepted")
                            }
                            disabled={Boolean(working)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
                            style={{
                                backgroundColor: primaryColor,
                            }}
                        >
                            {working === "accepted" ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <CheckCircle2 size={18} />
                            )}
                            Accept Invitation
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                void respond("declined")
                            }
                            disabled={Boolean(working)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-4 font-black text-red-700 disabled:opacity-50"
                        >
                            {working === "declined" ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <XCircle size={18} />
                            )}
                            Decline Invitation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

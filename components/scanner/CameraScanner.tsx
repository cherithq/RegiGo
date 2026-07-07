"use client";

import { useEffect, useRef, useState } from "react";
import {
    BrowserMultiFormatReader,
    IScannerControls,
} from "@zxing/browser";
import { supabase } from "@/lib/supabase";

type ScanResult = {
    status: "success" | "duplicate" | "invalid" | "camera" | "error" | "";
    message: string;
    guestName?: string;
    email?: string;
    scannedValue?: string;
};

type QrPayload = {
    rawValue: string;
    qrToken: string | null;
    registrationId: string | null;
};

type TicketResult = {
    id: string;
    event_id: string;
    registration_id: string;
    qr_token: string;
    qr_code_url?: string | null;
    is_active?: boolean;
    registrations?: {
        id?: string;
        full_name?: string;
        email?: string;
        registration_status?: string;
    };
};

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    );
}

function extractQrPayload(scannedValue: string): QrPayload {
    const rawValue = scannedValue.trim();

    let qrToken: string | null = null;
    let registrationId: string | null = null;

    try {
        const url = new URL(rawValue);

        registrationId =
            url.searchParams.get("registration") ||
            url.searchParams.get("registration_id") ||
            url.searchParams.get("registrationId");

        qrToken =
            url.searchParams.get("qr_token") ||
            url.searchParams.get("qrToken") ||
            url.searchParams.get("token") ||
            url.searchParams.get("ticket");
    } catch {
        // Not a URL. Treat it as a raw QR value below.
    }

    if (!registrationId && isUuid(rawValue)) {
        registrationId = rawValue;
    }

    if (!qrToken && !registrationId) {
        qrToken = rawValue;
    }

    return {
        rawValue,
        qrToken,
        registrationId,
    };
}

export default function CameraScanner({ eventId }: { eventId: string }) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const handlingScanRef = useRef(false);

    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult>({
        status: "",
        message: "Camera ready. Click start to scan.",
    });

    async function findTicket(payload: QrPayload) {
        if (payload.registrationId) {
            const { data, error } = await supabase
                .from("qr_tickets")
                .select("*, registrations(*)")
                .eq("registration_id", payload.registrationId)
                .eq("event_id", eventId)
                .maybeSingle();

            if (error) {
                throw new Error(error.message);
            }

            if (data) {
                return data as TicketResult;
            }
        }

        if (payload.qrToken) {
            const { data, error } = await supabase
                .from("qr_tickets")
                .select("*, registrations(*)")
                .eq("qr_token", payload.qrToken)
                .eq("event_id", eventId)
                .maybeSingle();

            if (error) {
                throw new Error(error.message);
            }

            if (data) {
                return data as TicketResult;
            }
        }

        if (payload.rawValue && payload.rawValue !== payload.qrToken) {
            const { data, error } = await supabase
                .from("qr_tickets")
                .select("*, registrations(*)")
                .eq("qr_token", payload.rawValue)
                .eq("event_id", eventId)
                .maybeSingle();

            if (error) {
                throw new Error(error.message);
            }

            if (data) {
                return data as TicketResult;
            }
        }

        return null;
    }

    async function syncCheckedInState(ticket: TicketResult) {
        const { error: registrationUpdateError } = await supabase
            .from("registrations")
            .update({
                registration_status: "checked_in",
            })
            .eq("id", ticket.registration_id);

        if (registrationUpdateError) {
            throw new Error(registrationUpdateError.message);
        }

        const { error: ticketUpdateError } = await supabase
            .from("qr_tickets")
            .update({
                is_active: false,
            })
            .eq("id", ticket.id);

        if (ticketUpdateError) {
            throw new Error(ticketUpdateError.message);
        }
    }

    async function handleScan(scannedValue: string) {
        if (!scannedValue) return;
        if (handlingScanRef.current) return;

        handlingScanRef.current = true;
        stopScanner();

        const payload = extractQrPayload(scannedValue);

        try {
            const ticket = await findTicket(payload);

            if (!ticket) {
                setResult({
                    status: "invalid",
                    message:
                        "Invalid QR code. This QR code does not match a ticket for this event.",
                    scannedValue: payload.rawValue,
                });
                return;
            }

            const { data: existing, error: existingError } = await supabase
                .from("check_ins")
                .select("*")
                .eq("registration_id", ticket.registration_id)
                .eq("event_id", eventId)
                .eq("scan_result", "checked_in")
                .maybeSingle();

            if (existingError) {
                throw new Error(existingError.message);
            }

            const alreadyCheckedIn =
                Boolean(existing) ||
                ticket.is_active === false ||
                ticket.registrations?.registration_status === "checked_in" ||
                ticket.registrations?.registration_status === "attended";

            if (alreadyCheckedIn) {
                await syncCheckedInState(ticket);

                setResult({
                    status: "duplicate",
                    message: "Guest already checked in. Check-in status has been synced.",
                    guestName: ticket.registrations?.full_name,
                    email: ticket.registrations?.email,
                    scannedValue: payload.rawValue,
                });
                return;
            }

            const { error: insertError } = await supabase.from("check_ins").insert({
                registration_id: ticket.registration_id,
                event_id: eventId,
                qr_ticket_id: ticket.id,
                checked_in_by: "Admin",
                device_name: "Web Camera Scanner",
                scan_result: "checked_in",
            });

            if (insertError) {
                throw new Error(insertError.message);
            }

            await syncCheckedInState(ticket);

            setResult({
                status: "success",
                message: "Checked in successfully.",
                guestName: ticket.registrations?.full_name,
                email: ticket.registrations?.email,
                scannedValue: payload.rawValue,
            });
        } catch (error: any) {
            setResult({
                status: "error",
                message: error?.message || "Something went wrong while scanning.",
                scannedValue: payload.rawValue,
            });
        }
    }

    async function startScanner() {
        handlingScanRef.current = false;

        setResult({
            status: "",
            message: "Starting camera...",
        });

        try {
            const codeReader = new BrowserMultiFormatReader();

            const devices = await BrowserMultiFormatReader.listVideoInputDevices();

            if (!devices || devices.length === 0) {
                setResult({
                    status: "camera",
                    message: "No camera found on this device.",
                });
                return;
            }

            const backCamera =
                devices.find((device) =>
                    device.label.toLowerCase().includes("back")
                ) || devices[0];

            const controls = await codeReader.decodeFromVideoDevice(
                backCamera.deviceId,
                videoRef.current!,
                (decodeResult) => {
                    if (decodeResult) {
                        handleScan(decodeResult.getText());
                    }
                }
            );

            controlsRef.current = controls;
            setScanning(true);

            setResult({
                status: "",
                message: "Scanning... Show the QR code to the camera.",
            });
        } catch (error: any) {
            setResult({
                status: "camera",
                message:
                    error?.message ||
                    "Unable to open camera. Please allow camera permission.",
            });
        }
    }

    function stopScanner() {
        controlsRef.current?.stop();
        controlsRef.current = null;
        setScanning(false);
    }

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-4 shadow-xl">
                <video
                    ref={videoRef}
                    className="min-h-[360px] w-full rounded-2xl bg-black object-cover"
                    muted
                    playsInline
                />
            </div>

            {!scanning ? (
                <button
                    onClick={startScanner}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                >
                    Start Camera Scanner
                </button>
            ) : (
                <button
                    onClick={stopScanner}
                    className="w-full rounded-2xl bg-slate-950 px-6 py-4 font-black text-white shadow-lg transition hover:opacity-90"
                >
                    Stop Scanner
                </button>
            )}

            <div
                className={`rounded-[2rem] p-6 shadow ${result.status === "success"
                        ? "bg-green-50 text-green-700"
                        : result.status === "duplicate"
                            ? "bg-yellow-50 text-yellow-700"
                            : result.status === "invalid"
                                ? "bg-red-50 text-red-700"
                                : result.status === "camera"
                                    ? "bg-orange-50 text-orange-700"
                                    : result.status === "error"
                                        ? "bg-red-50 text-red-700"
                                        : "bg-white text-slate-700"
                    }`}
            >
                <p className="text-xl font-black">
                    {result.status === "success" && "✅ Verified"}
                    {result.status === "duplicate" && "⚠️ Already Checked In"}
                    {result.status === "invalid" && "❌ Invalid QR"}
                    {result.status === "camera" && "📷 Camera Issue"}
                    {result.status === "error" && "⚠️ Scan Error"}
                    {!result.status && "📷 Scanner Ready"}
                </p>

                <p className="mt-2 font-semibold">{result.message}</p>

                {result.guestName && (
                    <div className="mt-4 rounded-2xl bg-white/70 p-4">
                        <p className="text-lg font-black">{result.guestName}</p>
                        <p className="text-sm">{result.email}</p>
                    </div>
                )}

                {result.scannedValue && result.status !== "success" && (
                    <div className="mt-4 rounded-2xl bg-white/70 p-4">
                        <p className="text-xs font-black uppercase tracking-wide opacity-70">
                            Scanned Value
                        </p>
                        <p className="mt-1 break-all text-sm font-semibold">
                            {result.scannedValue}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
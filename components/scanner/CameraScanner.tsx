"use client";

import { useEffect, useRef, useState } from "react";
import {
    BrowserMultiFormatReader,
    IScannerControls,
} from "@zxing/browser";
import { supabase } from "@/lib/supabase";

type ScanResult = {
    status: "success" | "duplicate" | "invalid" | "camera" | "";
    message: string;
    guestName?: string;
    email?: string;
};

export default function CameraScanner({ eventId }: { eventId: string }) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult>({
        status: "",
        message: "Camera ready. Click start to scan.",
    });

    async function handleScan(qrToken: string) {
        if (!qrToken) return;

        stopScanner();

        const { data: ticket } = await supabase
            .from("qr_tickets")
            .select("*, registrations(*)")
            .eq("qr_token", qrToken)
            .eq("event_id", eventId)
            .maybeSingle();

        if (!ticket) {
            setResult({
                status: "invalid",
                message: "Invalid QR code.",
            });
            return;
        }

        const { data: existing } = await supabase
            .from("check_ins")
            .select("*")
            .eq("registration_id", ticket.registration_id)
            .eq("event_id", eventId)
            .eq("scan_result", "checked_in")
            .maybeSingle();

        if (existing) {
            setResult({
                status: "duplicate",
                message: "Guest already checked in.",
                guestName: ticket.registrations?.full_name,
                email: ticket.registrations?.email,
            });
            return;
        }

        await supabase.from("check_ins").insert({
            registration_id: ticket.registration_id,
            event_id: eventId,
            qr_ticket_id: ticket.id,
            checked_in_by: "Admin",
            device_name: "Web Camera Scanner",
            scan_result: "checked_in",
        });

        setResult({
            status: "success",
            message: "Checked in successfully.",
            guestName: ticket.registrations?.full_name,
            email: ticket.registrations?.email,
        });
    }

    async function startScanner() {
        setResult({
            status: "",
            message: "Starting camera...",
        });

        try {
            const codeReader = new BrowserMultiFormatReader();

            const devices =
                await BrowserMultiFormatReader.listVideoInputDevices();

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
                    className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-black text-white shadow-lg"
                >
                    Start Camera Scanner
                </button>
            ) : (
                <button
                    onClick={stopScanner}
                    className="w-full rounded-2xl bg-slate-950 px-6 py-4 font-black text-white shadow-lg"
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
                                    : "bg-white text-slate-700"
                    }`}
            >
                <p className="text-xl font-black">
                    {result.status === "success" && "✅ Verified"}
                    {result.status === "duplicate" && "⚠️ Already Checked In"}
                    {result.status === "invalid" && "❌ Invalid QR"}
                    {result.status === "camera" && "📷 Camera Issue"}
                    {!result.status && "📷 Scanner Ready"}
                </p>

                <p className="mt-2 font-semibold">{result.message}</p>

                {result.guestName && (
                    <div className="mt-4 rounded-2xl bg-white/70 p-4">
                        <p className="text-lg font-black">{result.guestName}</p>
                        <p className="text-sm">{result.email}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
"use client";

import { useEffect, useRef, useState } from "react";
import {
    BrowserMultiFormatReader,
    IScannerControls,
} from "@zxing/browser";

type ScanResult = {
    status: "success" | "duplicate" | "invalid" | "camera" | "error" | "";
    message: string;
    emailMessage?: string;
    guestName?: string;
    email?: string;
    scannedValue?: string;
};

async function readJsonResponse(response: Response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            `The check-in route returned a non-JSON response (${response.status}). Check app/api/events/[eventId]/check-in/route.ts.`,
        );
    }
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

    function stopScanner() {
        controlsRef.current?.stop();
        controlsRef.current = null;
        setScanning(false);
    }

    async function handleScan(scannedValue: string) {
        if (!scannedValue || handlingScanRef.current) return;

        handlingScanRef.current = true;
        stopScanner();

        try {
            const response = await fetch(`/api/events/${eventId}/check-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scannedValue,
                    source: "camera",
                }),
                cache: "no-store",
            });

            const data = await readJsonResponse(response);

            if (!response.ok) {
                setResult({
                    status: response.status === 404 ? "invalid" : "error",
                    message: data.error || "Unable to check in this guest.",
                    scannedValue,
                });
                return;
            }

            setResult({
                status: data.duplicate ? "duplicate" : "success",
                message: data.message || "Checked in successfully.",
                emailMessage: data.emailMessage || "",
                guestName: data.guest?.full_name,
                email: data.guest?.email,
                scannedValue,
            });
        } catch (error) {
            setResult({
                status: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Something went wrong while scanning.",
                scannedValue,
            });
        }
    }

    async function startScanner() {
        handlingScanRef.current = false;
        setResult({ status: "", message: "Starting camera..." });

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
                    device.label.toLowerCase().includes("back"),
                ) || devices[0];

            const controls = await codeReader.decodeFromVideoDevice(
                backCamera.deviceId,
                videoRef.current!,
                (decodeResult) => {
                    if (decodeResult) {
                        void handleScan(decodeResult.getText());
                    }
                },
            );

            controlsRef.current = controls;
            setScanning(true);
            setResult({
                status: "",
                message: "Scanning... Show the QR code to the camera.",
            });
        } catch (error) {
            setResult({
                status: "camera",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unable to open camera. Please allow camera permission.",
            });
        }
    }

    useEffect(() => {
        return () => stopScanner();
    }, []);

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="overflow-hidden rounded-[1.5rem] bg-slate-950 p-2.5 shadow-xl md:rounded-[2rem] md:p-4">
                <video
                    ref={videoRef}
                    className="h-[52vh] min-h-[260px] max-h-[430px] w-full rounded-[1.25rem] bg-black object-cover md:h-[420px] md:rounded-2xl"
                    muted
                    playsInline
                />
            </div>

            {!scanning ? (
                <button
                    type="button"
                    onClick={startScanner}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:opacity-90 md:px-6 md:text-base"
                >
                    Start Camera Scanner
                </button>
            ) : (
                <button
                    type="button"
                    onClick={stopScanner}
                    className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition hover:opacity-90 md:px-6 md:text-base"
                >
                    Stop Scanner
                </button>
            )}

            <div
                className={`${getResultStyle(result.status)} rounded-[1.5rem] p-5 shadow md:rounded-[2rem] md:p-6`}
            >
                <p className="text-lg font-black md:text-xl">
                    {result.status === "success" && "Verified"}
                    {result.status === "duplicate" && "Already Checked In"}
                    {result.status === "invalid" && "Invalid QR"}
                    {result.status === "camera" && "Camera Issue"}
                    {result.status === "error" && "Scan Error"}
                    {!result.status && "Scanner Ready"}
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 md:text-base">
                    {result.message}
                </p>

                {result.emailMessage && (
                    <p className="mt-2 text-sm font-semibold leading-6 opacity-90">
                        {result.emailMessage}
                    </p>
                )}

                {result.guestName && (
                    <div className="mt-4 rounded-2xl bg-white/70 p-4">
                        <p className="text-base font-black md:text-lg">
                            {result.guestName}
                        </p>
                        <p className="break-all text-sm">{result.email}</p>
                    </div>
                )}

                {result.scannedValue && result.status !== "success" && (
                    <div className="mt-4 rounded-2xl bg-white/70 p-4">
                        <p className="text-xs font-black uppercase tracking-wide opacity-70">
                            Scanned Value
                        </p>
                        <p className="mt-1 break-all text-xs font-semibold md:text-sm">
                            {result.scannedValue}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function getResultStyle(status: ScanResult["status"]) {
    if (status === "success") return "bg-green-50 text-green-700";
    if (status === "duplicate") return "bg-yellow-50 text-yellow-700";
    if (status === "invalid") return "bg-red-50 text-red-700";
    if (status === "camera") return "bg-orange-50 text-orange-700";
    if (status === "error") return "bg-red-50 text-red-700";
    return "bg-white text-slate-700";
}

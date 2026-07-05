import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const secret = process.env.EMAIL_WORKER_SECRET;

        if (!secret) {
            return NextResponse.json(
                {
                    error:
                        "Missing EMAIL_WORKER_SECRET. Add EMAIL_WORKER_SECRET to .env.local and restart npm run dev.",
                },
                { status: 500 }
            );
        }

        const workerUrl = new URL("/api/email-worker", req.url);

        const response = await fetch(workerUrl, {
            method: "POST",
            cache: "no-store",
            headers: {
                "x-worker-secret": secret,
            },
        });

        const text = await response.text();

        let result: any = {};

        try {
            result = text ? JSON.parse(text) : {};
        } catch {
            result = { raw: text };
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: "Email worker failed.",
                    details: result,
                },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            worker: result,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error?.message || "Failed to trigger email worker.",
            },
            { status: 500 }
        );
    }
}
import { NextResponse } from "next/server";
import {
    PaymentAccessError,
    requirePaymentManager,
} from "@/lib/payment-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function reply(body: Record<string, unknown>, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function fail(error: unknown) {
    return reply(
        {
            error:
                error instanceof Error
                    ? error.message
                    : "Unable to upload the banner image.",
        },
        error instanceof PaymentAccessError
            ? error.status
            : 500,
    );
}

export async function POST(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { eventId } = await context.params;
        const { actor } =
            await requirePaymentManager(eventId);
        const admin = actor.admin;

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return reply({ error: "Choose an image to upload." }, 400);
        }

        if (!file.type.startsWith("image/")) {
            return reply(
                { error: "Only image files can be uploaded." },
                400,
            );
        }

        const safeName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, "-");
        const filePath = `ticket-payments/${eventId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await admin.storage
            .from("event-images")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) {
            throw new Error(uploadError.message);
        }

        const { data } = admin.storage
            .from("event-images")
            .getPublicUrl(filePath);

        return reply({
            success: true,
            url: data.publicUrl,
        });
    } catch (error) {
        return fail(error);
    }
}

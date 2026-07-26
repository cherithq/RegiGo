import { NextResponse } from "next/server";
import { BadgeError, requireBadgeManager } from "@/lib/badges";

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
                    : "Unable to upload the image.",
        },
        error instanceof BadgeError ? error.status : 500,
    );
}

export async function POST(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        const { eventId } = await context.params;
        const configuration = await requireBadgeManager(eventId);
        const admin = configuration.actor.admin;

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return reply({ error: "Choose an image to upload." }, 400);
        }

        // pdf-lib can only embed PNG or JPEG, so badge images are limited
        // to those formats to guarantee the printed PDF matches what the
        // designer preview shows.
        if (
            file.type !== "image/png" &&
            file.type !== "image/jpeg"
        ) {
            return reply(
                {
                    error:
                        "Only PNG or JPEG images can be used on a badge.",
                },
                400,
            );
        }

        const safeName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, "-");
        const filePath = `badges/${eventId}/${Date.now()}-${safeName}`;

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

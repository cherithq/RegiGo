import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/guest-invitations";

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
                    : "Unable to upload the background image.",
        },
        500,
    );
}

export async function POST(
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) {
    try {
        await requirePermission("can_manage_event_setup");

        const { eventId } = await context.params;
        const formData = await request.formData();
        const file = formData.get("file");
        const kind =
            typeof formData.get("kind") === "string"
                ? String(formData.get("kind")).trim()
                : "background";

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
        const filePath = `${eventId}/${kind}/${Date.now()}-${safeName}`;

        const admin = getSupabaseAdminClient();

        const { error: uploadError } = await admin.storage
            .from("lucky-draw-assets")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) {
            throw new Error(uploadError.message);
        }

        const { data } = admin.storage
            .from("lucky-draw-assets")
            .getPublicUrl(filePath);

        return reply({
            success: true,
            url: data.publicUrl,
        });
    } catch (error) {
        return fail(error);
    }
}

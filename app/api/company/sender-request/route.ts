import { NextResponse } from "next/server";
import {
    CompanyModuleError,
    assertCompanyScope,
    getCompanyActor,
} from "@/lib/company-module-server";

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
                    : "Unable to manage the custom sender request.",
        },
        error instanceof CompanyModuleError ? error.status : 500,
    );
}

function text(value: unknown, max = 200) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
    try {
        const actor = await getCompanyActor();
        const body = (await request.json()) as Record<string, unknown>;

        const companyId =
            text(body.companyId) ||
            (actor.isPlatformAdmin ? "" : actor.profile.company_id || "");

        if (!companyId) {
            throw new CompanyModuleError("Choose a company.");
        }

        assertCompanyScope({ actor, companyId });

        const senderName = text(body.senderName, 160);
        const replyTo = text(body.replyTo, 320).toLowerCase();

        if (senderName.length < 2) {
            throw new CompanyModuleError(
                "Enter a sender name with at least 2 characters.",
            );
        }

        if (!isValidEmail(replyTo)) {
            throw new CompanyModuleError(
                "Enter a valid reply-to email address.",
            );
        }

        const { error } = await actor.admin
            .from("companies")
            .update({
                custom_sender_name: senderName,
                custom_sender_reply_to: replyTo,
                custom_sender_status: "pending",
                custom_sender_requested_at: new Date().toISOString(),
                custom_sender_reviewed_at: null,
                custom_sender_review_note: null,
            })
            .eq("id", companyId);

        if (error) {
            throw new CompanyModuleError(error.message);
        }

        return reply({
            success: true,
            message:
                "Custom sender request submitted. A RegiGo admin will review it shortly.",
        });
    } catch (error) {
        return fail(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const actor = await getCompanyActor();

        if (!actor.isPlatformAdmin) {
            throw new CompanyModuleError(
                "Only the platform super admin can review custom sender requests.",
                403,
            );
        }

        const body = (await request.json()) as Record<string, unknown>;
        const companyId = text(body.companyId);
        const action = text(body.action);

        if (!companyId) {
            throw new CompanyModuleError("Choose a company.");
        }

        if (action !== "approve" && action !== "reject") {
            throw new CompanyModuleError(
                "Choose a valid review action.",
            );
        }

        const reviewNote = text(body.reviewNote, 500);

        const { error } = await actor.admin
            .from("companies")
            .update({
                custom_sender_status:
                    action === "approve" ? "approved" : "rejected",
                custom_sender_reviewed_at: new Date().toISOString(),
                custom_sender_review_note: reviewNote || null,
            })
            .eq("id", companyId);

        if (error) {
            throw new CompanyModuleError(error.message);
        }

        return reply({
            success: true,
            message:
                action === "approve"
                    ? "Custom sender approved. Future emails for this company will use it."
                    : "Custom sender request rejected.",
        });
    } catch (error) {
        return fail(error);
    }
}

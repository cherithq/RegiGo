import { NextResponse } from "next/server";
import {
    InvitationError,
    getPublicInvitation,
} from "@/lib/guest-invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function response(
    body: Record<string, unknown>,
    status = 200,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control":
                "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
}

export async function POST(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            slug: string;
            token: string;
        }>;
    },
) {
    try {
        const { slug, token } = await params;
        const body = (await request.json()) as Record<
            string,
            unknown
        >;

        const answer = String(
            body.response || "",
        ).toLowerCase();

        if (
            answer !== "accepted" &&
            answer !== "declined"
        ) {
            throw new InvitationError(
                "Choose Accept or Decline.",
            );
        }

        const declineReason =
            typeof body.declineReason === "string"
                ? body.declineReason
                      .trim()
                      .slice(0, 500)
                : "";

        const { admin, invitation } =
            await getPublicInvitation({
                slug,
                token,
            });

        if (
            ["cancelled", "expired"].includes(
                invitation.status,
            )
        ) {
            throw new InvitationError(
                "This invitation is no longer active.",
                410,
            );
        }

        const event = Array.isArray(
            invitation.events,
        )
            ? invitation.events[0]
            : invitation.events;

        const allowChanges =
            event?.allow_rsvp_changes !== false;

        if (
            ["accepted", "declined"].includes(
                invitation.status,
            ) &&
            !allowChanges
        ) {
            throw new InvitationError(
                "Your RSVP response has already been recorded and cannot be changed.",
                409,
            );
        }

        const respondedAt =
            new Date().toISOString();

        const { error } = await admin
            .from("event_invitations")
            .update({
                status: answer,
                responded_at: respondedAt,
                decline_reason:
                    answer === "declined"
                        ? declineReason || null
                        : null,
            })
            .eq("id", invitation.id);

        if (error) {
            throw new InvitationError(
                error.message,
            );
        }

        return response({
            success: true,
            status: answer,
            respondedAt,
            message:
                answer === "accepted"
                    ? "Your attendance has been confirmed."
                    : "Your decline has been recorded.",
        });
    } catch (error) {
        if (error instanceof InvitationError) {
            return response(
                { error: error.message },
                error.status,
            );
        }

        return response(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to save your RSVP.",
            },
            500,
        );
    }
}

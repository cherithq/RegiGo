import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveCompanySender({
    admin,
    companyId,
    defaultFromName,
}: {
    admin: SupabaseClient;
    companyId: string | null | undefined;
    defaultFromName: string;
}): Promise<{
    fromName: string;
    replyTo: string | null;
}> {
    if (!companyId) {
        return {
            fromName: defaultFromName,
            replyTo: null,
        };
    }

    const { data: company } = await admin
        .from("companies")
        .select(
            "custom_sender_name, custom_sender_reply_to, custom_sender_status",
        )
        .eq("id", companyId)
        .maybeSingle();

    if (
        company?.custom_sender_status === "approved" &&
        company.custom_sender_name &&
        company.custom_sender_reply_to
    ) {
        return {
            fromName: company.custom_sender_name,
            replyTo: company.custom_sender_reply_to,
        };
    }

    return {
        fromName: defaultFromName,
        replyTo: null,
    };
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type TeamRole =
    | "admin"
    | "organizer"
    | "viewer"
    | "scanner";

export type TeamStatus =
    | "invited"
    | "active"
    | "suspended";

export class TeamApiError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "TeamApiError";
        this.status = status;
    }
}

export type CompanyAdminApiContext = {
    userId: string;
    companyId: string;
    companyName: string;
    ownerUserId: string | null;
    teamMemberLimit: number | null;
    supabaseServer: Awaited<
        ReturnType<typeof createSupabaseServerClient>
    >;
    supabaseAdmin: SupabaseClient;
};

export function cleanText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export function cleanEmail(value: unknown) {
    return cleanText(value).toLowerCase();
}

export function cleanRole(value: unknown): TeamRole {
    const role = cleanText(value).toLowerCase();

    if (
        role === "admin" ||
        role === "organizer" ||
        role === "viewer" ||
        role === "scanner"
    ) {
        return role;
    }

    throw new TeamApiError("Choose a valid staff role.");
}

export function cleanStatus(value: unknown): TeamStatus {
    const status = cleanText(value).toLowerCase();

    if (
        status === "invited" ||
        status === "active" ||
        status === "suspended"
    ) {
        return status;
    }

    throw new TeamApiError("Choose a valid team-member status.");
}

export function cleanIds(value: unknown) {
    if (!Array.isArray(value)) return [];

    return Array.from(
        new Set(
            value
                .filter(
                    (item): item is string =>
                        typeof item === "string" &&
                        item.trim().length > 0,
                )
                .map((item) => item.trim()),
        ),
    );
}

export async function requireCompanyAdminForApi(): Promise<CompanyAdminApiContext> {
    const supabaseServer =
        await createSupabaseServerClient();
    const db = supabaseServer as any;

    const {
        data: { user },
        error: userError,
    } = await supabaseServer.auth.getUser();

    if (userError || !user) {
        throw new TeamApiError(
            "You must be logged in.",
            401,
        );
    }

    const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("id, role, company_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        throw new TeamApiError(profileError.message, 400);
    }

    if (
        !profile ||
        profile.role !== "admin" ||
        !profile.company_id
    ) {
        throw new TeamApiError(
            "Only a company admin can manage team access.",
            403,
        );
    }

    const { data: membership, error: membershipError } = await db
        .from("company_members")
        .select("status, company_role")
        .eq("company_id", profile.company_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
        throw new TeamApiError(
            membershipError.message,
            400,
        );
    }

    if (
        !membership ||
        membership.status !== "active" ||
        !["owner", "admin"].includes(
            String(membership.company_role),
        )
    ) {
        throw new TeamApiError(
            "Your company administrator access is not active.",
            403,
        );
    }

    const { data: company, error: companyError } = await db
        .from("companies")
        .select(
            "id, company_name, owner_user_id, current_plan_id",
        )
        .eq("id", profile.company_id)
        .maybeSingle();

    if (companyError) {
        throw new TeamApiError(companyError.message, 400);
    }

    if (!company) {
        throw new TeamApiError(
            "The event company could not be found.",
            404,
        );
    }

    let teamMemberLimit: number | null = null;

    if (company.current_plan_id) {
        const { data: plan, error: planError } = await db
            .from("rental_plans")
            .select("team_member_limit")
            .eq("id", company.current_plan_id)
            .maybeSingle();

        if (planError) {
            throw new TeamApiError(planError.message, 400);
        }

        teamMemberLimit =
            typeof plan?.team_member_limit === "number"
                ? plan.team_member_limit
                : null;
    }

    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new TeamApiError(
            "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.",
            500,
        );
    }

    const supabaseAdmin = createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        },
    );

    return {
        userId: user.id,
        companyId: company.id,
        companyName: company.company_name,
        ownerUserId: company.owner_user_id,
        teamMemberLimit,
        supabaseServer,
        supabaseAdmin,
    };
}

export async function validateCompanyEvents({
    supabaseAdmin,
    companyId,
    eventIds,
}: {
    supabaseAdmin: SupabaseClient;
    companyId: string;
    eventIds: string[];
}) {
    if (eventIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("company_id", companyId)
        .in("id", eventIds);

    if (error) {
        throw new TeamApiError(error.message, 400);
    }

    const validIds = (data || []).map((row) =>
        String(row.id),
    );

    if (validIds.length !== eventIds.length) {
        throw new TeamApiError(
            "One or more selected events do not belong to this company.",
        );
    }

    return validIds;
}

export async function replaceEventAssignments({
    supabaseAdmin,
    companyId,
    profileId,
    role,
    eventIds,
}: {
    supabaseAdmin: SupabaseClient;
    companyId: string;
    profileId: string;
    role: TeamRole;
    eventIds: string[];
}) {
    const { data: companyEvents, error: eventError } =
        await supabaseAdmin
            .from("events")
            .select("id")
            .eq("company_id", companyId);

    if (eventError) {
        throw new TeamApiError(eventError.message, 400);
    }

    const companyEventIds = (companyEvents || []).map((row) =>
        String(row.id),
    );

    if (companyEventIds.length > 0) {
        const { error: deleteError } = await supabaseAdmin
            .from("event_members")
            .delete()
            .eq("profile_id", profileId)
            .in("event_id", companyEventIds);

        if (deleteError) {
            throw new TeamApiError(
                deleteError.message,
                400,
            );
        }
    }

    if (role === "admin" || eventIds.length === 0) {
        return;
    }

    const { error: insertError } = await supabaseAdmin
        .from("event_members")
        .insert(
            eventIds.map((eventId) => ({
                event_id: eventId,
                profile_id: profileId,
                role,
            })),
        );

    if (insertError) {
        throw new TeamApiError(insertError.message, 400);
    }
}

export async function syncLegacyStaff({
    supabaseAdmin,
    companyId,
    profileId,
    role,
    remove = false,
}: {
    supabaseAdmin: SupabaseClient;
    companyId: string;
    profileId: string;
    role: TeamRole;
    remove?: boolean;
}) {
    const { error: deleteError } = await supabaseAdmin
        .from("staff")
        .delete()
        .eq("company_id", companyId)
        .eq("profile_id", profileId);

    if (
        deleteError &&
        deleteError.code !== "42P01"
    ) {
        throw new TeamApiError(
            deleteError.message,
            400,
        );
    }

    if (remove || deleteError?.code === "42P01") {
        return;
    }

    const { error: insertError } = await supabaseAdmin
        .from("staff")
        .insert({
            company_id: companyId,
            profile_id: profileId,
            role,
        });

    if (
        insertError &&
        insertError.code !== "42P01"
    ) {
        throw new TeamApiError(
            insertError.message,
            400,
        );
    }
}

export async function findAuthUserByEmail(
    supabaseAdmin: SupabaseClient,
    email: string,
) {
    for (let page = 1; page <= 10; page += 1) {
        const {
            data,
            error,
        } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 100,
        });

        if (error) {
            throw new TeamApiError(error.message, 400);
        }

        const match = data.users.find(
            (user) =>
                String(user.email || "").toLowerCase() ===
                email.toLowerCase(),
        );

        if (match) return match;

        if (data.users.length < 100) break;
    }

    return null;
}

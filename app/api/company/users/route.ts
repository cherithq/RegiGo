import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    createManagedCompanyUser,
    normalizeManagedEmail,
    normalizeManagedRole,
    setManagedUserPassword,
} from "@/lib/company-user-account";
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
                    : "Unable to manage company users.",
        },
        error instanceof CompanyModuleError ? error.status : 500,
    );
}

function text(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function email(value: unknown) {
    return normalizeManagedEmail(
        value,
    );
}

function role(value: unknown) {
    return normalizeManagedRole(
        value,
    );
}

function eventMemberRole(
    value: string,
):
    | "admin"
    | "organizer"
    | "viewer"
    | "scanner" {
    const normalized =
        value === "organiser"
            ? "organizer"
            : value;

    if (
        normalized === "admin" ||
        normalized === "organizer" ||
        normalized === "viewer" ||
        normalized === "scanner"
    ) {
        return normalized;
    }

    return "viewer";
}

function ids(value: unknown) {
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    );
}

async function validCompanyEvents(admin: SupabaseClient, companyId: string, eventIds: string[]) {
    if (!eventIds.length) return [];
    const { data, error } = await admin
        .from("events")
        .select("id")
        .eq("company_id", companyId)
        .in("id", eventIds);
    if (error) throw new CompanyModuleError(error.message);
    const output = (data || []).map((item: Record<string, unknown>) => String(item.id));
    if (output.length !== eventIds.length) {
        throw new CompanyModuleError(
            "One or more selected events do not belong to this company.",
        );
    }
    return output;
}

async function replaceAssignments({
    admin,
    companyId,
    userId,
    userRole,
    eventIds,
}: {
    admin: SupabaseClient;
    companyId: string;
    userId: string;
    userRole: string;
    eventIds: string[];
}) {
    const { data: companyEvents, error: eventError } = await admin
        .from("events")
        .select("id")
        .eq("company_id", companyId);
    if (eventError) throw new CompanyModuleError(eventError.message);

    const companyEventIds = (companyEvents || []).map((item: Record<string, unknown>) => String(item.id));
    if (companyEventIds.length) {
        const { error } = await admin
            .from("event_members")
            .delete()
            .eq("profile_id", userId)
            .in("event_id", companyEventIds);
        if (error) throw new CompanyModuleError(error.message);
    }

    if (userRole !== "admin" && eventIds.length) {
        const { error } = await admin
            .from("event_members")
            .insert(
                eventIds.map((eventId) => ({
                    event_id: eventId,
                    profile_id: userId,
                    role:
                        eventMemberRole(
                            userRole,
                        ),
                })),
            );
        if (error) throw new CompanyModuleError(error.message);
    }
}

export async function GET() {
    try {
        const actor = await getCompanyActor();
        let companyQuery = actor.admin
            .from("companies")
            .select("*")
            .order("company_name", { ascending: true });
        if (!actor.isPlatformAdmin) {
            companyQuery = companyQuery.eq("id", actor.profile.company_id);
        }

        const { data: companies, error } = await companyQuery;
        if (error) throw new CompanyModuleError(error.message);

        const companyIds = (companies || []).map((item: Record<string, unknown>) => String(item.id));
        let profiles: Record<string, unknown>[] = [];
        let events: Record<string, unknown>[] = [];
        let memberships: Record<string, unknown>[] = [];
        let assignments: Record<string, unknown>[] = [];

        if (companyIds.length) {
            const [profileResult, eventResult, memberResult] = await Promise.all([
                actor.admin
                    .from("profiles")
                    .select("*")
                    .in("company_id", companyIds)
                    .order("full_name", { ascending: true }),
                actor.admin
                    .from("events")
                    .select("*")
                    .in("company_id", companyIds)
                    .order("event_name", { ascending: true }),
                actor.admin
                    .from("company_members")
                    .select("*")
                    .in("company_id", companyIds),
            ]);
            if (profileResult.error) throw new CompanyModuleError(profileResult.error.message);
            if (eventResult.error) throw new CompanyModuleError(eventResult.error.message);
            if (memberResult.error) throw new CompanyModuleError(memberResult.error.message);
            profiles = profileResult.data || [];
            events = eventResult.data || [];
            memberships = memberResult.data || [];

            // Suspended users intentionally have profiles.company_id cleared, but
            // their company_members record is retained. Load those profiles too so
            // administrators can still see and reactivate them under the company.
            const loadedProfileIds = new Set(
                profiles.map((item: Record<string, unknown>) => String(item.id)),
            );
            const missingMemberUserIds = Array.from(
                new Set(
                    memberships
                        .map((item: Record<string, unknown>) => String(item.user_id))
                        .filter((id: string) => id && !loadedProfileIds.has(id)),
                ),
            );

            if (missingMemberUserIds.length) {
                const missingProfiles = await actor.admin
                    .from("profiles")
                    .select("*")
                    .in("id", missingMemberUserIds);

                if (missingProfiles.error) {
                    throw new CompanyModuleError(missingProfiles.error.message);
                }

                profiles = [...profiles, ...(missingProfiles.data || [])];
            }

            const profileIds = profiles.map((item: Record<string, unknown>) => String(item.id));
            const eventIds = events.map((item: Record<string, unknown>) => String(item.id));
            if (profileIds.length && eventIds.length) {
                const result = await actor.admin
                    .from("event_members")
                    .select("event_id, profile_id, role")
                    .in("profile_id", profileIds)
                    .in("event_id", eventIds);
                if (result.error) throw new CompanyModuleError(result.error.message);
                assignments = result.data || [];
            }
        }

        const memberMap = new Map(
            memberships.map((item: Record<string, unknown>) => [
                `${item.company_id}:${item.user_id}`,
                item,
            ]),
        );
        const assignmentsByUser = new Map<string, string[]>();
        for (const assignment of assignments) {
            const key = String(assignment.profile_id);
            assignmentsByUser.set(key, [
                ...(assignmentsByUser.get(key) || []),
                String(assignment.event_id),
            ]);
        }

        const output = (companies || []).map((company: Record<string, unknown>) => ({
            ...company,
            events: events.filter(
                (event: Record<string, unknown>) => String(event.company_id) === String(company.id),
            ),
            users: profiles
                .filter((profile: Record<string, unknown>) => {
                    const membership = memberMap.get(
                        `${company.id}:${profile.id}`,
                    );

                    return (
                        String(profile.company_id || "") === String(company.id) ||
                        Boolean(membership)
                    );
                })
                .map((profile: Record<string, unknown>) => {
                    const membership = memberMap.get(
                        `${company.id}:${profile.id}`,
                    );
                    return {
                        ...profile,
                        membershipStatus: membership?.status || "active",
                        companyRole: membership?.company_role || "member",
                        eventIds: assignmentsByUser.get(String(profile.id)) || [],
                    };
                }),
        }));

        return reply({
            success: true,
            isPlatformAdmin: actor.isPlatformAdmin,
            currentUserId: actor.user.id,
            companies: output,
        });
    } catch (error) {
        return fail(error);
    }
}

export async function POST(
    request: Request,
) {
    let createdUserId = "";

    try {
        const actor =
            await getCompanyActor();
        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;
        const companyId =
            text(
                body.companyId,
            ) ||
            actor.profile
                .company_id;

        if (!companyId) {
            throw new CompanyModuleError(
                "Choose a company.",
            );
        }

        assertCompanyScope({
            actor,
            companyId,
        });

        const fullName =
            text(
                body.fullName,
            );
        const userEmail =
            email(
                body.email,
            );
        const userRole =
            role(
                body.role,
            );
        const password =
            typeof body.password ===
            "string"
                ? body.password
                : "";
        const eventIds =
            await validCompanyEvents(
                actor.admin,
                companyId,
                ids(
                    body.eventIds,
                ),
            );

        const created =
            await createManagedCompanyUser(
                {
                    admin:
                        actor.admin,
                    companyId,
                    fullName,
                    email:
                        userEmail,
                    password,
                    role:
                        userRole,
                    createdBy:
                        actor.user.id,
                },
            );

        createdUserId =
            created.userId;

        await replaceAssignments({
            admin:
                actor.admin,
            companyId,
            userId:
                created.userId,
            userRole,
            eventIds:
                userRole ===
                "admin"
                    ? []
                    : eventIds,
        });

        return reply(
            {
                success: true,
                userId:
                    created.userId,
                message:
                    `${created.fullName}'s account was created. They can sign in immediately using ${created.email} and the password set by the administrator.`,
            },
            201,
        );
    } catch (error) {
        if (createdUserId) {
            try {
                const actor =
                    await getCompanyActor();

                await actor.admin
                    .auth.admin
                    .deleteUser(
                        createdUserId,
                    );
            } catch {
                // Keep the original creation error.
            }
        }

        return fail(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const actor = await getCompanyActor();
        const body = (await request.json()) as Record<string, unknown>;
        const userId = text(body.userId);
        const companyId = text(body.companyId);
        if (!userId || !companyId) throw new CompanyModuleError("User and company are required.");
        assertCompanyScope({ actor, companyId });

        const fullName = text(body.fullName);
        const userRole = role(body.role);
        const status =
            text(
                body.status,
            ) ||
            "active";

        if (
            ![
                "active",
                "invited",
                "suspended",
            ].includes(
                status,
            )
        ) {
            throw new CompanyModuleError(
                "Choose a valid user status.",
            );
        }

        const newPassword =
            typeof body.newPassword ===
                "string"
                ? body.newPassword
                : "";

        const eventIds = await validCompanyEvents(
            actor.admin,
            companyId,
            ids(body.eventIds),
        );

        if (!fullName) throw new CompanyModuleError("Enter the user's full name.");

        const { error: profileError } = await actor.admin
            .from("profiles")
            .update({
                full_name: fullName,
                role: userRole,
                company_id: status === "suspended" ? null : companyId,
            })
            .eq("id", userId);
        if (profileError) throw new CompanyModuleError(profileError.message);

        const { error: memberError } = await actor.admin
            .from("company_members")
            .update({
                company_role: userRole === "admin" ? "admin" : "member",
                status,
                accepted_at: status === "active" ? new Date().toISOString() : null,
            })
            .eq("company_id", companyId)
            .eq("user_id", userId);
        if (memberError) throw new CompanyModuleError(memberError.message);

        await replaceAssignments({
            admin:
                actor.admin,
            companyId,
            userId,
            userRole,
            eventIds:
                status ===
                "suspended"
                    ? []
                    : eventIds,
        });

        if (
            newPassword
        ) {
            await setManagedUserPassword({
                admin:
                    actor.admin,
                userId,
                password:
                    newPassword,
            });
        }

        return reply({
            success: true,
            message:
                newPassword
                    ? "User access and password updated."
                    : "User access updated.",
        });
    } catch (error) {
        return fail(error);
    }
}

export async function DELETE(request: Request) {
    try {
        const actor = await getCompanyActor();
        const body = (await request.json()) as Record<string, unknown>;
        const userId = text(body.userId);
        const companyId = text(body.companyId);
        if (!userId || !companyId) throw new CompanyModuleError("User and company are required.");
        assertCompanyScope({ actor, companyId });
        if (userId === actor.user.id) {
            throw new CompanyModuleError("You cannot remove your current account.", 409);
        }

        const { data: events, error: eventError } = await actor.admin
            .from("events")
            .select("id")
            .eq("company_id", companyId);
        if (eventError) throw new CompanyModuleError(eventError.message);
        const eventIds = (events || []).map((item: Record<string, unknown>) => String(item.id));
        if (eventIds.length) {
            const { error } = await actor.admin
                .from("event_members")
                .delete()
                .eq("profile_id", userId)
                .in("event_id", eventIds);
            if (error) throw new CompanyModuleError(error.message);
        }

        const { error: memberError } = await actor.admin
            .from("company_members")
            .delete()
            .eq("company_id", companyId)
            .eq("user_id", userId);
        if (memberError) throw new CompanyModuleError(memberError.message);

        const { error: profileError } = await actor.admin
            .from("profiles")
            .update({ company_id: null })
            .eq("id", userId)
            .eq("company_id", companyId);
        if (profileError) throw new CompanyModuleError(profileError.message);

        return reply({
            success: true,
            message: "User removed from the company. The login account was not deleted.",
        });
    } catch (error) {
        return fail(error);
    }
}

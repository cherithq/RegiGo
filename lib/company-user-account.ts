import "server-only";

import type {
    SupabaseClient,
} from "@supabase/supabase-js";
import {
    CompanyModuleError,
} from "@/lib/company-module-server";

export type ManagedCompanyRole =
    | "admin"
    | "organizer"
    | "viewer"
    | "scanner";

function cleanText(
    value: unknown,
    max = 320,
) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

export function normalizeManagedRole(
    value: unknown,
): ManagedCompanyRole {
    const role =
        cleanText(
            value,
            30,
        ).toLowerCase();

    if (
        role === "admin" ||
        role === "organizer" ||
        role === "viewer" ||
        role === "scanner"
    ) {
        return role;
    }

    throw new CompanyModuleError(
        "Choose a valid role.",
    );
}

export function normalizeManagedEmail(
    value: unknown,
) {
    return cleanText(
        value,
        320,
    ).toLowerCase();
}

export function validateManagedPassword(
    value: unknown,
) {
    const password =
        typeof value === "string"
            ? value
            : "";

    if (
        password.length < 8
    ) {
        throw new CompanyModuleError(
            "Password must be at least 8 characters.",
        );
    }

    if (
        password.length > 128
    ) {
        throw new CompanyModuleError(
            "Password cannot exceed 128 characters.",
        );
    }

    if (
        !/[A-Za-z]/.test(
            password,
        ) ||
        !/[0-9]/.test(
            password,
        )
    ) {
        throw new CompanyModuleError(
            "Password must contain at least one letter and one number.",
        );
    }

    return password;
}

export async function createManagedCompanyUser({
    admin,
    companyId,
    fullName,
    email,
    password,
    role,
    createdBy,
}: {
    admin: SupabaseClient;
    companyId: string;
    fullName: string;
    email: string;
    password: string;
    role: ManagedCompanyRole;
    createdBy: string;
}) {
    const normalizedName =
        cleanText(
            fullName,
            160,
        );
    const normalizedEmail =
        normalizeManagedEmail(
            email,
        );
    const validatedPassword =
        validateManagedPassword(
            password,
        );

    if (
        normalizedName.length <
        2
    ) {
        throw new CompanyModuleError(
            "Enter the user's full name.",
        );
    }

    if (
        !normalizedEmail.includes(
            "@",
        )
    ) {
        throw new CompanyModuleError(
            "Enter a valid email address.",
        );
    }

    const {
        data: existingProfile,
        error: profileLookupError,
    } = await admin
        .from("profiles")
        .select(
            "id, email, company_id",
        )
        .ilike(
            "email",
            normalizedEmail,
        )
        .limit(1)
        .maybeSingle();

    if (
        profileLookupError
    ) {
        throw new CompanyModuleError(
            profileLookupError.message,
        );
    }

    if (
        existingProfile
    ) {
        throw new CompanyModuleError(
            "An account already exists for this email address.",
            409,
        );
    }

    const {
        data: authResult,
        error: authError,
    } =
        await admin.auth.admin
            .createUser({
                email:
                    normalizedEmail,
                password:
                    validatedPassword,
                email_confirm:
                    true,
                user_metadata: {
                    full_name:
                        normalizedName,
                    role,
                    company_id:
                        companyId,
                    onboarding_complete:
                        true,
                    account_created_by_admin:
                        true,
                },
            });

    if (
        authError ||
        !authResult.user
    ) {
        throw new CompanyModuleError(
            authError?.message ||
                "Unable to create the user account.",
            authError?.status ===
                422
                ? 409
                : 400,
        );
    }

    const userId =
        authResult.user.id;
    const now =
        new Date().toISOString();

    try {
        const {
            error: profileError,
        } = await admin
            .from("profiles")
            .upsert(
                {
                    id: userId,
                    full_name:
                        normalizedName,
                    email:
                        normalizedEmail,
                    role,
                    platform_role:
                        null,
                    company_id:
                        companyId,
                    created_at: now,
                },
                {
                    onConflict:
                        "id",
                },
            );

        if (profileError) {
            throw new CompanyModuleError(
                profileError.message,
            );
        }

        const {
            error: memberError,
        } = await admin
            .from(
                "company_members",
            )
            .upsert(
                {
                    company_id:
                        companyId,
                    user_id:
                        userId,
                    company_role:
                        role ===
                        "admin"
                            ? "admin"
                            : "member",
                    status:
                        "active",
                    invited_by:
                        createdBy,
                    invited_at:
                        now,
                    accepted_at:
                        now,
                    updated_at:
                        now,
                },
                {
                    onConflict:
                        "company_id,user_id",
                },
            );

        if (memberError) {
            throw new CompanyModuleError(
                memberError.message,
            );
        }

        return {
            userId,
            email:
                normalizedEmail,
            fullName:
                normalizedName,
            role,
        };
    } catch (error) {
        await admin.auth.admin
            .deleteUser(
                userId,
            );

        throw error;
    }
}

export async function setManagedUserPassword({
    admin,
    userId,
    password,
}: {
    admin: SupabaseClient;
    userId: string;
    password: string;
}) {
    const validatedPassword =
        validateManagedPassword(
            password,
        );

    const {
        error,
    } =
        await admin.auth.admin
            .updateUserById(
                userId,
                {
                    password:
                        validatedPassword,
                },
            );

    if (error) {
        throw new CompanyModuleError(
            error.message,
        );
    }
}

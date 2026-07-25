import "server-only";

import type {
    SupabaseClient,
} from "@supabase/supabase-js";
import {
    CompanyModuleError,
} from "@/lib/company-module-server";

export type CreatedCompanyAdministrator = {
    userId: string;
    email: string;
    fullName: string;
};

function cleanText(
    value: unknown,
    max = 320,
) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

export function cleanCompanyAdminEmail(
    value: unknown,
) {
    return cleanText(
        value,
        320,
    ).toLowerCase();
}

export function validateCompanyAdminPassword(
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
            "The company administrator password must be at least 8 characters.",
        );
    }

    if (
        password.length > 128
    ) {
        throw new CompanyModuleError(
            "The company administrator password cannot exceed 128 characters.",
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
            "The company administrator password must contain at least one letter and one number.",
        );
    }

    return password;
}

export async function createCompanyAdministrator({
    admin,
    companyId,
    fullName,
    email,
    password,
    createdBy,
}: {
    admin: SupabaseClient;
    companyId: string;
    fullName: string;
    email: string;
    password: string;
    createdBy: string;
}): Promise<CreatedCompanyAdministrator> {
    const normalizedName =
        cleanText(
            fullName,
            160,
        );
    const normalizedEmail =
        cleanCompanyAdminEmail(
            email,
        );
    const validatedPassword =
        validateCompanyAdminPassword(
            password,
        );

    if (
        normalizedName.length <
        2
    ) {
        throw new CompanyModuleError(
            "Enter the company administrator's full name.",
        );
    }

    if (
        !normalizedEmail.includes(
            "@",
        )
    ) {
        throw new CompanyModuleError(
            "Enter a valid company administrator email.",
        );
    }

    const {
        data: existingProfile,
        error:
            existingProfileError,
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
        existingProfileError
    ) {
        throw new CompanyModuleError(
            existingProfileError.message,
        );
    }

    if (existingProfile) {
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
                    role: "admin",
                    company_id:
                        companyId,
                    onboarding_complete:
                        true,
                    account_created_by_platform_admin:
                        true,
                },
            });

    if (
        authError ||
        !authResult.user
    ) {
        throw new CompanyModuleError(
            authError?.message ||
                "Unable to create the company administrator account.",
            authError?.status ===
                422
                ? 409
                : 400,
        );
    }

    const userId =
        authResult.user.id;

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
                    role: "admin",
                    platform_role:
                        null,
                    company_id:
                        companyId,
                    created_at:
                        new Date().toISOString(),
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
                        "admin",
                    status:
                        "active",
                    invited_by:
                        createdBy,
                    invited_at:
                        new Date().toISOString(),
                    accepted_at:
                        new Date().toISOString(),
                    updated_at:
                        new Date().toISOString(),
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

        const {
            error: companyError,
        } = await admin
            .from("companies")
            .update({
                owner_user_id:
                    userId,
                updated_at:
                    new Date().toISOString(),
            })
            .eq("id", companyId);

        if (companyError) {
            throw new CompanyModuleError(
                companyError.message,
            );
        }

        return {
            userId,
            email:
                normalizedEmail,
            fullName:
                normalizedName,
        };
    } catch (error) {
        await admin.auth.admin
            .deleteUser(
                userId,
            );

        throw error;
    }
}

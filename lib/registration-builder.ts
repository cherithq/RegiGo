import "server-only";

import {
    createClient,
} from "@supabase/supabase-js";
import {
    createSupabaseServerClient,
} from "@/lib/supabase-server";

export class RegistrationBuilderError extends Error {
    status: number;

    constructor(
        message: string,
        status = 400,
    ) {
        super(message);
        this.name =
            "RegistrationBuilderError";
        this.status = status;
    }
}

function canonicalRole(
    value: unknown,
) {
    const role =
        String(value || "")
            .trim()
            .toLowerCase();

    if (
        [
            "admin",
            "administrator",
            "company_admin",
            "company-admin",
            "owner",
        ].includes(role)
    ) {
        return "admin";
    }

    if (
        [
            "organizer",
            "organiser",
            "manager",
            "event_manager",
            "event-manager",
        ].includes(role)
    ) {
        return "organizer";
    }

    return "viewer";
}

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new RegistrationBuilderError(
            "Supabase service-role configuration is missing.",
            500,
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

export async function getRegistrationBuilderContext(
    eventId: string,
) {
    const server =
        await createSupabaseServerClient();
    const {
        data: {
            user,
        },
        error: authError,
    } =
        await server.auth
            .getUser();

    if (
        authError ||
        !user
    ) {
        throw new RegistrationBuilderError(
            "You must be logged in.",
            401,
        );
    }

    const admin =
        adminClient();

    const [
        profileResult,
        eventResult,
        membershipResult,
        eventSettingsResult,
    ] = await Promise.all([
        admin
            .from("profiles")
            .select(
                "id, role, platform_role, company_id, full_name, email",
            )
            .eq(
                "id",
                user.id,
            )
            .maybeSingle(),

        admin
            .from("events")
            .select(
                "id, company_id, event_name, event_slug, status, registration_open",
            )
            .eq(
                "id",
                eventId,
            )
            .maybeSingle(),

        admin
            .from(
                "company_members",
            )
            .select(
                "company_id, company_role, status",
            )
            .eq(
                "user_id",
                user.id,
            )
            .eq(
                "status",
                "active",
            ),

        admin
            .from(
                "event_settings",
            )
            .select(
                "registration_mode",
            )
            .eq(
                "event_id",
                eventId,
            )
            .maybeSingle(),
    ]);
    const isInvitationOnly =
        eventSettingsResult.data
            ?.registration_mode ===
        "invitation_only";

    if (
        profileResult.error
    ) {
        throw new RegistrationBuilderError(
            profileResult.error
                .message,
        );
    }

    if (
        eventResult.error ||
        !eventResult.data
    ) {
        throw new RegistrationBuilderError(
            eventResult.error
                ?.message ||
                "Event not found.",
            eventResult.error
                ? 400
                : 404,
        );
    }

    const profile =
        profileResult.data;
    const event =
        eventResult.data;
    const platformRole =
        String(
            profile
                ?.platform_role ||
                "",
        ).toLowerCase();
    const isPlatformAdmin =
        [
            "super_admin",
            "super-admin",
            "platform_admin",
            "platform-admin",
        ].includes(
            platformRole,
        );

    const membership =
        (
            membershipResult.data ||
            []
        ).find(
            (item) =>
                String(
                    item.company_id,
                ) ===
                String(
                    event.company_id,
                ),
        );

    const role =
        canonicalRole(
            membership
                ?.company_role ||
                profile?.role,
        );
    const sameCompany =
        String(
            profile
                ?.company_id ||
                membership
                    ?.company_id ||
                "",
        ) ===
        String(
            event.company_id ||
                "",
        );

    let assigned = false;

    if (
        role ===
        "organizer"
    ) {
        const {
            data,
            error,
        } = await admin
            .from(
                "event_members",
            )
            .select(
                "event_id",
            )
            .eq(
                "event_id",
                eventId,
            )
            .eq(
                "profile_id",
                user.id,
            )
            .maybeSingle();

        if (
            error &&
            ![
                "42P01",
                "PGRST205",
            ].includes(
                String(
                    error.code ||
                        "",
                ),
            )
        ) {
            throw new RegistrationBuilderError(
                error.message,
            );
        }

        assigned =
            Boolean(data);
    }

    const allowed =
        isPlatformAdmin ||
        (
            sameCompany &&
            (
                role ===
                    "admin" ||
                (
                    role ===
                        "organizer" &&
                    assigned
                )
            )
        );

    if (!allowed) {
        throw new RegistrationBuilderError(
            "Your account cannot manage this event's registration form.",
            403,
        );
    }

    const {
        data: formId,
        error:
            seedError,
    } = await admin.rpc(
        "regigo_seed_registration_form_v1",
        {
            p_event_id:
                eventId,
        },
    );

    if (seedError) {
        throw new RegistrationBuilderError(
            `${seedError.message}. Run the registration-builder migration first.`,
            500,
        );
    }

    const {
        data: form,
        error:
            formError,
    } = await admin
        .from(
            "registration_forms",
        )
        .select("*")
        .eq(
            "id",
            formId,
        )
        .single();

    if (
        formError ||
        !form
    ) {
        throw new RegistrationBuilderError(
            formError?.message ||
                "Registration form could not be created.",
            500,
        );
    }

    const {
        data: fields,
        error:
            fieldsError,
    } = await admin
        .from(
            "registration_fields",
        )
        .select("*")
        .eq(
            "form_id",
            form.id,
        )
        .order(
            "sort_order",
            {
                ascending:
                    true,
            },
        );

    if (fieldsError) {
        throw new RegistrationBuilderError(
            fieldsError.message,
        );
    }

    return {
        user,
        profile,
        event,
        form,
        fields:
            fields || [],
        isPlatformAdmin,
        isInvitationOnly,
        role,
    };
}

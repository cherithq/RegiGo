export type RentalType = "per_event" | "annual";

export type RentalPlanFeatures = {
    email_centre?: boolean;
    payments?: boolean;
    guest_table_selection?: boolean;
    badge_designer?: boolean;
    lucky_draw?: boolean;
    tournament?: boolean;
    [key: string]: boolean | undefined;
};

export type RentalPlanRecord = {
    id: string;
    code: string;
    plan_name: string;
    rental_type: RentalType;
    event_limit: number | null;
    team_member_limit: number | null;
    features: RentalPlanFeatures | null;
    is_active: boolean;
};

export function cleanPlanFeatures(
    input: unknown,
): RentalPlanFeatures {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return {};
    }

    const source = input as Record<string, unknown>;
    const output: RentalPlanFeatures = {};

    for (const [key, value] of Object.entries(source)) {
        if (typeof value === "boolean") {
            output[key] = value;
        }
    }

    return output;
}

export function isFeatureAllowed(
    features: RentalPlanFeatures | null | undefined,
    feature: string,
) {
    return features?.[feature] === true;
}

export function formatPlanLimit(value: number | null | undefined) {
    return value == null ? "Unlimited" : String(value);
}

export function formatRentalType(type: RentalType | null | undefined) {
    return type === "per_event" ? "Per-event rental" : "Annual rental";
}

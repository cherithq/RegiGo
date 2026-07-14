export type RegistrationFieldOptions = {
    placeholder?: string;
    help_text?: string;
    choices?: string[];
    choice_images?: Record<string, string>;
    choice_descriptions?: Record<string, string>;
    choice_sub_fields?: Record<string, unknown[]>;
    image_choices?: unknown[];
    country_codes?: string[];
    default_country_code?: string;
    validation?: Record<string, unknown>;
    [key: string]: unknown;
};

type FieldWithOptions = {
    field_options?: unknown;
    options?: unknown;
};

function parseObject(value: unknown): Record<string, unknown> {
    if (!value) return {};

    if (
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value as Record<string, unknown>;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) return {};

        try {
            const parsed = JSON.parse(trimmed);

            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
            ) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return {};
        }
    }

    return {};
}

function normaliseChoices(value: unknown): string[] {
    if (Array.isArray(value)) {
        return Array.from(
            new Set(
                value
                    .map((item) => {
                        if (typeof item === "string") {
                            return item.trim();
                        }

                        if (
                            item &&
                            typeof item === "object"
                        ) {
                            const record = item as Record<string, unknown>;
                            return String(
                                record.label ??
                                    record.value ??
                                    ""
                            ).trim();
                        }

                        return String(item ?? "").trim();
                    })
                    .filter(Boolean)
            )
        );
    }

    if (typeof value === "string") {
        return Array.from(
            new Set(
                value
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean)
            )
        );
    }

    return [];
}

/**
 * Reads both the new `field_options` column and the old `options` column.
 *
 * Important:
 * An empty object `{}` is truthy in JavaScript. Therefore this is wrong:
 *
 *     field.field_options || field.options || {}
 *
 * It can hide populated legacy options when `field_options` is `{}`.
 */
export function getRegistrationFieldOptions(
    field: FieldWithOptions
): RegistrationFieldOptions {
    const legacy = parseObject(field.options);
    const current = parseObject(field.field_options);

    const merged: RegistrationFieldOptions = {
        ...legacy,
        ...current,
    };

    const choiceSource =
        current.choices ??
        legacy.choices ??
        current.dropdown_options ??
        legacy.dropdown_options ??
        current.values ??
        legacy.values ??
        current.items ??
        legacy.items;

    const choices = normaliseChoices(choiceSource);

    if (choices.length > 0) {
        merged.choices = choices;
    } else if (!Array.isArray(merged.choices)) {
        merged.choices = [];
    }

    return merged;
}
import {
    cleanModuleMap,
    companyModuleKeys,
    defaultCompanyModules,
    isCompanyModuleKey,
    type CompanyModuleKey,
} from "@/lib/company-modules";

export type EventModuleKey = CompanyModuleKey;

export const eventModuleKeys = companyModuleKeys;

export const defaultOrganizerEnabledModules = {
    ...defaultCompanyModules,
};

export function isEventModuleKey(
    value: unknown,
): value is EventModuleKey {
    return isCompanyModuleKey(value);
}

export function cleanOrganizerEnabledModules(
    input: unknown,
): Record<EventModuleKey, boolean> {
    return cleanModuleMap(input);
}

export function canRoleSeeEventModule({
    role,
    enabledModules,
    moduleKey,
}: {
    role:
        | "admin"
        | "organizer"
        | "organiser"
        | "viewer"
        | "scanner"
        | string
        | null
        | undefined;
    enabledModules: Record<EventModuleKey, boolean>;
    moduleKey?: EventModuleKey | null;
}) {
    if (!moduleKey) return true;
    return enabledModules[moduleKey] !== false;
}

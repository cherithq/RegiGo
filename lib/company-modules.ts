export type CompanyModuleKey =
    | "overview"
    | "guests"
    | "invitations"
    | "tickets"
    | "payments"
    | "tables"
    | "table_selection"
    | "floor_plan"
    | "speakers"
    | "agenda"
    | "scanner"
    | "checkin_printing"
    | "lucky_draw"
    | "tournament"
    | "analytics"
    | "registration"
    | "website"
    | "branding"
    | "emails"
    | "badges"
    | "addons"
    | "settings"
    | "lucky_draw_settings"
    | "direct_printing"
    | "create_events"
    | "manage_users"
    | "manage_roles"
    | "stripe_setup"
    | "workspace_settings";

export type CompanyUserRole =
    | "admin"
    | "organizer"
    | "organiser"
    | "viewer"
    | "scanner";

export type CanonicalCompanyUserRole =
    | "admin"
    | "organizer"
    | "viewer"
    | "scanner";

export type ModuleDefinition = {
    key: CompanyModuleKey;
    label: string;
    description: string;
    group:
        | "Workspace"
        | "Event Day"
        | "Marketing"
        | "Revenue"
        | "Advanced"
        | "Administration"
        | "Company Management";
};

export const companyModuleCatalog: ModuleDefinition[] = [
    {
        key: "overview",
        label: "Event Overview",
        description: "Event dashboard, progress and summary cards.",
        group: "Workspace",
    },
    {
        key: "guests",
        label: "Guest List",
        description: "Guest records, import, search and editing.",
        group: "Workspace",
    },
    {
        key: "invitations",
        label: "Invitations & RSVP",
        description: "Personalised invitations and RSVP tracking.",
        group: "Marketing",
    },
    {
        key: "tickets",
        label: "Ticket Types",
        description: "Free and paid ticket categories and inventory.",
        group: "Revenue",
    },
    {
        key: "payments",
        label: "Tickets & Payments",
        description: "Stripe Checkout, company payouts and orders.",
        group: "Revenue",
    },
    {
        key: "tables",
        label: "Tables",
        description: "Event tables, capacities and assignments.",
        group: "Workspace",
    },
    {
        key: "table_selection",
        label: "Guest Table Selection",
        description: "Self-service table choice with capacity protection.",
        group: "Advanced",
    },
    {
        key: "floor_plan",
        label: "Floor Plan",
        description: "Visual table and venue layout tools.",
        group: "Workspace",
    },
    {
        key: "speakers",
        label: "Speakers",
        description: "Speaker records and public profiles.",
        group: "Workspace",
    },
    {
        key: "agenda",
        label: "Programme",
        description: "Programme items and event timeline.",
        group: "Workspace",
    },
    {
        key: "scanner",
        label: "QR Scanner",
        description: "QR verification and event check-in.",
        group: "Event Day",
    },
    {
        key: "checkin_printing",
        label: "Check-in & Printing",
        description: "Fast guest lookup, check-in and badge printing.",
        group: "Event Day",
    },
    {
        key: "lucky_draw",
        label: "Lucky Draw",
        description: "Live prize draws for eligible guests.",
        group: "Event Day",
    },
    {
        key: "tournament",
        label: "Tournament",
        description: "Multi-round event tournament control.",
        group: "Event Day",
    },
    {
        key: "analytics",
        label: "Analytics",
        description: "Registration, attendance and event reporting.",
        group: "Event Day",
    },
    {
        key: "registration",
        label: "Registration Builder",
        description: "Public registration fields and form configuration.",
        group: "Marketing",
    },
    {
        key: "website",
        label: "Website Builder",
        description: "Public event landing-page content.",
        group: "Marketing",
    },
    {
        key: "branding",
        label: "Branding",
        description: "Event colours, logo and visual identity.",
        group: "Marketing",
    },
    {
        key: "emails",
        label: "Email Centre",
        description: "Templates, reminders and event messages.",
        group: "Marketing",
    },
    {
        key: "badges",
        label: "Badge Designer",
        description: "Badge templates, QR merge fields and PDFs.",
        group: "Advanced",
    },
    {
        key: "direct_printing",
        label: "Direct Badge Printing",
        description: "Print through a browser-connected local printer.",
        group: "Advanced",
    },
    {
        key: "addons",
        label: "Add-ons",
        description: "Enable optional features for each event.",
        group: "Administration",
    },
    {
        key: "settings",
        label: "Event Settings",
        description: "Registration status and event module controls.",
        group: "Administration",
    },
    {
        key: "lucky_draw_settings",
        label: "Lucky Draw Settings",
        description: "Prize and eligibility configuration.",
        group: "Administration",
    },
    {
        key: "create_events",
        label: "Create Events",
        description: "Create new events for the company.",
        group: "Company Management",
    },
    {
        key: "manage_users",
        label: "Users & Permissions",
        description: "Create company accounts and assign events.",
        group: "Company Management",
    },
    {
        key: "manage_roles",
        label: "Roles & Permissions",
        description: "Edit module access for company roles.",
        group: "Company Management",
    },
    {
        key: "stripe_setup",
        label: "Stripe Payment Setup",
        description: "Connect and manage the company's own Stripe account.",
        group: "Company Management",
    },
    {
        key: "workspace_settings",
        label: "Workspace Settings",
        description: "Manage company-level workspace configuration.",
        group: "Company Management",
    },
];

export const companyModuleKeys =
    companyModuleCatalog.map(
        (module) => module.key,
    );

export const defaultCompanyModules:
    Record<CompanyModuleKey, boolean> =
    Object.fromEntries(
        companyModuleKeys.map(
            (key) => [key, true],
        ),
    ) as Record<CompanyModuleKey, boolean>;

const organizerDefaultOff =
    new Set<CompanyModuleKey>([
        "settings",
        "manage_users",
        "manage_roles",
        "stripe_setup",
        "workspace_settings",
    ]);

const viewerDefaultOn =
    new Set<CompanyModuleKey>([
        "overview",
        "analytics",
    ]);

const scannerDefaultOn =
    new Set<CompanyModuleKey>([
        "overview",
        "scanner",
        "checkin_printing",
        "lucky_draw",
        "tournament",
    ]);

export function normalizeCompanyRole(
    role: CompanyUserRole | string,
): CanonicalCompanyUserRole {
    const clean =
        String(role)
            .trim()
            .toLowerCase();

    if (
        clean === "admin" ||
        clean === "administrator" ||
        clean === "company_admin" ||
        clean === "company-admin" ||
        clean === "owner" ||
        clean === "super_admin" ||
        clean === "super-admin"
    ) {
        return "admin";
    }

    if (
        clean === "organizer" ||
        clean === "organiser" ||
        clean === "manager" ||
        clean === "event_manager" ||
        clean === "event-manager"
    ) {
        return "organizer";
    }

    if (
        clean === "scanner" ||
        clean === "checkin" ||
        clean === "check_in" ||
        clean === "check-in"
    ) {
        return "scanner";
    }

    if (clean === "viewer") {
        return "viewer";
    }

    return "viewer";
}

export function defaultRoleModules(
    role: CompanyUserRole | string,
): Record<CompanyModuleKey, boolean> {
    const normalized =
        normalizeCompanyRole(role);

    if (normalized === "admin") {
        return {
            ...defaultCompanyModules,
        };
    }

    if (normalized === "viewer") {
        return Object.fromEntries(
            companyModuleKeys.map(
                (key) => [
                    key,
                    viewerDefaultOn.has(
                        key,
                    ),
                ],
            ),
        ) as Record<CompanyModuleKey, boolean>;
    }

    if (normalized === "scanner") {
        return Object.fromEntries(
            companyModuleKeys.map(
                (key) => [
                    key,
                    scannerDefaultOn.has(
                        key,
                    ),
                ],
            ),
        ) as Record<CompanyModuleKey, boolean>;
    }

    return Object.fromEntries(
        companyModuleKeys.map(
            (key) => [
                key,
                !organizerDefaultOff.has(
                    key,
                ),
            ],
        ),
    ) as Record<CompanyModuleKey, boolean>;
}

export function isCompanyModuleKey(
    value: unknown,
): value is CompanyModuleKey {
    return (
        typeof value === "string" &&
        companyModuleKeys.includes(
            value as CompanyModuleKey,
        )
    );
}

export function cleanModuleMap(
    value: unknown,
    fallback:
        Record<CompanyModuleKey, boolean> =
        defaultCompanyModules,
): Record<CompanyModuleKey, boolean> {
    const output = {
        ...fallback,
    };

    let record:
        Record<string, unknown>;

    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        record =
            value as Record<string, unknown>;
    } else if (
        typeof value === "string"
    ) {
        try {
            const parsed =
                JSON.parse(value);

            record =
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
                    ? parsed
                    : {};
        } catch {
            record = {};
        }
    } else {
        record = {};
    }

    for (const key of
        companyModuleKeys) {
        if (
            typeof record[key] ===
            "boolean"
        ) {
            output[key] =
                record[key] as boolean;
        }
    }

    return output;
}

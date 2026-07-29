import type { CompanyModuleKey } from "@/lib/company-modules";

export type RegistrationMode =
    | "public_registration"
    | "invitation_only";

export type EventModuleGroup = {
    eyebrow: string;
    title: string;
    description: string;
    keys: CompanyModuleKey[];
};

// Mirrors the three sections on the event overview page
// (app/dashboard/events/[eventId]/page.tsx: managementCards / eventDayCards /
// administrationCards — eyebrow/title/description copied verbatim from
// WorkspaceSection's props there) so the module pickers on the event
// creation and event settings pages group modules the same way. Kept as a
// separate copy rather than importing from the overview page itself, since
// that file's arrays also carry href/icon/moduleKey wiring specific to
// navigation cards that doesn't apply to a toggle picker.
export const EVENT_MODULE_GROUPS: EventModuleGroup[] =
    [
        {
            eyebrow: "Operations",
            title: "Event Management",
            description:
                "Guest, invitation, ticket, payment, seating and programme tools.",
            keys: [
                "guests",
                "invitations",
                "payments",
                "tables",
                "table_selection",
                "floor_plan",
                "speakers",
                "agenda",
            ],
        },
        {
            eyebrow: "Event Day",
            title: "Live Event Tools",
            description:
                "Check-in, badge printing, lucky draw, tournament, Zoom broadcast and analytics operations.",
            keys: [
                "scanner",
                "checkin_printing",
                "badges",
                "lucky_draw",
                "tournament",
                "zoom_broadcast",
                "analytics",
            ],
        },
        {
            eyebrow: "Administration",
            title: "Event Setup",
            description:
                "Website, branding, email, badges, add-ons and settings.",
            keys: [
                "registration",
                "website",
                "branding",
                "emails",
                "addons",
                "lucky_draw_settings",
            ],
        },
    ];

// Per-module label/description overrides, copied from the bespoke card copy
// on the overview page's cards rather than the more generic catalog text in
// lib/company-modules.ts. Modules not listed here (company-management-only
// modules, or ones the overview page doesn't surface as its own card) fall
// back to the catalog's label/description untouched.
export const EVENT_MODULE_TEXT: Partial<
    Record<
        CompanyModuleKey,
        {
            label: string;
            description: string;
        }
    >
> = {
    guests: {
        label: "Guest List",
        description:
            "View, search and manage registered guests.",
    },
    invitations: {
        label: "Invitations & RSVP",
        description:
            "Send personalised invitations and track responses.",
    },
    payments: {
        label: "Tickets & Payments",
        description:
            "Review ticket orders, payments and company payouts.",
    },
    tables: {
        label: "Tables",
        description:
            "Create event tables and assign guests.",
    },
    table_selection: {
        label: "Guest Table Selection",
        description:
            "Let eligible guests choose an available table.",
    },
    floor_plan: {
        label: "Floor Plan",
        description:
            "Arrange table layout and seating flow visually.",
    },
    speakers: {
        label: "Speakers",
        description:
            "Manage event speakers and speaker details.",
    },
    agenda: {
        label: "Programme",
        description:
            "Build the programme and event timeline.",
    },
    scanner: {
        label: "QR Scanner",
        description:
            "Scan guest QR codes and record check-ins.",
    },
    checkin_printing: {
        label: "Check-in & Printing",
        description:
            "Run the browser print station and print badges after check-in.",
    },
    badges: {
        label: "Badge Designer",
        description:
            "Design and print badges using guest and QR data.",
    },
    lucky_draw: {
        label: "Lucky Draw",
        description:
            "Run live prize draws using eligible checked-in guests.",
    },
    tournament: {
        label: "Tournament",
        description:
            "Manage tournament rounds, players and live progression.",
    },
    analytics: {
        label: "Analytics",
        description:
            "View attendance, registration and table insights.",
    },
    registration: {
        label: "Registration Builder",
        description:
            "Create and manage registration form fields.",
    },
    website: {
        label: "Website Builder",
        description:
            "Customise the public event website.",
    },
    branding: {
        label: "Branding",
        description:
            "Manage event colours, logo and visual identity.",
    },
    emails: {
        label: "Email Centre",
        description:
            "Create templates, reminders and event messages.",
    },
    addons: {
        label: "Settings & Add-ons",
        description:
            "Manage event details, registration, modules and optional features in one place.",
    },
    lucky_draw_settings: {
        label: "Lucky Draw Settings",
        description:
            "Manage prize and eligibility configuration.",
    },
    zoom_broadcast: {
        label: "Zoom Broadcast",
        description:
            "Create a Zoom meeting and send the join link to registered and RSVP'd guests.",
    },
};

// Guest Access Method already forces `enabledModules.invitations` to match
// mode server-side (lib/event-configuration.ts, app/api/events/create/route.ts)
// — a picker showing this module as independently toggleable while
// invitation_only would be misleading, since any change reverts on save.
export function isEventModuleForcedOn(
    key: CompanyModuleKey,
    registrationMode: RegistrationMode,
): boolean {
    return (
        key === "invitations" &&
        registrationMode ===
            "invitation_only"
    );
}

// Same label/description swap the overview page applies to this one module
// depending on mode (guests answer RSVP questions rather than filling out a
// public form), layered on top of the overview-matching text above.
export function eventModuleDisplay(
    moduleItem: {
        key: CompanyModuleKey;
        label: string;
        description: string;
    },
    registrationMode: RegistrationMode,
): {
    label: string;
    description: string;
} {
    if (
        moduleItem.key ===
            "registration" &&
        registrationMode ===
            "invitation_only"
    ) {
        return {
            label: "RSVP Guest Fields",
            description:
                "Create and manage the questions RSVP guests answer when accepting.",
        };
    }

    if (
        moduleItem.key ===
            "invitations" &&
        registrationMode ===
            "invitation_only"
    ) {
        return {
            label: "Invitations & RSVP",
            description:
                "Always on for Invitation & RSVP events — send personalised invitations and track responses.",
        };
    }

    return (
        EVENT_MODULE_TEXT[
            moduleItem.key
        ] ?? {
            label: moduleItem.label,
            description:
                moduleItem.description,
        }
    );
}

export type EventModuleKey =
  | "overview"
  | "guests"
  | "tickets"
  | "tables"
  | "floor_plan"
  | "speakers"
  | "agenda"
  | "scanner"
  | "lucky_draw"
  | "analytics"
  | "registration"
  | "website"
  | "branding"
  | "emails"
  | "settings"
  | "lucky_draw_settings";

export const eventModuleKeys: EventModuleKey[] = [
  "overview",
  "guests",
  "tickets",
  "tables",
  "floor_plan",
  "speakers",
  "agenda",
  "scanner",
  "lucky_draw",
  "analytics",
  "registration",
  "website",
  "branding",
  "emails",
  "settings",
  "lucky_draw_settings",
];

export const defaultOrganizerEnabledModules: Record<EventModuleKey, boolean> = {
  overview: true,
  guests: true,
  tickets: true,
  tables: true,
  floor_plan: true,
  speakers: true,
  agenda: true,
  scanner: true,
  lucky_draw: true,
  analytics: true,
  registration: true,
  website: true,
  branding: true,
  emails: true,
  settings: true,
  lucky_draw_settings: true,
};

export function isEventModuleKey(value: unknown): value is EventModuleKey {
  return typeof value === "string" && eventModuleKeys.includes(value as EventModuleKey);
}

export function cleanOrganizerEnabledModules(
  input: unknown,
): Record<EventModuleKey, boolean> {
  const output: Record<EventModuleKey, boolean> = {
    ...defaultOrganizerEnabledModules,
  };

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return output;
  }

  const record = input as Record<string, unknown>;

  for (const key of eventModuleKeys) {
    if (typeof record[key] === "boolean") {
      output[key] = record[key] as boolean;
    }
  }

  // Required modules. Admin is never affected by this anyway, but these stay on
  // so organisers do not lose the event landing page or settings/status page.
  output.overview = true;
  output.settings = true;

  return output;
}

export function canRoleSeeEventModule({
  role,
  enabledModules,
  moduleKey,
}: {
  role: "admin" | "organizer" | "viewer" | "scanner" | string | null | undefined;
  enabledModules: Record<EventModuleKey, boolean>;
  moduleKey?: EventModuleKey | null;
}) {
  if (role === "admin") return true;
  if (!moduleKey) return true;
  return enabledModules[moduleKey] !== false;
}

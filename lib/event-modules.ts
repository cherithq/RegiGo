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
  | "glitter_games"
  | "glitter_games_qr_codes"
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
  "glitter_games",
  "glitter_games_qr_codes",
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
  glitter_games: true,
  glitter_games_qr_codes: true,
  analytics: true,
  registration: true,
  website: true,
  branding: true,
  emails: true,
  settings: true,
  lucky_draw_settings: true,
};

export function isEventModuleKey(value: unknown): value is EventModuleKey {
  return (
    typeof value === "string" &&
    eventModuleKeys.includes(value as EventModuleKey)
  );
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

  output.overview = true;
  output.settings = true;

  // These are separate controls:
  // - glitter_games controls the admin dashboard.
  // - glitter_games_qr_codes controls the QR lookup page.
  return output;
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

  if (moduleKey === "glitter_games") {
    return role === "admin" && enabledModules.glitter_games !== false;
  }

  if (moduleKey === "glitter_games_qr_codes") {
    const canManageQrCodes =
      role === "admin" || role === "organizer" || role === "organiser";

    return (
      canManageQrCodes &&
      enabledModules.glitter_games_qr_codes !== false
    );
  }

  if (role === "admin") return true;

  return enabledModules[moduleKey] !== false;
}

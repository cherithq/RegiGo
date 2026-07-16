export type GlitterGameKey = "tap_fast";

export type GlitterGameDefinition = {
    key: GlitterGameKey;
    title: string;
    description: string;
    playMode: "multiplayer";
    durationSeconds: number;
};

export const glitterGameCatalog: GlitterGameDefinition[] = [
    {
        key: "tap_fast",
        title: "Tap, Tap, Tap",
        description:
            "A fixed 20-second tapping challenge. The higher verified tap score wins.",
        playMode: "multiplayer",
        durationSeconds: 20,
    },
];

export type GlitterGamesConfig = Record<GlitterGameKey, boolean>;

export const defaultGlitterGamesConfig: GlitterGamesConfig = {
    tap_fast: true,
};

export function cleanGlitterGamesConfig(
    value: unknown
): GlitterGamesConfig {
    const input =
        value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : {};

    return {
        tap_fast: input.tap_fast !== false,
    };
}

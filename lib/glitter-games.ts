export const glitterGameKeys = [
    "match_cards",
    "coin_flip",
    "tic_tac_toe",
    "grab_coins",
    "tap_fast",
] as const;

export type GlitterGameKey = (typeof glitterGameKeys)[number];
export type GlitterGamesConfig = Record<GlitterGameKey, boolean>;

export const defaultGlitterGamesConfig: GlitterGamesConfig = {
    match_cards: true,
    coin_flip: true,
    tic_tac_toe: true,
    grab_coins: true,
    tap_fast: true,
};

export const glitterGameCatalog: Array<{
    key: GlitterGameKey;
    title: string;
    description: string;
    mode: "Multiplayer";
}> = [
    {
        key: "match_cards",
        title: "Match the Cards",
        description: "Find more matching pairs than a randomly matched guest in 20 seconds.",
        mode: "Multiplayer",
    },
    {
        key: "coin_flip",
        title: "Coin Flip",
        description: "Score more correct coin predictions than your opponent in 20 seconds.",
        mode: "Multiplayer",
    },
    {
        key: "tic_tac_toe",
        title: "Tic-Tac-Toe",
        description: "Build three in a row against another checked-in guest before time runs out.",
        mode: "Multiplayer",
    },
    {
        key: "grab_coins",
        title: "Grab the Coins",
        description: "Collect more moving coins than your randomly matched opponent in 20 seconds.",
        mode: "Multiplayer",
    },
    {
        key: "tap_fast",
        title: "Tap, Tap, Tap",
        description: "Out-tap another checked-in guest during a 20-second speed challenge.",
        mode: "Multiplayer",
    },
];

export function cleanGlitterGamesConfig(input: unknown): GlitterGamesConfig {
    const output: GlitterGamesConfig = { ...defaultGlitterGamesConfig };
    if (!input || typeof input !== "object" || Array.isArray(input)) return output;
    const record = input as Record<string, unknown>;
    for (const key of glitterGameKeys) {
        if (typeof record[key] === "boolean") output[key] = record[key];
    }
    return output;
}

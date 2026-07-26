"use client";

import Link from "next/link";
import {
    CheckCircle2,
    ExternalLink,
    ImageIcon,
    Loader2,
    Palette,
    Save,
    Upload,
} from "lucide-react";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

type BackgroundMode =
    | "gradient"
    | "solid"
    | "image";

type Draft = {
    backgroundMode:
        BackgroundMode;
    backgroundColor:
        string;
    gradientStart:
        string;
    gradientEnd:
        string;
    backgroundImageUrl:
        string;
    backgroundImageOpacity:
        number;
};

type ApiPayload = {
    settings?: {
        background_mode?:
            | string
            | null;
        background_color?:
            | string
            | null;
        gradient_start?:
            | string
            | null;
        gradient_end?:
            | string
            | null;
        background_image_url?:
            | string
            | null;
        background_image_opacity?:
            | number
            | null;
    };
    error?: string;
    message?: string;
    url?: string;
};

function parseDraft(
    payload:
        | ApiPayload["settings"]
        | undefined,
): Draft {
    const rawMode =
        String(
            payload
                ?.background_mode ||
                "",
        );
    const mode:
        BackgroundMode =
        rawMode ===
            "solid" ||
        rawMode ===
            "image"
            ? rawMode
            : "gradient";

    return {
        backgroundMode:
            mode,
        backgroundColor:
            payload
                ?.background_color ||
            "#050816",
        gradientStart:
            payload
                ?.gradient_start ||
            "#4F46E5",
        gradientEnd:
            payload
                ?.gradient_end ||
            "#EC4899",
        backgroundImageUrl:
            payload
                ?.background_image_url ||
            "",
        backgroundImageOpacity:
            payload
                ?.background_image_opacity ??
            0.35,
    };
}

// The dark overlay behind an uploaded image is what keeps winner names
// readable — opacity 0 leans almost fully dark, opacity 1 leans almost
// fully toward the raw photo.
function imageOverlayGradient(
    opacity: number,
    url: string,
) {
    const clamped = Math.min(
        Math.max(opacity, 0),
        1,
    );
    const topAlpha =
        0.92 - clamped * 0.82;
    const bottomAlpha =
        0.96 - clamped * 0.66;

    return `linear-gradient(rgba(2,6,23,${topAlpha}), rgba(2,6,23,${bottomAlpha})), url("${url}")`;
}

async function readJson(
    response: Response,
): Promise<ApiPayload> {
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    try {
        return JSON.parse(
            raw,
        ) as ApiPayload;
    } catch {
        return {
            error:
                response.status ===
                404
                    ? "The Lucky Draw settings API route is missing."
                    : `The server returned an invalid response (HTTP ${response.status}).`,
        };
    }
}

function previewStyle(
    draft: Draft,
) {
    if (
        draft.backgroundMode ===
            "image" &&
        draft.backgroundImageUrl
    ) {
        return {
            backgroundImage:
                imageOverlayGradient(
                    draft.backgroundImageOpacity,
                    draft.backgroundImageUrl,
                ),
            backgroundSize:
                "cover",
            backgroundPosition:
                "center",
        };
    }

    if (
        draft.backgroundMode ===
        "solid"
    ) {
        return {
            background:
                draft.backgroundColor,
        };
    }

    return {
        background:
            `linear-gradient(135deg, ${draft.gradientStart}, ${draft.gradientEnd})`,
    };
}

export default function LuckyDrawAudienceBackgroundSettings({
    eventId,
}: {
    eventId: string;
}) {
    const endpoint =
        `/api/events/${encodeURIComponent(
            eventId,
        )}/lucky-draw/settings`;
    const [
        originalSettings,
        setOriginalSettings,
    ] = useState<
        ApiPayload["settings"]
    >();
    const [
        draft,
        setDraft,
    ] = useState<Draft>(
        parseDraft(
            undefined,
        ),
    );
    const [
        loading,
        setLoading,
    ] = useState(true);
    const [
        working,
        setWorking,
    ] = useState("");
    const [
        message,
        setMessage,
    ] = useState("");

    const load =
        useCallback(async () => {
            setLoading(true);

            try {
                const response =
                    await fetch(
                        endpoint,
                        {
                            cache:
                                "no-store",
                        },
                    );
                const result =
                    await readJson(
                        response,
                    );

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                            "Unable to load the audience background.",
                    );
                }

                setOriginalSettings(
                    result.settings,
                );
                setDraft(
                    parseDraft(
                        result.settings,
                    ),
                );
                setMessage("");
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load the audience background.",
                );
            } finally {
                setLoading(false);
            }
        }, [endpoint]);

    useEffect(() => {
        void load();
    }, [load]);

    async function save() {
        setWorking(
            "save",
        );
        setMessage("");

        try {
            const response =
                await fetch(
                    endpoint,
                    {
                        method:
                            "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                backgroundMode:
                                    draft.backgroundMode,
                                backgroundColor:
                                    draft.backgroundColor,
                                gradientStart:
                                    draft.gradientStart,
                                gradientEnd:
                                    draft.gradientEnd,
                                backgroundImageUrl:
                                    draft.backgroundImageUrl,
                                backgroundImageOpacity:
                                    draft.backgroundImageOpacity,
                            }),
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to save the audience background.",
                );
            }

            setOriginalSettings(
                result.settings ||
                    originalSettings,
            );
            setMessage(
                result.message ||
                    "Audience background saved.",
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to save the audience background.",
            );
        } finally {
            setWorking("");
        }
    }

    async function upload(
        event:
            ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target
                .files?.[0];

        event.target.value =
            "";

        if (!file) {
            return;
        }

        setWorking(
            "upload",
        );
        setMessage("");

        try {
            const formData =
                new FormData();

            formData.set(
                "file",
                file,
            );
            formData.set(
                "kind",
                "background",
            );

            const response =
                await fetch(
                    `${endpoint}/assets`,
                    {
                        method:
                            "POST",
                        body:
                            formData,
                    },
                );
            const result =
                await readJson(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to upload the background image.",
                );
            }

            if (!result.url) {
                throw new Error(
                    "The upload completed without returning an image URL.",
                );
            }

            setDraft(
                (current) => ({
                    ...current,
                    backgroundMode:
                        "image",
                    backgroundImageUrl:
                        result.url ||
                        "",
                }),
            );
            setMessage(
                "Background uploaded. Press Save Background to apply it.",
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to upload the background image.",
            );
        } finally {
            setWorking("");
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                    <Palette
                        size={
                            16
                        }
                    />
                    Background Only
                </div>

                <h2 className="mt-4 text-2xl font-black">
                    Audience display background
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose a gradient, one solid colour or an uploaded image. The audience screen contains winner names only and never displays a wheel.
                </p>

                {message && (
                    <div className="mt-5 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
                        <CheckCircle2
                            size={
                                17
                            }
                            className="mt-0.5 shrink-0 text-emerald-600"
                        />
                        {
                            message
                        }
                    </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <ModeButton
                        label="Gradient"
                        active={
                            draft.backgroundMode ===
                            "gradient"
                        }
                        onClick={() =>
                            setDraft(
                                (current) => ({
                                    ...current,
                                    backgroundMode:
                                        "gradient",
                                }),
                            )
                        }
                    />
                    <ModeButton
                        label="Solid Colour"
                        active={
                            draft.backgroundMode ===
                            "solid"
                        }
                        onClick={() =>
                            setDraft(
                                (current) => ({
                                    ...current,
                                    backgroundMode:
                                        "solid",
                                }),
                            )
                        }
                    />
                    <ModeButton
                        label="Image"
                        active={
                            draft.backgroundMode ===
                            "image"
                        }
                        onClick={() =>
                            setDraft(
                                (current) => ({
                                    ...current,
                                    backgroundMode:
                                        "image",
                                }),
                            )
                        }
                    />
                </div>

                {draft.backgroundMode ===
                    "gradient" && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <ColourField
                            label="Gradient Start"
                            value={
                                draft.gradientStart
                            }
                            onChange={(
                                value,
                            ) =>
                                setDraft(
                                    (
                                        current,
                                    ) => ({
                                        ...current,
                                        gradientStart:
                                            value,
                                    }),
                                )
                            }
                        />

                        <ColourField
                            label="Gradient End"
                            value={
                                draft.gradientEnd
                            }
                            onChange={(
                                value,
                            ) =>
                                setDraft(
                                    (
                                        current,
                                    ) => ({
                                        ...current,
                                        gradientEnd:
                                            value,
                                    }),
                                )
                            }
                        />
                    </div>
                )}

                {draft.backgroundMode ===
                    "solid" && (
                    <div className="mt-5">
                        <ColourField
                            label="Background Colour"
                            value={
                                draft.backgroundColor
                            }
                            onChange={(
                                value,
                            ) =>
                                setDraft(
                                    (
                                        current,
                                    ) => ({
                                        ...current,
                                        backgroundColor:
                                            value,
                                    }),
                                )
                            }
                        />
                    </div>
                )}

                {draft.backgroundMode ===
                    "image" && (
                    <div className="mt-5 space-y-4">
                        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 bg-[#F7F5FF] px-4 py-4 font-black text-[#4F46E5]">
                            {working ===
                            "upload" ? (
                                <Loader2
                                    size={
                                        18
                                    }
                                    className="animate-spin"
                                />
                            ) : (
                                <Upload
                                    size={
                                        18
                                    }
                                />
                            )}
                            Upload Background Image
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(
                                    event,
                                ) =>
                                    void upload(
                                        event,
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Image URL
                            </span>
                            <input
                                value={
                                    draft.backgroundImageUrl
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setDraft(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            backgroundImageUrl:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                placeholder="https://..."
                                className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3"
                            />
                        </label>

                        <label>
                            <span className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
                                Image Visibility
                                <span className="text-slate-400">
                                    {Math.round(
                                        draft.backgroundImageOpacity *
                                            100,
                                    )}
                                    %
                                </span>
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={
                                    draft.backgroundImageOpacity
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setDraft(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            backgroundImageOpacity:
                                                Number(
                                                    event
                                                        .target
                                                        .value,
                                                ),
                                        }),
                                    )
                                }
                                className="w-full accent-[#4F46E5]"
                            />
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                Lower values keep winner names easier to read over busy photos.
                            </p>
                        </label>
                    </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() =>
                            void save()
                        }
                        disabled={
                            working ===
                            "save"
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-60"
                    >
                        {working ===
                        "save" ? (
                            <Loader2
                                size={
                                    18
                                }
                                className="animate-spin"
                            />
                        ) : (
                            <Save
                                size={
                                    18
                                }
                            />
                        )}
                        Save Background
                    </button>

                    <Link
                        href={`/display/events/${eventId}/lucky-draw`}
                        target="_blank"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700"
                    >
                        <ExternalLink
                            size={
                                18
                            }
                        />
                        Open Audience Display
                    </Link>
                </div>
            </section>

            <section
                className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-slate-200 p-5 text-white shadow-xl sm:p-6 lg:p-8"
                style={previewStyle(
                    draft,
                )}
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.14),transparent_50%)]" />

                <div className="relative z-10 flex h-full min-h-[450px] items-center justify-center">
                    <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2">
                        {[
                            "Alicia Tan",
                            "Benjamin Lee",
                            "Chloe Lim",
                            "Daniel Ng",
                        ].map(
                            (
                                name,
                            ) => (
                                <article
                                    key={
                                        name
                                    }
                                    className="flex min-h-36 items-center justify-center rounded-3xl border border-white/25 bg-slate-950/35 px-5 py-8 text-center shadow-2xl backdrop-blur-xl"
                                >
                                    <p className="text-2xl font-black leading-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.45)] sm:text-3xl">
                                        {
                                            name
                                        }
                                    </p>
                                </article>
                            ),
                        )}
                    </div>
                </div>

                <div className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-xs font-black backdrop-blur">
                    <ImageIcon
                        size={
                            14
                        }
                    />
                    Audience Preview — Names Only
                </div>
            </section>
        </div>
    );
}

function ModeButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={[
                "min-h-12 rounded-2xl border px-4 py-3 text-sm font-black transition",
                active
                    ? "border-[#4F46E5] bg-[#F7F5FF] text-[#4F46E5]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
            ].join(" ")}
        >
            {
                label
            }
        </button>
    );
}

function ColourField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange:
        (
            value: string,
        ) => void;
}) {
    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {
                    label
                }
            </span>

            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 px-3">
                <input
                    type="color"
                    value={
                        value
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value
                                .toUpperCase(),
                        )
                    }
                    className="h-8 w-10 cursor-pointer border-0 bg-transparent"
                />

                <input
                    value={
                        value
                    }
                    maxLength={
                        7
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value,
                        )
                    }
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold outline-none"
                />
            </div>
        </label>
    );
}

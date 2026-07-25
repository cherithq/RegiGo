"use client";

import {
    Building2,
    CheckCircle2,
    Loader2,
    LockKeyhole,
    Mail,
    RefreshCw,
    Save,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

type Profile = {
    id: string;
    fullName: string;
    email: string;
    role: string;
    roleLabel: string;
    companyId:
        | string
        | null;
    companyName: string;
    membershipStatus: string;
    initials: string;
    createdAt:
        | string
        | null;
};

type ApiPayload = {
    success?: boolean;
    profile?: Profile;
    message?: string;
    error?: string;
};

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
                    ? "The profile API route is missing."
                    : `The profile server returned an invalid response (HTTP ${response.status}).`,
        };
    }
}

function formatDate(
    value:
        | string
        | null,
) {
    if (!value) {
        return "Not available";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "en-SG",
        {
            day:
                "2-digit",
            month:
                "short",
            year:
                "numeric",
        },
    ).format(
        date,
    );
}

export default function ProfilePageClient() {
    const [
        profile,
        setProfile,
    ] =
        useState<Profile | null>(
            null,
        );
    const [
        fullName,
        setFullName,
    ] = useState("");
    const [
        loading,
        setLoading,
    ] = useState(true);
    const [
        saving,
        setSaving,
    ] = useState(false);
    const [
        message,
        setMessage,
    ] = useState<{
        type:
            | "success"
            | "error";
        text: string;
    } | null>(null);

    const load =
        useCallback(async () => {
            setLoading(
                true,
            );
            setMessage(
                null,
            );

            try {
                const response =
                    await fetch(
                        "/api/profile",
                        {
                            cache:
                                "no-store",
                        },
                    );
                const payload =
                    await readJson(
                        response,
                    );

                if (
                    !response.ok ||
                    !payload.profile
                ) {
                    throw new Error(
                        payload.error ||
                            "Unable to load your profile.",
                    );
                }

                setProfile(
                    payload.profile,
                );
                setFullName(
                    payload.profile
                        .fullName,
                );
            } catch (error) {
                setMessage({
                    type:
                        "error",
                    text:
                        error instanceof
                            Error
                            ? error.message
                            : "Unable to load your profile.",
                });
            } finally {
                setLoading(
                    false,
                );
            }
        }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function save(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setSaving(
            true,
        );
        setMessage(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/profile",
                    {
                        method:
                            "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                fullName,
                            }),
                    },
                );
            const payload =
                await readJson(
                    response,
                );

            if (
                !response.ok ||
                !payload.profile
            ) {
                throw new Error(
                    payload.error ||
                        "Unable to save your profile.",
                );
            }

            setProfile(
                payload.profile,
            );
            setFullName(
                payload.profile
                    .fullName,
            );
            setMessage({
                type:
                    "success",
                text:
                    payload.message ||
                    "Profile updated successfully.",
            });

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:profile-updated",
                    {
                        detail: {
                            fullName:
                                payload.profile
                                    .fullName,
                        },
                    },
                ),
            );
        } catch (error) {
            setMessage({
                type:
                    "error",
                text:
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to save your profile.",
            });
        } finally {
            setSaving(
                false,
            );
        }
    }

    if (
        loading &&
        !profile
    ) {
        return (
            <section className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="text-center">
                    <Loader2 className="mx-auto animate-spin text-[#4F46E5]" />
                    <p className="mt-3 text-sm font-bold text-slate-500">
                        Loading your profile…
                    </p>
                </div>
            </section>
        );
    }

    if (!profile) {
        return (
            <section className="rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm sm:p-8">
                <h1 className="text-2xl font-black text-red-600">
                    Profile could not be loaded
                </h1>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    {message
                        ?.text ||
                        "The profile information is unavailable."}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        void load()
                    }
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
                >
                    <RefreshCw
                        size={
                            17
                        }
                    />
                    Try Again
                </button>
            </section>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 right-32 h-48 w-48 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-[#4F46E5] to-[#EC4899] text-2xl font-black text-white shadow-lg">
                        {profile.initials ||
                            "RG"}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl">
                                {profile.fullName ||
                                    "My Profile"}
                            </h1>

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F5FF] px-3 py-2 text-xs font-black text-[#4F46E5]">
                                <ShieldCheck
                                    size={
                                        14
                                    }
                                />
                                {
                                    profile.roleLabel
                                }
                            </span>
                        </div>

                        <p className="mt-2 truncate text-sm font-semibold text-slate-500 sm:text-base">
                            {
                                profile.email
                            }
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                            {profile.companyName}
                        </p>
                    </div>
                </div>
            </section>

            {message && (
                <div
                    aria-live="polite"
                    className={[
                        "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-6",
                        message.type ===
                        "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700",
                    ].join(
                        " ",
                    )}
                >
                    {message.type ===
                    "success" ? (
                        <CheckCircle2
                            size={
                                18
                            }
                            className="mt-0.5 shrink-0"
                        />
                    ) : (
                        <LockKeyhole
                            size={
                                18
                            }
                            className="mt-0.5 shrink-0"
                        />
                    )}

                    {
                        message.text
                    }
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
                <form
                    onSubmit={
                        save
                    }
                    className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
                >
                    <div>
                        <h2 className="text-2xl font-black">
                            Personal details
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Update the name displayed throughout RegiGo.
                        </p>
                    </div>

                    <div className="mt-6 space-y-5">
                        <ProfileField
                            icon={
                                UserRound
                            }
                            label="Full Name"
                            value={
                                fullName
                            }
                            placeholder="Enter your full name"
                            onChange={
                                setFullName
                            }
                            editable
                        />

                        <ProfileField
                            icon={
                                Mail
                            }
                            label="Email"
                            value={
                                profile.email
                            }
                            helper="Email changes require account verification and are not edited from this page."
                        />

                        <ProfileField
                            icon={
                                ShieldCheck
                            }
                            label="Role"
                            value={
                                profile.roleLabel
                            }
                            helper="Your role and permissions are managed by the workspace administrator."
                        />

                        <ProfileField
                            icon={
                                Building2
                            }
                            label="Event Company"
                            value={
                                profile.companyName
                            }
                            helper="Company membership is managed through Users & Permissions."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            fullName.trim()
                                .length <
                                2 ||
                            fullName.trim() ===
                                profile.fullName
                        }
                        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {saving ? (
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

                        Save Profile
                    </button>
                </form>

                <aside className="space-y-4">
                    <InfoCard
                        icon={
                            Building2
                        }
                        label="Workspace"
                        value={
                            profile.companyName
                        }
                    />

                    <InfoCard
                        icon={
                            ShieldCheck
                        }
                        label="Access Level"
                        value={
                            profile.roleLabel
                        }
                    />

                    <InfoCard
                        icon={
                            UserRound
                        }
                        label="Member Since"
                        value={formatDate(
                            profile.createdAt,
                        )}
                    />

                    <div className="rounded-[1.6rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                        <p className="font-black">
                            Account security
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            Your email address, password and role are protected account settings. Contact a workspace administrator when these details need to change.
                        </p>
                    </div>
                </aside>
            </section>
        </div>
    );
}

function ProfileField({
    icon: Icon,
    label,
    value,
    onChange,
    placeholder,
    helper,
    editable = false,
}: {
    icon:
        typeof UserRound;
    label: string;
    value: string;
    onChange?:
        (
            value: string,
        ) => void;
    placeholder?: string;
    helper?: string;
    editable?: boolean;
}) {
    return (
        <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                <Icon
                    size={
                        16
                    }
                    className="text-[#4F46E5]"
                />
                {
                    label
                }
            </span>

            <input
                value={
                    value
                }
                readOnly={
                    !editable
                }
                required={
                    editable
                }
                maxLength={
                    editable
                        ? 180
                        : undefined
                }
                placeholder={
                    placeholder
                }
                onChange={(
                    event,
                ) =>
                    onChange?.(
                        event.target
                            .value,
                    )
                }
                className={[
                    "min-h-12 w-full rounded-2xl border px-4 py-3 outline-none transition",
                    editable
                        ? "border-slate-200 bg-white text-slate-950 focus:border-[#4F46E5] focus:ring-4 focus:ring-indigo-100"
                        : "cursor-default border-slate-200 bg-slate-50 font-semibold text-slate-600",
                ].join(
                    " ",
                )}
            />

            {helper && (
                <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                    {
                        helper
                    }
                </span>
            )}
        </label>
    );
}

function InfoCard({
    icon: Icon,
    label,
    value,
}: {
    icon:
        typeof Building2;
    label: string;
    value: string;
}) {
    return (
        <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon
                    size={
                        19
                    }
                />
            </span>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                {
                    label
                }
            </p>

            <p className="mt-2 break-words text-lg font-black text-slate-800">
                {
                    value
                }
            </p>
        </article>
    );
}

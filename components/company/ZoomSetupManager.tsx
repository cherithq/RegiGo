"use client";

import {
    CheckCircle2,
    CircleAlert,
    Loader2,
    Save,
    Video,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

type Payload = {
    companyId: string;
    connected: boolean;
    accountId: string | null;
    clientId: string | null;
    connectedAt: string | null;
};

async function readJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error:
                text ||
                "The server returned an invalid response.",
        };
    }
}

export default function ZoomSetupManager({
    companyId,
}: {
    companyId: string | null;
}) {
    const [data, setData] =
        useState<Payload | null>(null);
    const [loading, setLoading] =
        useState(true);
    const [saving, setSaving] =
        useState(false);
    const [message, setMessage] =
        useState("");
    const [error, setError] = useState("");

    const [accountId, setAccountId] =
        useState("");
    const [clientId, setClientId] =
        useState("");
    const [clientSecret, setClientSecret] =
        useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/company/zoom-credentials${
                    companyId
                        ? `?companyId=${encodeURIComponent(
                              companyId,
                          )}`
                        : ""
                }`,
                { cache: "no-store" },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to load Zoom settings.",
                );
            }

            const payload =
                result as Payload;

            setData(payload);
            setAccountId(
                payload.accountId || "",
            );
            setClientId(
                payload.clientId || "",
            );
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to load Zoom settings.",
            );
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function submit(
        event: React.FormEvent,
    ) {
        event.preventDefault();

        if (!data) return;

        setSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch(
                "/api/company/zoom-credentials",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        companyId:
                            data.companyId,
                        accountId,
                        clientId,
                        clientSecret,
                    }),
                },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to connect Zoom.",
                );
            }

            setClientSecret("");
            setMessage(
                result.message ||
                    "Zoom account connected.",
            );
            await load();
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to connect Zoom.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function disconnect() {
        if (!data) return;

        setSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch(
                "/api/company/zoom-credentials",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        companyId:
                            data.companyId,
                    }),
                },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to disconnect Zoom.",
                );
            }

            setMessage(
                result.message ||
                    "Zoom account disconnected.",
            );
            await load();
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : "Unable to disconnect Zoom.",
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-10">
                <Loader2
                    className="animate-spin text-[#4F46E5]"
                    size={22}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                        <Video size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black">
                            Zoom Setup
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Connect a Zoom Server-to-Server OAuth app so
                            events can create broadcast meetings under
                            your own Zoom account.
                        </p>
                    </div>

                    {data?.connected && (
                        <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                            <CheckCircle2
                                size={14}
                            />
                            Connected
                        </span>
                    )}
                </div>

                {error && (
                    <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        <CircleAlert
                            size={16}
                            className="mt-0.5 shrink-0"
                        />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        {message}
                    </div>
                )}

                <form
                    onSubmit={submit}
                    className="mt-6 space-y-4"
                >
                    <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                            Zoom Account ID
                        </span>
                        <input
                            type="text"
                            value={accountId}
                            onChange={(
                                event,
                            ) =>
                                setAccountId(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="e.g. Ab1CdEfGhIjKlMnOpQrStU"
                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-2.5 font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                            required
                        />
                        <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-400">
                            Zoom App Marketplace &rarr; Build App &rarr; App
                            Credentials tab, &quot;Account ID&quot; field.
                        </span>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                            Client ID
                        </span>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(
                                event,
                            ) =>
                                setClientId(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="e.g. XyZ9AbCdEfGhIjKlMnOp"
                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-2.5 font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                            required
                        />
                        <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-400">
                            Same App Credentials tab, &quot;Client ID&quot;
                            field.
                        </span>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                            Client Secret
                        </span>
                        <input
                            type="password"
                            value={
                                clientSecret
                            }
                            onChange={(
                                event,
                            ) =>
                                setClientSecret(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder={
                                data?.connected
                                    ? "Leave blank to keep the saved secret"
                                    : "e.g. QwErTy123456AbCdEf7890GhIjKlMn"
                            }
                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-2.5 font-bold text-slate-950 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                            required={
                                !data?.connected
                            }
                        />
                        <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-400">
                            From your Zoom Server-to-Server OAuth app
                            (Zoom App Marketplace &rarr; Develop &rarr;
                            Build App).
                        </span>
                    </label>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save
                                    size={16}
                                />
                            )}
                            {data?.connected
                                ? "Save & Verify"
                                : "Connect Zoom"}
                        </button>

                        {data?.connected && (
                            <button
                                type="button"
                                onClick={() =>
                                    void disconnect()
                                }
                                disabled={
                                    saving
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-6 py-3 font-black text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                </form>
            </section>
        </div>
    );
}

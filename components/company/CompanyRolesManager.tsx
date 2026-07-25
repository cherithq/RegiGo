"use client";

import {
    Building2,
    Loader2,
    Lock,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import type {
    CompanyModuleKey,
    ModuleDefinition,
} from "@/lib/company-modules";

type Role =
    | "admin"
    | "organizer"
    | "viewer"
    | "scanner";

type Company = {
    id: string;
    company_name: string;
};

type Payload = {
    companies: Company[];
    company: Company;
    companyModules:
        Record<
            CompanyModuleKey,
            boolean
        >;
    moduleCatalog:
        ModuleDefinition[];
    permissions:
        Record<
            Role,
            Record<
                CompanyModuleKey,
                boolean
            >
        >;
    access: {
        isPlatformAdmin:
            boolean;
        canEditAdmin:
            boolean;
    };
};

const roleLabels:
    Record<Role, string> = {
        admin:
            "Company Admin",
        organizer:
            "Organizer",
        viewer: "Viewer",
        scanner: "Scanner",
    };

const roles: Role[] = [
    "admin",
    "organizer",
    "viewer",
    "scanner",
];

async function readJson(
    response: Response,
) {
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    if (
        response.headers
            .get("content-type")
            ?.includes(
                "application/json",
            )
    ) {
        try {
            return JSON.parse(
                raw,
            );
        } catch {
            return {
                error:
                    "The permissions server returned invalid JSON.",
            };
        }
    }

    return {
        error:
            /^\s*<!doctype html/i.test(
                raw,
            )
                ? "The Roles & Permissions API route is missing or failed to build."
                : raw,
    };
}

export default function CompanyRolesManager() {
    const [data, setData] =
        useState<Payload | null>(
            null,
        );
    const [companyId, setCompanyId] =
        useState("");
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");

    const load =
        useCallback(async (
            requestedCompanyId?: string,
        ) => {
            setLoading(true);

            try {
                const query =
                    requestedCompanyId
                        ? `?companyId=${encodeURIComponent(
                              requestedCompanyId,
                          )}`
                        : "";
                const response =
                    await fetch(
                        `/api/company/roles${query}`,
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
                            "Unable to load role permissions.",
                    );
                }

                const payload =
                    result as Payload;
                setData(payload);
                setCompanyId(
                    payload.company.id,
                );
                setMessage("");
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load role permissions.",
                );
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const grouped =
        useMemo(() => {
            const groups =
                new Map<
                    string,
                    ModuleDefinition[]
                >();

            for (const module of
                data?.moduleCatalog ||
                []) {
                groups.set(
                    module.group,
                    [
                        ...(groups.get(
                            module.group,
                        ) || []),
                        module,
                    ],
                );
            }

            return Array.from(
                groups.entries(),
            );
        }, [data]);

    async function toggle(
        role: Role,
        moduleKey:
            CompanyModuleKey,
        enabled: boolean,
    ) {
        if (!data) {
            return;
        }

        setWorking(
            `${role}:${moduleKey}`,
        );
        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/company/roles",
                    {
                        method:
                            "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                companyId:
                                    data.company.id,
                                role,
                                moduleKey,
                                enabled,
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
                        "Unable to update the role.",
                );
            }

            setData(
                (current) =>
                    current
                        ? {
                              ...current,
                              permissions: {
                                  ...current.permissions,
                                  [role]: {
                                      ...current
                                          .permissions[
                                          role
                                      ],
                                      [moduleKey]:
                                          enabled,
                                  },
                              },
                          }
                        : current,
            );
            setMessage(
                result.message ||
                    "Role permission updated.",
            );

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:company-changed",
                ),
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to update the role.",
            );
        } finally {
            setWorking("");
        }
    }

    if (
        loading &&
        !data
    ) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-bold leading-6 text-red-700">
                {message ||
                    "No role data found."}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        <ShieldCheck
                            size={16}
                        />
                        Roles & Permissions
                    </div>
                    <h1 className="mt-5 text-3xl font-black sm:text-4xl lg:text-5xl">
                        Access by Company Role
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                        Platform administrators can edit Company Admin access. Company Admins can edit Organizer, Viewer and Scanner access when their own Manage Roles permission is enabled.
                    </p>
                </div>
            </section>

            <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#4F46E5]">
                        <Building2
                            size={17}
                        />
                        Company
                    </div>

                    {data.access
                        .isPlatformAdmin ? (
                        <select
                            value={
                                companyId
                            }
                            onChange={(
                                event,
                            ) => {
                                const id =
                                    event
                                        .target
                                        .value;
                                setCompanyId(
                                    id,
                                );
                                void load(
                                    id,
                                );
                            }}
                            className="mt-3 w-full min-w-0 rounded-2xl border border-slate-200 px-4 py-3 font-black sm:min-w-72"
                        >
                            {data.companies.map(
                                (
                                    company,
                                ) => (
                                    <option
                                        key={
                                            company.id
                                        }
                                        value={
                                            company.id
                                        }
                                    >
                                        {
                                            company.company_name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    ) : (
                        <p className="mt-3 truncate text-xl font-black">
                            {
                                data.company
                                    .company_name
                            }
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() =>
                        void load(
                            companyId,
                        )
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black"
                >
                    <RefreshCw
                        size={16}
                        className={
                            loading
                                ? "animate-spin"
                                : ""
                        }
                    />
                    Refresh
                </button>
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-6 text-slate-700">
                    {message}
                </div>
            )}

            <div className="space-y-5">
                {grouped.map(
                    ([
                        group,
                        modules,
                    ]) => (
                        <section
                            key={group}
                            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                        >
                            <h2 className="text-lg font-black text-[#4F46E5]">
                                {group}
                            </h2>

                            <div className="mt-4 space-y-4">
                                {modules.map(
                                    (
                                        module,
                                    ) => {
                                        const companyEnabled =
                                            data
                                                .companyModules[
                                                module
                                                    .key
                                            ] !==
                                            false;

                                        return (
                                            <article
                                                key={
                                                    module.key
                                                }
                                                className="rounded-2xl bg-slate-50 p-4 sm:p-5"
                                            >
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                                    <div className="min-w-0 xl:max-w-sm">
                                                        <p className="font-black text-slate-900">
                                                            {
                                                                module.label
                                                            }
                                                        </p>
                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                            {
                                                                module.description
                                                            }
                                                        </p>
                                                        {!companyEnabled && (
                                                            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-500">
                                                                <Lock
                                                                    size={
                                                                        12
                                                                    }
                                                                />
                                                                Disabled for company
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                        {roles.map(
                                                            (
                                                                role,
                                                            ) => {
                                                                const enabled =
                                                                    companyEnabled &&
                                                                    data
                                                                        .permissions[
                                                                        role
                                                                    ][
                                                                        module
                                                                            .key
                                                                    ] !==
                                                                        false;
                                                                const busy =
                                                                    working ===
                                                                    `${role}:${module.key}`;
                                                                const editable =
                                                                    companyEnabled &&
                                                                    (
                                                                        role !==
                                                                            "admin" ||
                                                                        data
                                                                            .access
                                                                            .canEditAdmin
                                                                    );

                                                                return (
                                                                    <label
                                                                        key={
                                                                            role
                                                                        }
                                                                        className={[
                                                                            "flex min-w-0 flex-col items-center justify-between gap-2 rounded-2xl border bg-white p-3 text-center",
                                                                            editable
                                                                                ? "border-slate-200"
                                                                                : "border-slate-100 opacity-65",
                                                                        ].join(
                                                                            " ",
                                                                        )}
                                                                    >
                                                                        <span className="min-h-8 text-xs font-black leading-4 text-slate-700">
                                                                            {
                                                                                roleLabels[
                                                                                    role
                                                                                ]
                                                                            }
                                                                        </span>

                                                                        <button
                                                                            type="button"
                                                                            role="switch"
                                                                            aria-checked={
                                                                                enabled
                                                                            }
                                                                            disabled={
                                                                                !editable ||
                                                                                busy
                                                                            }
                                                                            onClick={() =>
                                                                                void toggle(
                                                                                    role,
                                                                                    module.key,
                                                                                    !enabled,
                                                                                )
                                                                            }
                                                                            className={[
                                                                                "relative h-8 w-14 rounded-full transition disabled:cursor-not-allowed",
                                                                                enabled
                                                                                    ? "bg-[#4F46E5]"
                                                                                    : "bg-slate-200",
                                                                            ].join(
                                                                                " ",
                                                                            )}
                                                                        >
                                                                            <span
                                                                                className={[
                                                                                    "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                                                                                    enabled
                                                                                        ? "left-7"
                                                                                        : "left-1",
                                                                                ].join(
                                                                                    " ",
                                                                                )}
                                                                            />
                                                                        </button>
                                                                    </label>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        </section>
                    ),
                )}
            </div>
        </div>
    );
}

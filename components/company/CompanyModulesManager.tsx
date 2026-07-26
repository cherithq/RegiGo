"use client";

import {
    Building2,
    CheckCircle2,
    CreditCard,
    Gift,
    Globe2,
    Loader2,
    Mail,
    Palette,
    QrCode,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Table2,
    Ticket,
    Trophy,
    Users,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import type {
    LucideIcon,
} from "lucide-react";
import {
    supabase,
} from "@/lib/supabase";

type CompanyRow = {
    id: string;
    company_name:
        | string
        | null;
    company_slug?:
        | string
        | null;
    status?:
        | string
        | null;
    current_plan_id?:
        | string
        | null;
    custom_sender_name?:
        | string
        | null;
    custom_sender_reply_to?:
        | string
        | null;
    custom_sender_status?:
        | string
        | null;
    custom_sender_review_note?:
        | string
        | null;
};

type ModuleRow = {
    company_id: string;
    module_key: string;
    is_enabled:
        | boolean
        | null;
};

type PlanRow = {
    id: string;
    plan_name:
        | string
        | null;
};

type Company = {
    id: string;
    companyName: string;
    companySlug:
        | string
        | null;
    status:
        | string
        | null;
    currentPlanId:
        | string
        | null;
    planName:
        | string
        | null;
    enabledModules:
        Record<
            string,
            boolean
        >;
    customSenderName:
        | string
        | null;
    customSenderReplyTo:
        | string
        | null;
    customSenderStatus:
        | "none"
        | "pending"
        | "approved"
        | "rejected";
    customSenderReviewNote:
        | string
        | null;
};

type ModuleDefinition = {
    key: string;
    label: string;
    description: string;
    icon: LucideIcon;
    locked?: boolean;
};

const MODULES: ModuleDefinition[] = [
    {
        key:
            "overview",
        label:
            "Event Overview",
        description:
            "Main event workspace and summary.",
        icon:
            Building2,
        locked:
            true,
    },
    {
        key:
            "guests",
        label:
            "Guest List",
        description:
            "View, add, edit and manage guests.",
        icon:
            Users,
    },
    {
        key:
            "invitations",
        label:
            "Guest Invitations",
        description:
            "Personalised RSVP invitations and reminders.",
        icon:
            Mail,
    },
    {
        key:
            "tickets",
        label:
            "Tickets",
        description:
            "Free and paid ticket categories.",
        icon:
            Ticket,
    },
    {
        key:
            "payments",
        label:
            "Ticket Payments",
        description:
            "Stripe payments, orders and payouts.",
        icon:
            CreditCard,
    },
    {
        key:
            "tables",
        label:
            "Tables",
        description:
            "Event tables and guest assignments.",
        icon:
            Table2,
    },
    {
        key:
            "table_selection",
        label:
            "Guest Table Selection",
        description:
            "Guests choose available tables during registration or RSVP.",
        icon:
            Table2,
    },
    {
        key:
            "floor_plan",
        label:
            "Floor Plan",
        description:
            "Visual venue and seating layout.",
        icon:
            Globe2,
    },
    {
        key:
            "scanner",
        label:
            "QR Scanner",
        description:
            "Guest check-in and attendance tracking.",
        icon:
            QrCode,
    },
    {
        key:
            "badges",
        label:
            "Badge Designer",
        description:
            "Create personalised guest badges.",
        icon:
            ShieldCheck,
    },
    {
        key:
            "direct_printing",
        label:
            "Direct Badge Printing",
        description:
            "Print badges directly from the browser.",
        icon:
            ShieldCheck,
    },
    {
        key:
            "lucky_draw",
        label:
            "Lucky Draw",
        description:
            "Live draws and winner history.",
        icon:
            Gift,
    },
    {
        key:
            "tournament",
        label:
            "Tournament",
        description:
            "Guest tournament and elimination rounds.",
        icon:
            Trophy,
    },
    {
        key:
            "analytics",
        label:
            "Analytics",
        description:
            "Registration, invitation and attendance reports.",
        icon:
            Search,
    },
    {
        key:
            "registration",
        label:
            "Registration Builder",
        description:
            "Custom registration form fields.",
        icon:
            CheckCircle2,
    },
    {
        key:
            "website",
        label:
            "Website Builder",
        description:
            "Public event website and landing page.",
        icon:
            Globe2,
    },
    {
        key:
            "branding",
        label:
            "Branding",
        description:
            "Event colours, logos and visual identity.",
        icon:
            Palette,
    },
    {
        key:
            "emails",
        label:
            "Email Centre",
        description:
            "Email templates, confirmations and reminders.",
        icon:
            Mail,
    },
];

const DEFAULT_MODULES =
    Object.fromEntries(
        MODULES.map(
            (
                module,
            ) => [
                module.key,
                module.key ===
                    "overview",
            ],
        ),
    ) as Record<
        string,
        boolean
    >;

function isCompatibilityError(
    error:
        | {
              code?: string;
          }
        | null,
) {
    return [
        "42P01",
        "42703",
        "PGRST204",
        "PGRST205",
    ].includes(
        String(
            error?.code ||
                "",
        ),
    );
}

export default function CompanyModulesManager() {
    const [
        companies,
        setCompanies,
    ] =
        useState<Company[]>(
            [],
        );
    const [
        selectedCompanyId,
        setSelectedCompanyId,
    ] = useState("");
    const [
        modules,
        setModules,
    ] =
        useState<
            Record<
                string,
                boolean
            >
        >(
            DEFAULT_MODULES,
        );
    const [
        query,
        setQuery,
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
    ] =
        useState<{
            type:
                | "success"
                | "error";
            text: string;
        } | null>(
            null,
        );
    const [
        senderReviewSaving,
        setSenderReviewSaving,
    ] = useState("");

    async function reviewSenderRequest(
        company: Company,
        action:
            | "approve"
            | "reject",
    ) {
        setSenderReviewSaving(
            `${action}:${company.id}`,
        );
        setMessage(
            null,
        );

        try {
            const response =
                await fetch(
                    "/api/company/sender-request",
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            {
                                companyId:
                                    company.id,
                                action,
                            },
                        ),
                    },
                );
            const result =
                await response.json();

            if (
                !response.ok
            ) {
                throw new Error(
                    result.error ||
                        "Unable to review the custom sender request.",
                );
            }

            setCompanies(
                (
                    current,
                ) =>
                    current.map(
                        (
                            item,
                        ) =>
                            item.id ===
                            company.id
                                ? {
                                      ...item,
                                      customSenderStatus:
                                          action ===
                                          "approve"
                                              ? "approved"
                                              : "rejected",
                                      customSenderReviewNote:
                                          null,
                                  }
                                : item,
                    ),
            );
            setMessage(
                {
                    type: "success",
                    text:
                        result.message ||
                        "Custom sender request reviewed.",
                },
            );
        } catch (error) {
            setMessage(
                {
                    type: "error",
                    text:
                        error instanceof
                        Error
                            ? error.message
                            : "Unable to review the custom sender request.",
                },
            );
        } finally {
            setSenderReviewSaving(
                "",
            );
        }
    }

    const load =
        useCallback(async () => {
            setLoading(
                true,
            );
            setMessage(
                null,
            );

            try {
                const fullCompanyResult =
                    await supabase
                        .from(
                            "companies",
                        )
                        .select(
                            "id, company_name, company_slug, status, current_plan_id, custom_sender_name, custom_sender_reply_to, custom_sender_status, custom_sender_review_note",
                        )
                        .order(
                            "company_name",
                        );

                let companyRows:
                    CompanyRow[] =
                    [];

                if (
                    fullCompanyResult.error
                ) {
                    const missingOptionalColumns =
                        String(
                            fullCompanyResult.error
                                .code ||
                                "",
                        ) ===
                        "42703";

                    if (
                        !missingOptionalColumns
                    ) {
                        throw new Error(
                            fullCompanyResult.error
                                .message,
                        );
                    }

                    const basicCompanyResult =
                        await supabase
                            .from(
                                "companies",
                            )
                            .select(
                                "id, company_name",
                            )
                            .order(
                                "company_name",
                            );

                    if (
                        basicCompanyResult.error
                    ) {
                        throw new Error(
                            basicCompanyResult.error
                                .message,
                        );
                    }

                    companyRows =
                        (
                            basicCompanyResult.data ||
                            []
                        ).map(
                            (
                                company,
                            ): CompanyRow => ({
                                id:
                                    String(
                                        company.id,
                                    ),
                                company_name:
                                    company.company_name ||
                                    null,
                                company_slug:
                                    null,
                                status:
                                    "active",
                                current_plan_id:
                                    null,
                            }),
                        );
                } else {
                    companyRows =
                        (
                            fullCompanyResult.data ||
                            []
                        ) as unknown as
                            CompanyRow[];
                }

                const [
                    moduleResult,
                    planResult,
                ] =
                    await Promise.all([
                        supabase
                            .from(
                                "company_module_settings",
                            )
                            .select(
                                "company_id, module_key, is_enabled",
                            ),

                        supabase
                            .from(
                                "rental_plans",
                            )
                            .select(
                                "id, plan_name",
                            ),
                    ]);

                if (
                    moduleResult.error &&
                    !isCompatibilityError(
                        moduleResult.error,
                    )
                ) {
                    throw new Error(
                        moduleResult.error
                            .message,
                    );
                }

                if (
                    planResult.error &&
                    !isCompatibilityError(
                        planResult.error,
                    )
                ) {
                    throw new Error(
                        planResult.error
                            .message,
                    );
                }

                const planById =
                    new Map(
                        (
                            planResult.data ||
                            []
                        ).map(
                            (
                                plan: PlanRow,
                            ) => [
                                String(
                                    plan.id,
                                ),
                                plan.plan_name ||
                                    null,
                            ],
                        ),
                    );
                const moduleMap =
                    new Map<
                        string,
                        Record<
                            string,
                            boolean
                        >
                    >();

                for (const row of
                    (
                        moduleResult.data ||
                        []
                    ) as ModuleRow[]) {
                    const current =
                        moduleMap.get(
                            row.company_id,
                        ) ||
                        {};

                    current[
                        row.module_key
                    ] =
                        row.is_enabled !==
                        false;

                    moduleMap.set(
                        row.company_id,
                        current,
                    );
                }

                const nextCompanies =
                    companyRows.map(
                        (
                            company:
                                CompanyRow,
                        ): Company => ({
                            id:
                                String(
                                    company.id,
                                ),
                            companyName:
                                company.company_name ||
                                "Untitled Company",
                            companySlug:
                                company.company_slug ||
                                null,
                            status:
                                company.status ||
                                "active",
                            currentPlanId:
                                company.current_plan_id ||
                                null,
                            planName:
                                company.current_plan_id
                                    ? planById.get(
                                          String(
                                              company.current_plan_id,
                                          ),
                                      ) ||
                                      null
                                    : null,
                            enabledModules: {
                                overview:
                                    true,
                                ...moduleMap.get(
                                    String(
                                        company.id,
                                    ),
                                ),
                            },
                            customSenderName:
                                company.custom_sender_name ||
                                null,
                            customSenderReplyTo:
                                company.custom_sender_reply_to ||
                                null,
                            customSenderStatus:
                                company.custom_sender_status ===
                                    "pending" ||
                                company.custom_sender_status ===
                                    "approved" ||
                                company.custom_sender_status ===
                                    "rejected"
                                    ? company.custom_sender_status
                                    : "none",
                            customSenderReviewNote:
                                company.custom_sender_review_note ||
                                null,
                        }),
                    );

                setCompanies(
                    nextCompanies,
                );
                setSelectedCompanyId(
                    (
                        current,
                    ) =>
                        nextCompanies.some(
                            (
                                company,
                            ) =>
                                company.id ===
                                current,
                        )
                            ? current
                            : nextCompanies[0]
                                  ?.id ||
                              "",
                );
            } catch (error) {
                setMessage({
                    type:
                        "error",
                    text:
                        error instanceof
                            Error
                            ? error.message
                            : "Unable to load event companies.",
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

    const selectedCompany =
        useMemo(
            () =>
                companies.find(
                    (
                        company,
                    ) =>
                        company.id ===
                        selectedCompanyId,
                ) ||
                null,
            [
                companies,
                selectedCompanyId,
            ],
        );

    useEffect(() => {
        if (
            !selectedCompany
        ) {
            setModules(
                DEFAULT_MODULES,
            );
            return;
        }

        setModules({
            ...DEFAULT_MODULES,
            ...selectedCompany.enabledModules,
            overview:
                true,
        });
    }, [
        selectedCompany,
    ]);

    const filteredCompanies =
        useMemo(() => {
            const cleanQuery =
                query
                    .trim()
                    .toLowerCase();

            if (
                !cleanQuery
            ) {
                return companies;
            }

            return companies.filter(
                (
                    company,
                ) =>
                    company.companyName
                        .toLowerCase()
                        .includes(
                            cleanQuery,
                        ) ||
                    (
                        company.companySlug ||
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            cleanQuery,
                        ),
            );
        }, [
            companies,
            query,
        ]);

    function toggleModule(
        module:
            ModuleDefinition,
    ) {
        if (
            module.locked
        ) {
            return;
        }

        setModules(
            (
                current,
            ) => ({
                ...current,
                [module.key]:
                    !current[
                        module.key
                    ],
                overview:
                    true,
            }),
        );
    }

    async function save() {
        if (
            !selectedCompany
        ) {
            return;
        }

        setSaving(
            true,
        );
        setMessage(
            null,
        );

        try {
            const rows =
                MODULES.map(
                    (
                        module,
                    ) => ({
                        company_id:
                            selectedCompany.id,
                        module_key:
                            module.key,
                        is_enabled:
                            module.key ===
                            "overview"
                                ? true
                                : modules[
                                      module.key
                                  ] ===
                                  true,
                        updated_at:
                            new Date()
                                .toISOString(),
                    }),
                );

            const {
                error,
            } =
                await supabase
                    .from(
                        "company_module_settings",
                    )
                    .upsert(
                        rows,
                        {
                            onConflict:
                                "company_id,module_key",
                        },
                    );

            if (
                error
            ) {
                throw new Error(
                    error.message,
                );
            }

            setCompanies(
                (
                    current,
                ) =>
                    current.map(
                        (
                            company,
                        ) =>
                            company.id ===
                            selectedCompany.id
                                ? {
                                      ...company,
                                      enabledModules: {
                                          ...modules,
                                          overview:
                                              true,
                                      },
                                  }
                                : company,
                    ),
            );
            setMessage({
                type:
                    "success",
                text:
                    "Company module access updated.",
            });
        } catch (error) {
            setMessage({
                type:
                    "error",
                text:
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to save company modules.",
            });
        } finally {
            setSaving(
                false,
            );
        }
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <Building2
                                size={
                                    16
                                }
                            />
                            Platform Administration
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                            Event Companies
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            Select which modules each event company can use. Event Overview remains enabled.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void load()
                        }
                        disabled={
                            loading
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={
                                17
                            }
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        Refresh
                    </button>
                </div>
            </section>

            {message && (
                <div
                    className={[
                        "rounded-2xl border px-5 py-4 text-sm font-bold",
                        message.type ===
                        "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700",
                    ].join(
                        " ",
                    )}
                >
                    {
                        message.text
                    }
                </div>
            )}

            <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="relative">
                        <Search
                            size={
                                18
                            }
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            value={
                                query
                            }
                            onChange={(
                                event,
                            ) =>
                                setQuery(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Search companies"
                            className="min-h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 outline-none focus:border-[#4F46E5]"
                        />
                    </div>

                    <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto">
                        {loading ? (
                            <div className="flex min-h-40 items-center justify-center">
                                <Loader2 className="animate-spin text-[#4F46E5]" />
                            </div>
                        ) : filteredCompanies.length ===
                          0 ? (
                            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                                No event companies found.
                            </div>
                        ) : (
                            filteredCompanies.map(
                                (
                                    company,
                                ) => (
                                    <button
                                        key={
                                            company.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            setSelectedCompanyId(
                                                company.id,
                                            )
                                        }
                                        className={[
                                            "w-full rounded-2xl border p-4 text-left transition",
                                            company.id ===
                                            selectedCompanyId
                                                ? "border-[#4F46E5] bg-[#F7F5FF]"
                                                : "border-slate-200 bg-white",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        <p className="font-black text-slate-900">
                                            {
                                                company.companyName
                                            }
                                        </p>

                                        <p className="mt-2 text-xs font-bold text-slate-500">
                                            {company.planName ||
                                                "No plan"}{" "}
                                            •{" "}
                                            {company.status ||
                                                "active"}
                                        </p>
                                    </button>
                                ),
                            )
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                    {selectedCompany ? (
                        <>
                            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[#4F46E5]">
                                        Module Access
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                                        {
                                            selectedCompany.companyName
                                        }
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void save()
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-50"
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
                                    Save Modules
                                </button>
                            </div>

                            {selectedCompany.customSenderStatus !==
                                "none" && (
                                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                                            Custom Sender Request
                                        </p>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                                                selectedCompany.customSenderStatus ===
                                                "approved"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : selectedCompany.customSenderStatus ===
                                                        "pending"
                                                      ? "bg-amber-50 text-amber-700"
                                                      : "bg-red-50 text-red-700"
                                            }`}
                                        >
                                            {
                                                selectedCompany.customSenderStatus
                                            }
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm font-semibold text-slate-700">
                                        {
                                            selectedCompany.customSenderName
                                        }{" "}
                                        &lt;
                                        {
                                            selectedCompany.customSenderReplyTo
                                        }
                                        &gt;
                                    </p>

                                    {selectedCompany.customSenderStatus ===
                                        "pending" && (
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                disabled={Boolean(
                                                    senderReviewSaving,
                                                )}
                                                onClick={() =>
                                                    void reviewSenderRequest(
                                                        selectedCompany,
                                                        "approve",
                                                    )
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                                            >
                                                {senderReviewSaving ===
                                                `approve:${selectedCompany.id}` ? (
                                                    <Loader2
                                                        size={
                                                            15
                                                        }
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    <CheckCircle2
                                                        size={
                                                            15
                                                        }
                                                    />
                                                )}
                                                Approve
                                            </button>

                                            <button
                                                type="button"
                                                disabled={Boolean(
                                                    senderReviewSaving,
                                                )}
                                                onClick={() =>
                                                    void reviewSenderRequest(
                                                        selectedCompany,
                                                        "reject",
                                                    )
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-50"
                                            >
                                                {senderReviewSaving ===
                                                `reject:${selectedCompany.id}` ? (
                                                    <Loader2
                                                        size={
                                                            15
                                                        }
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    "Reject"
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                {MODULES.map(
                                    (
                                        module,
                                    ) => {
                                        const Icon =
                                            module.icon;
                                        const enabled =
                                            modules[
                                                module.key
                                            ] !== false;

                                        return (
                                            <button
                                                key={
                                                    module.key
                                                }
                                                type="button"
                                                onClick={() =>
                                                    toggleModule(
                                                        module,
                                                    )
                                                }
                                                disabled={
                                                    module.locked
                                                }
                                                className={[
                                                    "flex min-h-32 items-start gap-4 rounded-2xl border p-4 text-left transition",
                                                    enabled
                                                        ? "border-indigo-200 bg-[#F7F5FF]"
                                                        : "border-slate-200 bg-white",
                                                    module.locked
                                                        ? "cursor-not-allowed opacity-80"
                                                        : "",
                                                ].join(
                                                    " ",
                                                )}
                                            >
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#4F46E5]">
                                                    <Icon
                                                        size={
                                                            19
                                                        }
                                                    />
                                                </span>

                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center justify-between gap-3">
                                                        <span className="font-black text-slate-900">
                                                            {
                                                                module.label
                                                            }
                                                        </span>

                                                        <span
                                                            className={[
                                                                "relative h-6 w-11 shrink-0 rounded-full",
                                                                enabled
                                                                    ? "bg-[#4F46E5]"
                                                                    : "bg-slate-300",
                                                            ].join(
                                                                " ",
                                                            )}
                                                        >
                                                            <span
                                                                className={[
                                                                    "absolute top-1 h-4 w-4 rounded-full bg-white transition",
                                                                    enabled
                                                                        ? "left-6"
                                                                        : "left-1",
                                                                ].join(
                                                                    " ",
                                                                )}
                                                            />
                                                        </span>
                                                    </span>

                                                    <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
                                                        {
                                                            module.description
                                                        }
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-72 items-center justify-center rounded-2xl bg-slate-50 p-6 text-center font-bold text-slate-500">
                            Select an event company to manage its modules.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

"use client";

import {
    BadgeCheck,
    Building2,
    CalendarClock,
    Check,
    CreditCard,
    Loader2,
    RefreshCw,
    Save,
    Ticket,
    Users,
} from "lucide-react";
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type RentalPlan = {
    id: string;
    code: string;
    plan_name: string;
    rental_type:
        | "annual"
        | "per_event";
    price_amount:
        | number
        | string;
    currency: string;
    event_limit:
        | number
        | null;
    team_member_limit:
        | number
        | null;
    features:
        | Record<
              string,
              boolean
          >
        | null;
    is_active: boolean;
};

type Company = {
    id: string;
    company_name: string;
    company_slug:
        | string
        | null;
    status:
        | string
        | null;
    current_plan_id:
        | string
        | null;
    currentPlan:
        | RentalPlan
        | null;
    eventCount: number;
    teamMemberCount: number;
    availableEventLicences: number;
    usedEventLicences: number;
    subscription:
        | {
              status:
                  | string
                  | null;
              starts_at:
                  | string
                  | null;
              ends_at:
                  | string
                  | null;
          }
        | null;
};

type Payload = {
    plans: RentalPlan[];
    companies: Company[];
    error?: string;
};

const COMPANY_PLAN_ENDPOINTS =
    [
        "/api/platform/company-plans",
        "/api/company-plans",
    ] as const;

async function requestCompanyPlans(
    init?: RequestInit,
) {
    let lastResponse:
        | Response
        | null = null;

    for (const endpoint of
        COMPANY_PLAN_ENDPOINTS) {
        const response =
            await fetch(
                endpoint,
                {
                    cache:
                        "no-store",
                    ...init,
                },
            );

        lastResponse =
            response;

        if (
            response.status !==
            404
        ) {
            return response;
        }
    }

    if (lastResponse) {
        return lastResponse;
    }

    throw new Error(
        "The Company Plans API could not be reached.",
    );
}

async function readJson(
    response: Response,
) {
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    try {
        return JSON.parse(
            raw,
        );
    } catch {
        return {
            error:
                response.status ===
                404
                    ? "Both Company Plans API routes are missing. Copy app/api/platform/company-plans/route.ts and app/api/company-plans/route.ts, then restart Next.js."
                    : `The server returned an invalid response (HTTP ${response.status}).`,
        };
    }
}

function futureDate(
    years = 1,
) {
    const date =
        new Date();

    date.setFullYear(
        date.getFullYear() +
            years,
    );

    return date
        .toISOString()
        .slice(
            0,
            10,
        );
}

function sixMonthsAhead() {
    const date =
        new Date();

    date.setMonth(
        date.getMonth() +
            6,
    );

    return date
        .toISOString()
        .slice(
            0,
            10,
        );
}

function money(
    plan:
        | RentalPlan
        | null,
) {
    if (!plan) {
        return "Not set";
    }

    return new Intl.NumberFormat(
        "en-SG",
        {
            style:
                "currency",
            currency:
                plan.currency ||
                "SGD",
        },
    ).format(
        Number(
            plan.price_amount ||
                0,
        ),
    );
}

function limit(
    value:
        | number
        | null,
) {
    return value ==
        null
        ? "Unlimited"
        : value.toLocaleString();
}

function planType(
    value:
        | "annual"
        | "per_event",
) {
    return value ===
        "per_event"
        ? "Per-event rental"
        : "Annual rental";
}

// The "RegiGo" plan is the platform's own lifetime plan and never expires;
// every other annual plan (e.g. "Project Catalyst") keeps a required end date.
function isLifetimePlan(
    plan:
        | RentalPlan
        | null,
) {
    return (
        plan?.plan_name
            .trim()
            .toLowerCase() ===
        "regigo"
    );
}

function featureName(
    value: string,
) {
    return value
        .split("_")
        .map(
            (
                word,
            ) =>
                word
                    .charAt(0)
                    .toUpperCase() +
                word.slice(
                    1,
                ),
        )
        .join(" ");
}

function formatDate(
    value:
        | string
        | null
        | undefined,
) {
    if (!value) {
        return "No expiry";
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

export default function CompanyRentalPlanManager() {
    const [
        data,
        setData,
    ] =
        useState<Payload | null>(
            null,
        );
    const [
        companyId,
        setCompanyId,
    ] = useState("");
    const [
        planId,
        setPlanId,
    ] = useState("");
    const [
        annualEndsAt,
        setAnnualEndsAt,
    ] =
        useState(
            futureDate,
        );
    const [
        licenceQuantity,
        setLicenceQuantity,
    ] = useState("1");
    const [
        licenceExpiresAt,
        setLicenceExpiresAt,
    ] =
        useState(
            sixMonthsAhead,
        );
    const [
        loading,
        setLoading,
    ] = useState(true);
    const [
        working,
        setWorking,
    ] = useState(false);
    const [
        message,
        setMessage,
    ] = useState("");
    const [
        unavailable,
        setUnavailable,
    ] = useState(false);

    const load =
        useCallback(async () => {
            setLoading(
                true,
            );

            try {
                const response =
                    await requestCompanyPlans();
                const result =
                    await readJson(
                        response,
                    );

                if (
                    response.status ===
                    403
                ) {
                    setUnavailable(
                        true,
                    );
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                            "Unable to load company rental plans.",
                    );
                }

                const payload =
                    result as Payload;

                setData(
                    payload,
                );
                setCompanyId(
                    (
                        current,
                    ) =>
                        payload.companies.some(
                            (
                                company,
                            ) =>
                                company.id ===
                                current,
                        )
                            ? current
                            : payload.companies[0]
                                  ?.id ||
                              "",
                );
                setUnavailable(
                    false,
                );
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load company rental plans.",
                );
            } finally {
                setLoading(
                    false,
                );
            }
        }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const company =
        useMemo(
            () =>
                data?.companies.find(
                    (
                        item,
                    ) =>
                        item.id ===
                        companyId,
                ) ||
                null,
            [
                companyId,
                data,
            ],
        );

    const selectedPlan =
        useMemo(
            () =>
                data?.plans.find(
                    (
                        plan,
                    ) =>
                        plan.id ===
                        planId,
                ) ||
                null,
            [
                data,
                planId,
            ],
        );

    useEffect(() => {
        if (!company) {
            return;
        }

        setPlanId(
            company.current_plan_id ||
                data?.plans.find(
                    (
                        plan,
                    ) =>
                        plan.is_active,
                )?.id ||
                "",
        );

        if (
            company.subscription
                ?.ends_at
        ) {
            setAnnualEndsAt(
                new Date(
                    company.subscription.ends_at,
                )
                    .toISOString()
                    .slice(
                        0,
                        10,
                    ),
            );
        }
    }, [
        company,
        data,
    ]);

    async function save(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            !company ||
            !selectedPlan
        ) {
            return;
        }

        setWorking(
            true,
        );
        setMessage(
            "",
        );

        try {
            const response =
                await requestCompanyPlans(
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
                                    company.id,
                                planId:
                                    selectedPlan.id,
                                subscriptionEndsAt:
                                    selectedPlan.rental_type ===
                                        "annual" &&
                                    !isLifetimePlan(
                                        selectedPlan,
                                    )
                                        ? annualEndsAt
                                        : null,
                                eventLicenceQuantity:
                                    selectedPlan.rental_type ===
                                    "per_event"
                                        ? Number(
                                              licenceQuantity,
                                          )
                                        : 1,
                                perEventExpiry:
                                    selectedPlan.rental_type ===
                                    "per_event"
                                        ? licenceExpiresAt
                                        : null,
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
                        "Unable to change the rental plan.",
                );
            }

            setMessage(
                result.message ||
                    "Company rental plan updated.",
            );
            await load();

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:companies-changed",
                    {
                        detail: {
                            companyId:
                                company.id,
                        },
                    },
                ),
            );
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to change the rental plan.",
            );
        } finally {
            setWorking(
                false,
            );
        }
    }

    if (
        unavailable
    ) {
        return null;
    }

    if (
        loading &&
        !data
    ) {
        return (
            <div className="flex min-h-80 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            <CreditCard
                                size={
                                    16
                                }
                            />
                            Platform Administration
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                            Company Rental Plans
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                            Assign or change an event company’s plan. Existing events remain in the company; the new limits apply to future event creation.
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
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-6 text-slate-700 shadow-sm">
                    {
                        message
                    }
                </div>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {(data?.plans ||
                    []).map(
                    (
                        plan,
                    ) => (
                        <PlanCard
                            key={
                                plan.id
                            }
                            plan={
                                plan
                            }
                            selected={
                                plan.id ===
                                planId
                            }
                            onSelect={() =>
                                setPlanId(
                                    plan.id,
                                )
                            }
                        />
                    ),
                )}
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <label>
                        <span className="mb-2 block text-sm font-black text-slate-700">
                            Event Company
                        </span>

                        <select
                            value={
                                companyId
                            }
                            onChange={(
                                event,
                            ) =>
                                setCompanyId(
                                    event.target
                                        .value,
                                )
                            }
                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-[#4F46E5]"
                        >
                            {(data?.companies ||
                                []).map(
                                (
                                    item,
                                ) => (
                                    <option
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.company_name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    {company && (
                        <div className="mt-5 space-y-3">
                            <Summary
                                icon={
                                    CreditCard
                                }
                                label="Current plan"
                                value={
                                    company.currentPlan
                                        ?.plan_name ||
                                    "No plan assigned"
                                }
                            />
                            <Summary
                                icon={
                                    CalendarClock
                                }
                                label="Events used"
                                value={
                                    company.eventCount.toLocaleString()
                                }
                            />
                            <Summary
                                icon={
                                    Users
                                }
                                label="Active team members"
                                value={
                                    company.teamMemberCount.toLocaleString()
                                }
                            />
                            <Summary
                                icon={
                                    Ticket
                                }
                                label="Available event licences"
                                value={
                                    company.availableEventLicences.toLocaleString()
                                }
                            />

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Current plan expiry
                                </p>
                                <p className="mt-2 font-black text-slate-800">
                                    {formatDate(
                                        company.subscription
                                            ?.ends_at,
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={
                        save
                    }
                    className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <Building2
                                size={
                                    22
                                }
                            />
                        </span>

                        <div>
                            <h2 className="text-2xl font-black">
                                Change rental plan
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Select a plan above, then configure its rental period or licence quantity.
                            </p>
                        </div>
                    </div>

                    {selectedPlan ? (
                        <>
                            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Selected plan
                                        </p>
                                        <p className="mt-1 text-xl font-black">
                                            {
                                                selectedPlan.plan_name
                                            }
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#4F46E5]">
                                        {planType(
                                            selectedPlan.rental_type,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {selectedPlan.rental_type ===
                            "annual" ? (
                                isLifetimePlan(
                                    selectedPlan,
                                ) ? (
                                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                            Subscription End Date
                                        </p>
                                        <p className="mt-2 font-black text-slate-800">
                                            No expiry
                                        </p>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                                            The RegiGo plan never expires.
                                        </p>
                                    </div>
                                ) : (
                                    <label className="mt-5 block">
                                        <span className="mb-2 block text-sm font-black text-slate-700">
                                            Subscription End Date
                                        </span>

                                        <input
                                            type="date"
                                            required
                                            min={
                                                new Date()
                                                    .toISOString()
                                                    .slice(
                                                        0,
                                                        10,
                                                    )
                                            }
                                            value={
                                                annualEndsAt
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setAnnualEndsAt(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                        />

                                        <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                                            The annual subscription remains active until this date.
                                        </span>
                                    </label>
                                )
                            ) : (
                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <label>
                                        <span className="mb-2 block text-sm font-black text-slate-700">
                                            Event Licences to Issue
                                        </span>

                                        <input
                                            type="number"
                                            min={
                                                1
                                            }
                                            max={
                                                100
                                            }
                                            required
                                            value={
                                                licenceQuantity
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setLicenceQuantity(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                        />

                                        <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                                            Each available licence allows one new event.
                                        </span>
                                    </label>

                                    <label>
                                        <span className="mb-2 block text-sm font-black text-slate-700">
                                            Licence Expiry
                                        </span>

                                        <input
                                            type="date"
                                            min={
                                                new Date()
                                                    .toISOString()
                                                    .slice(
                                                        0,
                                                        10,
                                                    )
                                            }
                                            value={
                                                licenceExpiresAt
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setLicenceExpiresAt(
                                                    event.target
                                                        .value,
                                                )
                                            }
                                            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                        />
                                    </label>
                                </div>
                            )}

                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-bold leading-6 text-amber-800">
                                Changing plans does not remove existing events or team members. Old unused per-event licences are cancelled, and the new limits apply to future event creation and account management.
                            </div>

                            {company &&
                                selectedPlan.event_limit !==
                                    null &&
                                company.eventCount >
                                    selectedPlan.event_limit && (
                                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold leading-6 text-red-700">
                                        This company already has{" "}
                                        {company.eventCount.toLocaleString()} events, which exceeds this plan&apos;s limit of{" "}
                                        {selectedPlan.event_limit.toLocaleString()}. Existing events will remain, but no additional events can be created until usage is below the limit or the plan is upgraded.
                                    </div>
                                )}

                            {company &&
                                selectedPlan.team_member_limit !==
                                    null &&
                                company.teamMemberCount >
                                    selectedPlan.team_member_limit && (
                                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold leading-6 text-red-700">
                                        This company already has{" "}
                                        {company.teamMemberCount.toLocaleString()} active team members, which exceeds this plan&apos;s limit of{" "}
                                        {selectedPlan.team_member_limit.toLocaleString()}. Existing accounts remain active; reduce the team or choose a larger plan before adding more members.
                                    </div>
                                )}

                            <button
                                type="submit"
                                disabled={
                                    working ||
                                    !company
                                }
                                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white disabled:opacity-50"
                            >
                                {working ? (
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

                                Change Company Rental Plan
                            </button>
                        </>
                    ) : (
                        <div className="mt-6 rounded-2xl bg-slate-50 p-5 font-bold text-slate-500">
                            Select an available rental plan.
                        </div>
                    )}
                </form>
            </section>
        </div>
    );
}

function PlanCard({
    plan,
    selected,
    onSelect,
}: {
    plan: RentalPlan;
    selected: boolean;
    onSelect: () => void;
}) {
    const features =
        Object.entries(
            plan.features ||
                {},
        )
            .filter(
                ([
                    ,
                    enabled,
                ]) =>
                    enabled,
            )
            .map(
                ([
                    key,
                ]) =>
                    key,
            );

    return (
        <button
            type="button"
            onClick={
                onSelect
            }
            disabled={
                !plan.is_active
            }
            className={[
                "rounded-[1.6rem] border p-5 text-left shadow-sm transition",
                selected
                    ? "border-[#4F46E5] bg-[#F7F5FF] ring-2 ring-[#4F46E5]/15"
                    : "border-slate-200 bg-white hover:border-indigo-200",
                !plan.is_active
                    ? "cursor-not-allowed opacity-50"
                    : "",
            ].join(
                " ",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#4F46E5] shadow-sm">
                    {plan.rental_type ===
                    "per_event" ? (
                        <Ticket
                            size={
                                20
                            }
                        />
                    ) : (
                        <BadgeCheck
                            size={
                                20
                            }
                        />
                    )}
                </span>

                {selected && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                        <Check
                            size={
                                16
                            }
                        />
                    </span>
                )}
            </div>

            <h3 className="mt-5 text-xl font-black">
                {
                    plan.plan_name
                }
            </h3>

            <p className="mt-1 text-sm font-bold text-slate-500">
                {planType(
                    plan.rental_type,
                )}
            </p>

            <p className="mt-4 text-2xl font-black">
                {money(
                    plan,
                )}
            </p>

            <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-slate-500">
                        Events
                    </dt>
                    <dd className="font-black">
                        {limit(
                            plan.event_limit,
                        )}
                    </dd>
                </div>

                <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-slate-500">
                        Team
                    </dt>
                    <dd className="font-black">
                        {limit(
                            plan.team_member_limit,
                        )}
                    </dd>
                </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
                {features
                    .slice(
                        0,
                        3,
                    )
                    .map(
                        (
                            feature,
                        ) => (
                            <span
                                key={
                                    feature
                                }
                                className="rounded-full bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600"
                            >
                                {featureName(
                                    feature,
                                )}
                            </span>
                        ),
                    )}

                {features.length >
                    3 && (
                    <span className="rounded-full bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600">
                        +
                        {features.length -
                            3}{" "}
                        more
                    </span>
                )}
            </div>
        </button>
    );
}

function Summary({
    icon: Icon,
    label,
    value,
}: {
    icon:
        typeof CreditCard;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4F46E5]">
                <Icon
                    size={
                        18
                    }
                />
            </span>

            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {
                        label
                    }
                </p>

                <p className="mt-1 truncate font-black text-slate-800">
                    {
                        value
                    }
                </p>
            </div>
        </div>
    );
}

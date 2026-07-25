"use client";

import {
    Building2,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Plus,
    RefreshCw,
    Ticket,
    UserPlus,
    X,
} from "lucide-react";
import {
    FormEvent,
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
    is_active: boolean;
};

type CreatedCompany = {
    id: string;
    company_name: string;
    company_slug: string;
};

async function readJson(
    response: Response,
) {
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    const contentType =
        response.headers.get(
            "content-type",
        ) || "";

    if (
        contentType.includes(
            "application/json",
        )
    ) {
        try {
            return JSON.parse(raw);
        } catch {
            return {
                error:
                    "The server returned invalid JSON.",
            };
        }
    }

    if (
        contentType.includes(
            "text/html",
        ) ||
        /^\s*<!doctype html/i.test(
            raw,
        ) ||
        raw.includes(
            "/_next/static/",
        )
    ) {
        return {
            error:
                response.status ===
                404
                    ? "The company API route is missing. Copy the complete company creation patch and restart Next.js."
                    : `The server returned an HTML error page (HTTP ${response.status}). Check the terminal for the original error.`,
        };
    }

    return {
        error:
            raw.length > 500
                ? `${raw.slice(
                      0,
                      500,
                  )}…`
                : raw,
    };
}

function slugify(
    value: string,
) {
    return value
        .normalize("NFKD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

function futureDate() {
    const date = new Date();
    date.setFullYear(
        date.getFullYear() + 1,
    );

    const year =
        date.getFullYear();
    const month =
        String(
            date.getMonth() + 1,
        ).padStart(2, "0");
    const day =
        String(
            date.getDate(),
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function limitLabel(
    value: number | null,
) {
    return value == null
        ? "Unlimited"
        : String(value);
}

function generatePassword() {
    const lowercase =
        "abcdefghijkmnopqrstuvwxyz";
    const uppercase =
        "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const numbers =
        "23456789";
    const symbols =
        "!@#$%&*?";
    const all =
        lowercase +
        uppercase +
        numbers +
        symbols;

    const randomIndex = (
        length: number,
    ) => {
        const value =
            new Uint32Array(1);
        window.crypto.getRandomValues(
            value,
        );

        return (
            value[0] %
            length
        );
    };

    const required = [
        lowercase[
            randomIndex(
                lowercase.length,
            )
        ],
        uppercase[
            randomIndex(
                uppercase.length,
            )
        ],
        numbers[
            randomIndex(
                numbers.length,
            )
        ],
        symbols[
            randomIndex(
                symbols.length,
            )
        ],
    ];

    while (
        required.length <
        14
    ) {
        required.push(
            all[
                randomIndex(
                    all.length,
                )
            ],
        );
    }

    for (
        let index =
            required.length - 1;
        index > 0;
        index -= 1
    ) {
        const target =
            randomIndex(
                index + 1,
            );
        [
            required[index],
            required[target],
        ] = [
            required[target],
            required[index],
        ];
    }

    return required.join("");
}

export default function CreateCompanyModal({
    open,
    onClose,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: (
        company: CreatedCompany,
        message: string,
    ) => Promise<void> | void;
}) {
    const [plans, setPlans] =
        useState<RentalPlan[]>([]);
    const [loadingPlans, setLoadingPlans] =
        useState(false);
    const [working, setWorking] =
        useState(false);
    const [error, setError] =
        useState("");

    const [
        companyName,
        setCompanyName,
    ] = useState("");
    const [
        companySlug,
        setCompanySlug,
    ] = useState("");
    const [
        slugTouched,
        setSlugTouched,
    ] = useState(false);
    const [
        billingEmail,
        setBillingEmail,
    ] = useState("");
    const [
        contactNumber,
        setContactNumber,
    ] = useState("");
    const [
        adminFullName,
        setAdminFullName,
    ] = useState("");
    const [
        adminEmail,
        setAdminEmail,
    ] = useState("");
    const [
        adminPassword,
        setAdminPassword,
    ] = useState("");
    const [
        confirmAdminPassword,
        setConfirmAdminPassword,
    ] = useState("");
    const [
        showAdminPassword,
        setShowAdminPassword,
    ] = useState(false);
    const [status, setStatus] =
        useState("active");
    const [planId, setPlanId] =
        useState("");
    const [
        subscriptionEndsAt,
        setSubscriptionEndsAt,
    ] = useState(futureDate);
    const [
        eventLicenseQuantity,
        setEventLicenseQuantity,
    ] = useState(1);

    const selectedPlan =
        useMemo(
            () =>
                plans.find(
                    (plan) =>
                        plan.id ===
                        planId,
                ) || null,
            [planId, plans],
        );

    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled =
            false;

        async function load() {
            setLoadingPlans(true);
            setError("");

            try {
                const response =
                    await fetch(
                        "/api/platform/companies",
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
                            "Unable to load rental plans.",
                    );
                }

                if (cancelled) {
                    return;
                }

                const activePlans = (
                    result.rentalPlans ||
                    []
                ).filter(
                    (
                        plan: RentalPlan,
                    ) =>
                        plan.is_active !==
                        false,
                );

                setPlans(
                    activePlans,
                );
                setPlanId(
                    (current) =>
                        activePlans.some(
                            (
                                plan: RentalPlan,
                            ) =>
                                plan.id ===
                                current,
                        )
                            ? current
                            : activePlans.find(
                                  (
                                      plan: RentalPlan,
                                  ) =>
                                      plan.code ===
                                      "annual_professional",
                              )?.id ||
                              activePlans[0]
                                  ?.id ||
                              "",
                );
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : "Unable to load rental plans.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingPlans(
                        false,
                    );
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (!slugTouched) {
            setCompanySlug(
                slugify(companyName),
            );
        }
    }, [
        companyName,
        slugTouched,
    ]);

    function reset() {
        setCompanyName("");
        setCompanySlug("");
        setSlugTouched(false);
        setBillingEmail("");
        setContactNumber("");
        setAdminFullName("");
        setAdminEmail("");
        setAdminPassword("");
        setConfirmAdminPassword("");
        setShowAdminPassword(false);
        setStatus("active");
        setSubscriptionEndsAt(
            futureDate(),
        );
        setEventLicenseQuantity(
            1,
        );
        setError("");
    }

    function close() {
        if (working) {
            return;
        }

        reset();
        onClose();
    }

    async function submit(
        event: FormEvent,
    ) {
        event.preventDefault();

        if (working) {
            return;
        }

        if (
            adminPassword !==
            confirmAdminPassword
        ) {
            setError(
                "The administrator passwords do not match.",
            );
            return;
        }

        if (
            adminPassword.length <
            8
        ) {
            setError(
                "The administrator password must be at least 8 characters.",
            );
            return;
        }

        setWorking(true);
        setError("");

        try {
            const response =
                await fetch(
                    "/api/platform/companies",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                companyName,
                                companySlug,
                                billingEmail,
                                contactNumber,
                                adminFullName,
                                adminEmail,
                                adminPassword,
                                status,
                                planId,
                                subscriptionEndsAt:
                                    selectedPlan?.rental_type ===
                                    "annual"
                                        ? subscriptionEndsAt
                                        : null,
                                eventLicenseQuantity:
                                    selectedPlan?.rental_type ===
                                    "per_event"
                                        ? eventLicenseQuantity
                                        : 0,
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
                        "Unable to create the company.",
                );
            }

            const company =
                result.company as CreatedCompany;

            reset();
            onClose();

            await onCreated(
                company,
                result.message ||
                    "Company created.",
            );
        } catch (submitError) {
            setError(
                submitError instanceof
                    Error
                    ? submitError.message
                    : "Unable to create the company.",
            );
        } finally {
            setWorking(false);
        }
    }

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-company-title"
        >
            <form
                onSubmit={submit}
                className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-6">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <Building2
                                size={23}
                            />
                        </span>

                        <div>
                            <h2
                                id="create-company-title"
                                className="text-2xl font-black"
                            >
                                Create Company
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Create the company,
                                activate its rental
                                access and seed all
                                module permissions.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={close}
                        disabled={working}
                        className="rounded-xl bg-slate-100 p-3 text-slate-500 disabled:opacity-50"
                        aria-label="Close create company dialog"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="space-y-7 p-6">
                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    <section>
                        <div className="flex items-center gap-2">
                            <Building2 className="text-[#4F46E5]" />
                            <h3 className="text-lg font-black">
                                Company Details
                            </h3>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Field
                                label="Company name"
                                value={
                                    companyName
                                }
                                onChange={
                                    setCompanyName
                                }
                                placeholder="Acme Events Pte Ltd"
                                required
                            />

                            <Field
                                label="Company slug"
                                value={
                                    companySlug
                                }
                                onChange={(
                                    value,
                                ) => {
                                    setSlugTouched(
                                        true,
                                    );
                                    setCompanySlug(
                                        slugify(
                                            value,
                                        ),
                                    );
                                }}
                                placeholder="acme-events"
                                required
                            />

                            <Field
                                label="Billing email"
                                value={
                                    billingEmail
                                }
                                onChange={
                                    setBillingEmail
                                }
                                placeholder="billing@company.com"
                                type="email"
                            />

                            <Field
                                label="Contact number"
                                value={
                                    contactNumber
                                }
                                onChange={
                                    setContactNumber
                                }
                                placeholder="+65 6123 4567"
                            />

                            <div>
                                <label className="mb-2 block text-sm font-black text-slate-700">
                                    Company status
                                </label>
                                <select
                                    value={
                                        status
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setStatus(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold"
                                >
                                    <option value="active">
                                        Active
                                    </option>
                                    <option value="suspended">
                                        Suspended
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-2">
                            <UserPlus className="text-[#4F46E5]" />
                            <h3 className="text-lg font-black">
                                Company Administrator Account
                            </h3>
                        </div>

                        <div className="mt-4 rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-5 text-sm leading-6 text-slate-700">
                            The platform admin creates the login credentials.
                            The company administrator can sign in immediately;
                            no invitation email is required.
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Field
                                label="Administrator full name"
                                value={
                                    adminFullName
                                }
                                onChange={
                                    setAdminFullName
                                }
                                placeholder="Company administrator"
                                required
                            />

                            <Field
                                label="Administrator email"
                                value={
                                    adminEmail
                                }
                                onChange={
                                    setAdminEmail
                                }
                                placeholder="admin@company.com"
                                type="email"
                                required
                            />

                            <label className="block text-sm font-black text-slate-700 md:col-span-2">
                                Administrator password

                                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                    <div className="relative flex-1">
                                        <KeyRound
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type={
                                                showAdminPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            required
                                            minLength={8}
                                            value={
                                                adminPassword
                                            }
                                            onChange={(event) =>
                                                setAdminPassword(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="At least 8 characters with a letter and number"
                                            autoComplete="new-password"
                                            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-12 font-medium outline-none focus:border-[#4F46E5]"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowAdminPassword(
                                                    (current) =>
                                                        !current,
                                                )
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400"
                                            aria-label={
                                                showAdminPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showAdminPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const generated =
                                                generatePassword();
                                            setAdminPassword(
                                                generated,
                                            );
                                            setConfirmAdminPassword(
                                                generated,
                                            );
                                            setShowAdminPassword(
                                                true,
                                            );
                                        }}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700"
                                    >
                                        <RefreshCw size={16} />
                                        Generate
                                    </button>
                                </div>
                            </label>

                            <Field
                                label="Confirm administrator password"
                                value={
                                    confirmAdminPassword
                                }
                                onChange={
                                    setConfirmAdminPassword
                                }
                                placeholder="Enter the same password again"
                                type={
                                    showAdminPassword
                                        ? "text"
                                        : "password"
                                }
                                required
                            />
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-2">
                            <CreditCard className="text-[#4F46E5]" />
                            <h3 className="text-lg font-black">
                                Rental Plan
                            </h3>
                        </div>

                        {loadingPlans ? (
                            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-5 font-bold text-slate-500">
                                <Loader2 className="animate-spin" />
                                Loading plans…
                            </div>
                        ) : plans.length ===
                          0 ? (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
                                No active rental plans
                                were found. Run the
                                company creation
                                migration first.
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {plans.map(
                                        (plan) => {
                                            const selected =
                                                plan.id ===
                                                planId;

                                            return (
                                                <button
                                                    key={
                                                        plan.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setPlanId(
                                                            plan.id,
                                                        )
                                                    }
                                                    className={`rounded-2xl border p-5 text-left transition ${
                                                        selected
                                                            ? "border-[#4F46E5] bg-[#F7F5FF] ring-2 ring-[#4F46E5]/10"
                                                            : "border-slate-200 bg-white hover:border-indigo-200"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-black">
                                                                {
                                                                    plan.plan_name
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                                {plan.rental_type ===
                                                                "annual"
                                                                    ? "Annual rental"
                                                                    : "Per-event rental"}
                                                            </p>
                                                        </div>

                                                        {selected && (
                                                            <CheckCircle2 className="text-[#4F46E5]" />
                                                        )}
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                                                        <span>
                                                            Events:{" "}
                                                            {limitLabel(
                                                                plan.event_limit,
                                                            )}
                                                        </span>
                                                        <span>
                                                            Team:{" "}
                                                            {limitLabel(
                                                                plan.team_member_limit,
                                                            )}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        },
                                    )}
                                </div>

                                {selectedPlan?.rental_type ===
                                    "annual" && (
                                    <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                                        <div className="flex items-center gap-2">
                                            <CalendarClock className="text-[#4F46E5]" />
                                            <p className="font-black">
                                                Annual access
                                            </p>
                                        </div>

                                        <label className="mt-4 block text-sm font-black text-slate-700">
                                            Subscription
                                            end date
                                            <input
                                                type="date"
                                                required
                                                value={
                                                    subscriptionEndsAt
                                                }
                                                min={
                                                    new Date()
                                                        .toISOString()
                                                        .slice(
                                                            0,
                                                            10,
                                                        )
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setSubscriptionEndsAt(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                            />
                                        </label>
                                    </div>
                                )}

                                {selectedPlan?.rental_type ===
                                    "per_event" && (
                                    <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                                        <div className="flex items-center gap-2">
                                            <Ticket className="text-[#4F46E5]" />
                                            <p className="font-black">
                                                Per-event licences
                                            </p>
                                        </div>

                                        <label className="mt-4 block text-sm font-black text-slate-700">
                                            Number of
                                            available event
                                            licences
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                max={100}
                                                value={
                                                    eventLicenseQuantity
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setEventLicenseQuantity(
                                                        Number(
                                                            event
                                                                .target
                                                                .value,
                                                        ),
                                                    )
                                                }
                                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                            />
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    <div className="rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-5 text-sm leading-6 text-slate-700">
                        The administrator account will be active immediately.
                        Share the email and password with the company through
                        your approved secure channel. RegiGo does not save the
                        plain-text password in a database table.
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={close}
                            disabled={working}
                            className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-slate-700 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                working ||
                                loadingPlans ||
                                !planId ||
                                !companyName.trim() ||
                                !companySlug.trim() ||
                                !adminFullName.trim() ||
                                !adminEmail.trim() ||
                                adminPassword.length < 8 ||
                                adminPassword !==
                                    confirmAdminPassword
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {working ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Plus size={17} />
                            )}
                            Create Company
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (
        value: string,
    ) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block text-sm font-black text-slate-700">
            {label}
            <input
                type={type}
                required={required}
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target.value,
                    )
                }
                placeholder={
                    placeholder
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#4F46E5]"
            />
        </label>
    );
}

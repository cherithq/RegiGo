import {
    BadgeCheck,
    CalendarDays,
    Check,
    Clock3,
    CreditCard,
    ShieldCheck,
    Users,
} from "lucide-react";
import {
    evaluateEventCreation,
    getCurrentCompanyContext,
} from "@/lib/company-access";
import {
    formatPlanLimit,
    formatRentalType,
} from "@/lib/rental-plans";

export const dynamic = "force-dynamic";

function formatDate(
    value: string | null | undefined,
) {
    if (!value) return "No expiry date";

    return new Intl.DateTimeFormat(
        "en-SG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    ).format(new Date(value));
}

function labelFromFeature(key: string) {
    const aliases: Record<string, string> = {
        stripe_payments:
            "Stripe Ticket Payments",
        guest_invitations:
            "Guest Invitations & RSVP",
        guest_table_selection:
            "Guest Table Selection",
        badge_designer:
            "Badge Designer",
        direct_printing:
            "Direct Badge Printing",
        email_centre: "Email Centre",
        lucky_draw: "Lucky Draw",
        tournament: "Tournament",
        payments: "Payments",
    };

    return (
        aliases[key] ||
        key
            .split("_")
            .map(
                (word) =>
                    word.charAt(0).toUpperCase() +
                    word.slice(1),
            )
            .join(" ")
    );
}

export default async function RentalPlanPage() {
    const context =
        await getCurrentCompanyContext();
    const permission =
        evaluateEventCreation(context);
    const features = Object.entries(
        context.plan?.features || {},
    )
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .filter(
            (key) =>
                key !== "payments" ||
                !context.plan?.features
                    ?.stripe_payments,
        );

    const platform = context.isPlatformAdmin;

    return (
        <div className="space-y-7">
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                <div className="absolute bottom-0 right-32 h-64 w-64 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                        {platform ? (
                            <ShieldCheck
                                size={16}
                            />
                        ) : (
                            <CreditCard
                                size={16}
                            />
                        )}
                        {platform
                            ? "Platform Access"
                            : "Rental Plan"}
                    </div>

                    <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                        {context.plan
                            ?.plan_name ||
                            "No plan assigned"}
                    </h1>

                    <p className="mt-3 text-base font-semibold text-slate-500">
                        {context.company
                            .company_name}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                            {platform
                                ? "Unrestricted administrator"
                                : `Company: ${context.company.status}`}
                        </span>

                        {!platform && (
                            <span className="rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                                {formatRentalType(
                                    context.plan
                                        ?.rental_type,
                                )}
                            </span>
                        )}

                        <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                            {platform
                                ? "Unlimited events"
                                : permission.allowed
                                  ? "Can create event"
                                  : "Event limit reached"}
                        </span>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label={
                        platform
                            ? "Platform events"
                            : "Events used"
                    }
                    value={
                        platform
                            ? `${context.eventCount} / Unlimited`
                            : context.plan
                                    ?.event_limit ==
                                null
                              ? String(
                                    context.eventCount,
                                )
                              : `${context.eventCount} / ${context.plan.event_limit}`
                    }
                    icon={CalendarDays}
                />

                <SummaryCard
                    label="Platform team"
                    value={
                        platform
                            ? `${context.teamMemberCount} / Unlimited`
                            : context.plan
                                    ?.team_member_limit ==
                                null
                              ? String(
                                    context.teamMemberCount,
                                )
                              : `${context.teamMemberCount} / ${context.plan.team_member_limit}`
                    }
                    icon={Users}
                />

                <SummaryCard
                    label={
                        platform
                            ? "Add-on access"
                            : "Available event licences"
                    }
                    value={
                        platform
                            ? "All"
                            : String(
                                  context.availableEventLicenses,
                              )
                    }
                    icon={BadgeCheck}
                />

                <SummaryCard
                    label={
                        platform
                            ? "Access expiry"
                            : "Plan expiry"
                    }
                    value={
                        platform
                            ? "Never"
                            : formatDate(
                                  context
                                      .subscription
                                      ?.ends_at,
                              )
                    }
                    icon={Clock3}
                    small
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <h2 className="text-2xl font-black">
                        {platform
                            ? "Administrator features"
                            : "Available plan features"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {platform
                            ? "The platform administrator can access every current and future RegiGo add-on. Each event may still toggle optional add-ons on or off."
                            : "The company can enable or disable an available add-on separately for each event."}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {features.map(
                            (feature) => (
                                <div
                                    key={
                                        feature
                                    }
                                    className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                        <Check
                                            size={
                                                17
                                            }
                                        />
                                    </span>
                                    <span className="font-black text-slate-800">
                                        {labelFromFeature(
                                            feature,
                                        )}
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <h2 className="text-2xl font-black">
                        {platform
                            ? "Platform permissions"
                            : "Plan limits"}
                    </h2>

                    <dl className="mt-6 space-y-4">
                        {platform ? (
                            <>
                                <LimitRow
                                    label="Event access"
                                    value="All companies"
                                />
                                <LimitRow
                                    label="Event creation"
                                    value="Unlimited"
                                />
                                <LimitRow
                                    label="Add-ons"
                                    value="All available"
                                />
                                <LimitRow
                                    label="Customer plan"
                                    value="Not applicable"
                                />
                            </>
                        ) : (
                            <>
                                <LimitRow
                                    label="Rental type"
                                    value={formatRentalType(
                                        context.plan
                                            ?.rental_type,
                                    )}
                                />
                                <LimitRow
                                    label="Event limit"
                                    value={formatPlanLimit(
                                        context.plan
                                            ?.event_limit,
                                    )}
                                />
                                <LimitRow
                                    label="Team-member limit"
                                    value={formatPlanLimit(
                                        context.plan
                                            ?.team_member_limit,
                                    )}
                                />
                                <LimitRow
                                    label="Subscription status"
                                    value={
                                        context
                                            .subscription
                                            ?.status ||
                                        "Not required"
                                    }
                                />
                            </>
                        )}
                    </dl>

                    {!platform &&
                        !permission.allowed && (
                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-bold text-amber-800">
                                {
                                    permission.reason
                                }
                            </div>
                        )}
                </div>
            </section>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
    small = false,
}: {
    label: string;
    value: string;
    icon: typeof CalendarDays;
    small?: boolean;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon size={23} />
            </div>
            <p className="mt-5 text-sm font-bold text-slate-500">
                {label}
            </p>
            <p
                className={`mt-2 font-black tracking-tight text-slate-950 ${
                    small
                        ? "text-xl"
                        : "text-3xl"
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function LimitRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">
            <dt className="text-sm font-bold text-slate-500">
                {label}
            </dt>
            <dd className="text-right font-black capitalize text-slate-900">
                {value}
            </dd>
        </div>
    );
}

import Link from "next/link";
import {
    redirect,
} from "next/navigation";
import {
    revalidatePath,
} from "next/cache";
import {
    createClient,
} from "@supabase/supabase-js";
import {
    getPublicInvitation,
    InvitationError,
} from "@/lib/guest-invitations";

export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

type PageProps = {
    params: Promise<{
        slug: string;
        token: string;
    }>;
    searchParams?: Promise<{
        message?:
            | string
            | string[];
        error?:
            | string
            | string[];
    }>;
};

type EventRow = {
    id: string;
    event_name:
        | string
        | null;
    event_slug:
        | string
        | null;
    event_date:
        | string
        | null;
    event_time:
        | string
        | null;
    venue:
        | string
        | null;
    description:
        | string
        | null;
};

type InvitationRow = {
    id: string;
    event_id:
        | string
        | null;
    registration_id:
        | string
        | null;
    status?:
        | string
        | null;
    rsvp_status?:
        | string
        | null;
    opened_at?:
        | string
        | null;
};

type RegistrationRow = {
    id: string;
    event_id: string;
    full_name:
        | string
        | null;
    email:
        | string
        | null;
    phone?:
        | string
        | null;
    department?:
        | string
        | null;
    rsvp_status:
        | string
        | null;
    registration_status:
        | string
        | null;
    payment_status:
        | string
        | null;
    selected_ticket_quantity?:
        | number
        | null;
    table_selection_status?:
        | string
        | null;
};

type TableAssignmentRow = {
    table_id:
        | string
        | null;
};

type EventTableRow = {
    id: string;
    table_name:
        | string
        | null;
    selection_label?:
        | string
        | null;
};

function serviceClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (
        !url ||
        !serviceRoleKey
    ) {
        throw new Error(
            "Supabase server configuration is incomplete.",
        );
    }

    return createClient(
        url,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken:
                    false,
                persistSession:
                    false,
            },
        },
    );
}

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

async function updateRsvp(
    formData: FormData,
) {
    "use server";

    const slug =
        String(
            formData.get(
                "slug",
            ) ||
                "",
        ).trim();
    const token =
        String(
            formData.get(
                "token",
            ) ||
                "",
        ).trim();
    const response =
        String(
            formData.get(
                "response",
            ) ||
                "",
        )
            .trim()
            .toLowerCase();
    const declineReason =
        String(
            formData.get(
                "declineReason",
            ) ||
                "",
        )
            .trim()
            .slice(0, 500);
    const rawPartySize =
        Number(
            formData.get(
                "partySize",
            ),
        );
    const partySize =
        Number.isInteger(
            rawPartySize,
        ) &&
        rawPartySize >
            0
            ? Math.min(
                  rawPartySize,
                  20,
              )
            : 1;

    if (
        !slug ||
        !token ||
        ![
            "accepted",
            "declined",
        ].includes(
            response,
        )
    ) {
        redirect(
            `/event/${encodeURIComponent(
                slug,
            )}/invite/${encodeURIComponent(
                token,
            )}?error=${encodeURIComponent(
                "The RSVP response is invalid.",
            )}`,
        );
    }

    let invitation;

    try {
        const result =
            await getPublicInvitation(
                {
                    slug,
                    token,
                },
            );
        invitation =
            result.invitation;
    } catch (error) {
        redirect(
            `/event/${encodeURIComponent(
                slug,
            )}/invite/${encodeURIComponent(
                token,
            )}?error=${encodeURIComponent(
                error instanceof
                    InvitationError
                    ? error.message
                    : "The invitation is invalid or has expired.",
            )}`,
        );
    }

    if (
        !invitation.registration_id
    ) {
        redirect(
            `/event/${encodeURIComponent(
                slug,
            )}/invite/${encodeURIComponent(
                token,
            )}?error=${encodeURIComponent(
                "The invitation is invalid or has expired.",
            )}`,
        );
    }

    const admin =
        serviceClient();
    const eventJoined =
        Array.isArray(
            invitation.events,
        )
            ? invitation
                  .events[0]
            : invitation.events;

    const registrationStatus =
        response ===
        "accepted"
            ? "confirmed"
            : "declined";

    const registrationResult =
        await admin
            .from(
                "registrations",
            )
            .update({
                rsvp_status:
                    response,
                registration_status:
                    registrationStatus,
                ...(response ===
                "accepted"
                    ? {
                          selected_ticket_quantity:
                              partySize,
                      }
                    : {}),
            })
            .eq(
                "id",
                invitation.registration_id,
            )
            .eq(
                "event_id",
                eventJoined?.id,
            );

    if (
        registrationResult.error
    ) {
        redirect(
            `/event/${encodeURIComponent(
                slug,
            )}/invite/${encodeURIComponent(
                token,
            )}?error=${encodeURIComponent(
                registrationResult
                    .error
                    .message,
            )}`,
        );
    }

    const invitationUpdate =
        await admin
            .from(
                "event_invitations",
            )
            .update({
                status:
                    response,
                responded_at:
                    new Date()
                        .toISOString(),
                ...(response ===
                "declined"
                    ? {
                          decline_reason:
                              declineReason ||
                              null,
                      }
                    : {}),
            })
            .eq(
                "id",
                invitation.id,
            );

    if (
        invitationUpdate.error &&
        !isCompatibilityError(
            invitationUpdate.error,
        )
    ) {
        console.error(
            "Unable to update invitation status:",
            invitationUpdate
                .error
                .message,
        );
    }

    const path =
        `/event/${encodeURIComponent(
            slug,
        )}/invite/${encodeURIComponent(
            token,
        )}`;

    revalidatePath(
        path,
    );

    redirect(
        `${path}?message=${encodeURIComponent(
            response ===
            "accepted"
                ? "Your attendance has been confirmed."
                : "Your response has been recorded.",
        )}`,
    );
}

function formatDate(
    value:
        | string
        | null,
) {
    if (
        !value
    ) {
        return "Date to be confirmed";
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
                "long",
            year:
                "numeric",
        },
    ).format(
        date,
    );
}

function firstQueryValue(
    value:
        | string
        | string[]
        | undefined,
) {
    return Array.isArray(
        value,
    )
        ? value[0] ||
              ""
        : value ||
              "";
}

function normaliseStatus(
    value:
        | string
        | null
        | undefined,
) {
    return String(
        value ||
            "",
    )
        .trim()
        .toLowerCase();
}

function StatusBadge({
    value,
}: {
    value: string;
}) {
    const accepted =
        value ===
        "accepted";
    const declined =
        value ===
        "declined";

    return (
        <span
            className={[
                "inline-flex rounded-full px-3 py-1.5 text-xs font-black",
                accepted
                    ? "bg-emerald-100 text-emerald-700"
                    : declined
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700",
            ].join(
                " ",
            )}
        >
            {accepted
                ? "Attending"
                : declined
                  ? "Not attending"
                  : "Awaiting response"}
        </span>
    );
}

function ErrorState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <main className="min-h-screen bg-[#F7F5FF] px-4 py-10 text-slate-950">
            <section className="mx-auto max-w-xl rounded-[2rem] border border-red-200 bg-white p-7 text-center shadow-sm sm:p-10">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                    !
                </div>

                <h1 className="mt-5 text-2xl font-black text-red-600">
                    {
                        title
                    }
                </h1>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    {
                        description
                    }
                </p>
            </section>
        </main>
    );
}

export default async function InvitePage({
    params,
    searchParams,
}: PageProps) {
    const {
        slug,
        token,
    } =
        await params;
    const query =
        searchParams
            ? await searchParams
            : {};
    const message =
        firstQueryValue(
            query.message,
        );
    const queryError =
        firstQueryValue(
            query.error,
        );

    const admin =
        serviceClient();

    let invitation;

    try {
        const result =
            await getPublicInvitation(
                {
                    slug,
                    token,
                    markOpened: true,
                },
            );
        invitation =
            result.invitation;
    } catch (error) {
        return (
            <ErrorState
                title="Invitation not found"
                description={
                    error instanceof
                    InvitationError
                        ? error.message
                        : "This invitation link is invalid, expired or no longer available."
                }
            />
        );
    }

    const eventJoined =
        Array.isArray(
            invitation.events,
        )
            ? invitation
                  .events[0]
            : invitation.events;
    const registrationJoined =
        Array.isArray(
            invitation.registrations,
        )
            ? invitation
                  .registrations[0]
            : invitation.registrations;

    if (
        !eventJoined
    ) {
        return (
            <ErrorState
                title="Event not found"
                description="This event link is invalid or the event is no longer available."
            />
        );
    }

    if (
        !registrationJoined
    ) {
        return (
            <ErrorState
                title="Guest record not found"
                description="The guest registration connected to this invitation could not be found."
            />
        );
    }

    const event =
        eventJoined as unknown as EventRow;
    const registration =
        registrationJoined as unknown as RegistrationRow;

    const [
        paymentAddonResult,
        ticketCountResult,
        tableSettingsResult,
        tableCountResult,
        assignmentResult,
    ] =
        await Promise.all([
            admin
                .from(
                    "event_addons",
                )
                .select(
                    "*",
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .eq(
                    "addon_key",
                    "stripe_payments",
                )
                .maybeSingle(),

            admin
                .from(
                    "ticket_types",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                )
                .eq(
                    "event_id",
                    event.id,
                ),

            admin
                .from(
                    "event_table_selection_settings",
                )
                .select(
                    "allow_rsvp_selection, require_paid_ticket, selection_required, instructions",
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .maybeSingle(),

            admin
                .from(
                    "event_tables",
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true,
                    },
                )
                .eq(
                    "event_id",
                    event.id,
                )
                .eq(
                    "guest_selectable",
                    true,
                ),

            // table_assignments.event_id is not reliably populated, so
            // scope by registration_id alone (already unique per guest).
            admin
                .from(
                    "table_assignments",
                )
                .select(
                    "table_id",
                )
                .eq(
                    "registration_id",
                    registration.id,
                )
                .maybeSingle(),
        ]);

    const paymentAddonData =
        paymentAddonResult.data as unknown as
            | Record<
                  string,
                  unknown
              >
            | null;
    const paymentEnabled =
        paymentAddonData?.enabled ===
            true ||
        paymentAddonData?.is_enabled ===
            true;
    const ticketCount =
        ticketCountResult.count ||
        0;
    const rsvpStatus =
        normaliseStatus(
            registration.rsvp_status ||
                registration.registration_status,
        );
    const paymentStatus =
        normaliseStatus(
            registration.payment_status,
        ) ||
        "not_required";
    const accepted =
        rsvpStatus ===
            "accepted" ||
        [
            "confirmed",
            "registered",
            "approved",
        ].includes(
            normaliseStatus(
                registration.registration_status,
            ),
        );
    const declined =
        rsvpStatus ===
        "declined";
    const paymentRequired =
        paymentEnabled &&
        ticketCount >
            0 &&
        ![
            "paid",
            "not_required",
        ].includes(
            paymentStatus,
        );

    const tableSettings =
        tableSettingsResult.data as unknown as
            | {
                  allow_rsvp_selection?:
                      | boolean
                      | null;
                  require_paid_ticket?:
                      | boolean
                      | null;
                  selection_required?:
                      | boolean
                      | null;
                  instructions?:
                      | string
                      | null;
              }
            | null;
    const tableSelectionAvailable =
        tableSettings
            ?.allow_rsvp_selection !==
            false &&
        (
            tableCountResult.count ||
            0
        ) >
            0;
    const tablePaymentBlocked =
        tableSettings
            ?.require_paid_ticket ===
            true &&
        ![
            "paid",
            "not_required",
        ].includes(
            paymentStatus,
        );

    let assignedTable:
        | EventTableRow
        | null =
        null;

    const assignment =
        assignmentResult.data as unknown as
            | TableAssignmentRow
            | null;

    if (
        assignment?.table_id
    ) {
        const assignedTableResult =
            await admin
                .from(
                    "event_tables",
                )
                .select(
                    "id, table_name, selection_label",
                )
                .eq(
                    "id",
                    assignment
                        .table_id,
                )
                .maybeSingle();

        assignedTable =
            (
                assignedTableResult.data ||
                null
            ) as unknown as
                | EventTableRow
                | null;
    }

    const invitePath =
        `/event/${encodeURIComponent(
            slug,
        )}/invite/${encodeURIComponent(
            token,
        )}`;
    const paymentPath =
        `${invitePath}/payment`;
    const tablesPath =
        `${invitePath}/tables`;

    return (
        <main className="min-h-screen bg-[#F7F5FF] px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
            <div className="mx-auto max-w-3xl space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10">
                        <div className="inline-flex rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                            Personal Invitation
                        </div>

                        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                            {event.event_name ||
                                "Event Invitation"}
                        </h1>

                        <p className="mt-3 text-lg font-bold text-slate-600">
                            Welcome,{" "}
                            {registration.full_name ||
                                "Guest"}
                        </p>

                        {event.description && (
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                                {
                                    event.description
                                }
                            </p>
                        )}

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            <Info
                                label="Date"
                                value={formatDate(
                                    event.event_date,
                                )}
                            />
                            <Info
                                label="Time"
                                value={
                                    event.event_time ||
                                    "To be confirmed"
                                }
                            />
                            <Info
                                label="Venue"
                                value={
                                    event.venue ||
                                    "To be confirmed"
                                }
                            />
                        </div>
                    </div>
                </section>

                {message && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                        {
                            message
                        }
                    </div>
                )}

                {queryError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                        {
                            queryError
                        }
                    </div>
                )}

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                RSVP Status
                            </p>
                            <h2 className="mt-2 text-2xl font-black">
                                Will you be attending?
                            </h2>
                        </div>

                        <StatusBadge
                            value={
                                declined
                                    ? "declined"
                                    : accepted
                                      ? "accepted"
                                      : "pending"
                            }
                        />
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <form
                            action={
                                updateRsvp
                            }
                            className="space-y-3"
                        >
                            <input
                                type="hidden"
                                name="slug"
                                value={
                                    slug
                                }
                            />
                            <input
                                type="hidden"
                                name="token"
                                value={
                                    token
                                }
                            />
                            <input
                                type="hidden"
                                name="response"
                                value="accepted"
                            />

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                                    Guests attending
                                    (including you)
                                </span>
                                <input
                                    type="number"
                                    name="partySize"
                                    min={
                                        1
                                    }
                                    max={
                                        20
                                    }
                                    defaultValue={
                                        registration.selected_ticket_quantity ||
                                        1
                                    }
                                    className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-950 outline-none focus:border-[#4F46E5]"
                                />
                            </label>

                            <button
                                type="submit"
                                className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white shadow-lg"
                            >
                                Accept Invitation
                            </button>
                        </form>

                        <form
                            action={
                                updateRsvp
                            }
                        >
                            <input
                                type="hidden"
                                name="slug"
                                value={
                                    slug
                                }
                            />
                            <input
                                type="hidden"
                                name="token"
                                value={
                                    token
                                }
                            />
                            <input
                                type="hidden"
                                name="response"
                                value="declined"
                            />

                            <label className="mb-3 block">
                                <span className="mb-2 block text-sm font-bold text-slate-500">
                                    Let the organiser know why (optional)
                                </span>
                                <textarea
                                    name="declineReason"
                                    rows={2}
                                    maxLength={500}
                                    placeholder="e.g. Scheduling conflict"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                />
                            </label>

                            <button
                                type="submit"
                                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-600"
                            >
                                Decline Invitation
                            </button>
                        </form>
                    </div>
                </section>

                {accepted && (
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F46E5]">
                            Next Step
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Complete your event setup
                        </h2>

                        <div className="mt-6 space-y-4">
                            {paymentRequired && (
                                <ActionCard
                                    title="Complete ticket payment"
                                    description="Your attendance is accepted. Complete payment before continuing."
                                    href={
                                        paymentPath
                                    }
                                    buttonLabel="Continue to Payment"
                                />
                            )}

                            {!paymentRequired &&
                                tableSelectionAvailable &&
                                !tablePaymentBlocked && (
                                    <ActionCard
                                        title={
                                            assignedTable
                                                ? "Your selected table"
                                                : "Choose your table"
                                        }
                                        description={
                                            assignedTable
                                                ? `You are assigned to ${
                                                      assignedTable.selection_label ||
                                                      assignedTable.table_name ||
                                                      "your selected table"
                                                  }.`
                                                : tableSettings?.instructions ||
                                                  "Choose an available table for your party."
                                        }
                                        href={
                                            tablesPath
                                        }
                                        buttonLabel={
                                            assignedTable
                                                ? "View or Change Table"
                                                : "Choose a Table"
                                        }
                                    />
                                )}

                            {!paymentRequired &&
                                (
                                    !tableSelectionAvailable ||
                                    tablePaymentBlocked
                                ) && (
                                    <div className="rounded-2xl bg-emerald-50 p-5">
                                        <p className="font-black text-emerald-700">
                                            Your RSVP is complete.
                                        </p>

                                        <p className="mt-2 text-sm font-semibold leading-6 text-emerald-700/80">
                                            No further action is required at this time.
                                        </p>
                                    </div>
                                )}
                        </div>
                    </section>
                )}

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-black">
                        Guest details
                    </h2>

                    <dl className="mt-4 space-y-3 text-sm">
                        <Detail
                            label="Name"
                            value={
                                registration.full_name ||
                                "Not provided"
                            }
                        />
                        <Detail
                            label="Email"
                            value={
                                registration.email ||
                                "Not provided"
                            }
                        />
                        <Detail
                            label="Payment"
                            value={
                                paymentStatus
                                    .replace(
                                        /_/g,
                                        " ",
                                    )
                                    .replace(
                                        /\b\w/g,
                                        (
                                            character,
                                        ) =>
                                            character.toUpperCase(),
                                    )
                            }
                        />
                        {assignedTable && (
                            <Detail
                                label="Table"
                                value={
                                    assignedTable.selection_label ||
                                    assignedTable.table_name ||
                                    "Selected"
                                }
                            />
                        )}
                    </dl>
                </section>

                <p className="pb-6 text-center text-xs font-semibold text-slate-400">
                    Powered by RegiGo
                </p>
            </div>
        </main>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {
                    label
                }
            </p>

            <p className="mt-2 font-black text-slate-800">
                {
                    value
                }
            </p>
        </div>
    );
}

function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="font-bold text-slate-400">
                {
                    label
                }
            </dt>
            <dd className="break-words font-black text-slate-700">
                {
                    value
                }
            </dd>
        </div>
    );
}

function ActionCard({
    title,
    description,
    href,
    buttonLabel,
}: {
    title: string;
    description: string;
    href: string;
    buttonLabel: string;
}) {
    return (
        <div className="rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-5">
            <h3 className="text-lg font-black text-slate-900">
                {
                    title
                }
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {
                    description
                }
            </p>

            <Link
                href={
                    href
                }
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#4F46E5] px-5 py-3 font-black text-white sm:w-auto"
            >
                {
                    buttonLabel
                }
            </Link>
        </div>
    );
}
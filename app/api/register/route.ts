import {
    NextResponse,
} from "next/server";
import {
    createClient,
} from "@supabase/supabase-js";
import {
    PaymentError,
    createTicketCheckoutSession,
    isPlatformCompany,
    registrationCheckoutUrls,
} from "@/lib/stripe-payments";

export const runtime =
    "nodejs";
export const dynamic =
    "force-dynamic";

function adminClient() {
    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Supabase service-role configuration is missing.",
        );
    }

    return createClient(
        url,
        key,
        {
            auth: {
                persistSession:
                    false,
                autoRefreshToken:
                    false,
                detectSessionInUrl:
                    false,
            },
        },
    );
}

function text(
    value: unknown,
    max = 1000,
) {
    return typeof value ===
        "string"
        ? value
              .trim()
              .slice(
                  0,
                  max,
              )
        : "";
}

function quantity(
    value: unknown,
) {
    const number =
        Number(value);

    return Number.isInteger(
        number,
    ) &&
        number > 0 &&
        number <= 100
        ? number
        : 1;
}

function moneyValue(
    ticket:
        | Record<
              string,
              unknown
          >
        | null,
) {
    if (!ticket) {
        return 0;
    }

    for (const key of [
        "price_cents",
        "amount_cents",
        "unit_amount",
    ]) {
        const value =
            Number(
                ticket[key],
            );

        if (
            Number.isFinite(
                value,
            ) &&
            value > 0
        ) {
            return value;
        }
    }

    for (const key of [
        "price",
        "amount",
        "ticket_price",
    ]) {
        const value =
            Number(
                ticket[key],
            );

        if (
            Number.isFinite(
                value,
            ) &&
            value > 0
        ) {
            return Math.round(
                value * 100,
            );
        }
    }

    return 0;
}

async function triggerEmailWorker(
    request: Request,
) {
    try {
        const url =
            new URL(
                "/api/email-worker/trigger",
                request.url,
            );
        const response =
            await fetch(url, {
                method: "POST",
                cache: "no-store",
            });

        return response.ok;
    } catch {
        return false;
    }
}

export async function POST(
    request: Request,
) {
    const admin =
        adminClient();
    let registrationId = "";

    try {
        const body =
            (await request.json()) as {
                eventId?: unknown;
                answers?: unknown;
            };
        const eventId =
            text(
                body.eventId,
                80,
            );
        const answers =
            body.answers &&
            typeof body.answers ===
                "object" &&
            !Array.isArray(
                body.answers,
            )
                ? body.answers as Record<
                      string,
                      unknown
                  >
                : null;

        if (
            !eventId ||
            !answers
        ) {
            return NextResponse.json(
                {
                    error:
                        "Missing eventId or answers.",
                },
                {
                    status: 400,
                },
            );
        }

        const [
            eventResult,
            settingsResult,
            addonResult,
            tableSettingsResult,
            selectableTableCountResult,
        ] =
            await Promise.all([
                admin
                    .from("events")
                    .select("*")
                    .eq(
                        "id",
                        eventId,
                    )
                    .maybeSingle(),

                admin
                    .from(
                        "event_settings",
                    )
                    .select(
                        "registration_is_open, registration_closed_message, registration_mode",
                    )
                    .eq(
                        "event_id",
                        eventId,
                    )
                    .maybeSingle(),

                admin
                    .from(
                        "event_addons",
                    )
                    .select(
                        "enabled",
                    )
                    .eq(
                        "event_id",
                        eventId,
                    )
                    .eq(
                        "addon_key",
                        "guest_table_selection",
                    )
                    .maybeSingle(),

                admin
                    .from(
                        "event_table_selection_settings",
                    )
                    .select(
                        "allow_registration_selection, selection_required, require_paid_ticket",
                    )
                    .eq(
                        "event_id",
                        eventId,
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
                            head: true,
                        },
                    )
                    .eq(
                        "event_id",
                        eventId,
                    )
                    .eq(
                        "guest_selectable",
                        true,
                    )
                    .gt(
                        "table_capacity",
                        0,
                    ),
            ]);

        if (
            eventResult.error ||
            !eventResult.data
        ) {
            return NextResponse.json(
                {
                    error:
                        eventResult.error
                            ?.message ||
                        "Event not found.",
                },
                {
                    status:
                        eventResult.error
                            ? 400
                            : 404,
                },
            );
        }

        const event =
            eventResult.data;

        if (
            settingsResult.data
                ?.registration_mode ===
            "invitation_only"
        ) {
            return NextResponse.json(
                {
                    error: "This event is by invitation only. Use the personal invite link sent to you to RSVP.",
                },
                {
                    status: 403,
                },
            );
        }

        const registrationOpen =
            event.status ===
                "published" &&
            event.registration_open !==
                false &&
            settingsResult.data
                ?.registration_is_open !==
                false;

        if (!registrationOpen) {
            return NextResponse.json(
                {
                    error:
                        settingsResult
                            .data
                            ?.registration_closed_message ||
                        "Registration is currently closed for this event.",
                },
                {
                    status: 403,
                },
            );
        }

        const fullName =
            text(
                answers.full_name ??
                    answers.name ??
                    answers.guest_name,
                180,
            );
        const email =
            text(
                answers.email,
                320,
            ).toLowerCase();

        if (
            fullName.length <
                2 ||
            !email.includes("@")
        ) {
            return NextResponse.json(
                {
                    error:
                        "Full name and a valid email address are required.",
                },
                {
                    status: 400,
                },
            );
        }

        const ticketTypeId =
            text(
                answers.ticket_type_id,
                80,
            ) || null;

        if (
            event.enable_ticket_types &&
            !ticketTypeId
        ) {
            return NextResponse.json(
                {
                    error:
                        "Ticket type is required.",
                },
                {
                    status: 400,
                },
            );
        }

        let ticket:
            | Record<
                  string,
                  unknown
              >
            | null = null;

        if (ticketTypeId) {
            const {
                data,
                error,
            } = await admin
                .from(
                    "ticket_types",
                )
                .select("*")
                .eq(
                    "id",
                    ticketTypeId,
                )
                .eq(
                    "event_id",
                    eventId,
                )
                .maybeSingle();

            if (
                error ||
                !data
            ) {
                return NextResponse.json(
                    {
                        error:
                            error?.message ||
                            "The selected ticket is unavailable.",
                    },
                    {
                        status:
                            error
                                ? 400
                                : 409,
                    },
                );
            }

            ticket =
                data as Record<
                    string,
                    unknown
                >;
        }

        const selectedQuantity =
            quantity(
                answers.selected_ticket_quantity ??
                    answers.ticket_quantity ??
                    answers.quantity,
            );
        const paymentStatus =
            moneyValue(ticket) >
            0
                ? "pending"
                : "not_required";
        const tableAddonEnabled =
            addonResult.data
                ?.enabled ===
            true;
        const tableSettings =
            tableSettingsResult.data;
        if (
            selectableTableCountResult.error
        ) {
            return NextResponse.json(
                {
                    error:
                        selectableTableCountResult
                            .error
                            .message,
                },
                {
                    status: 400,
                },
            );
        }

        const hasSelectableTables =
            Number(
                selectableTableCountResult.count ||
                    0,
            ) > 0;
        const tableFlowAllowed =
            tableAddonEnabled &&
            tableSettings
                ?.allow_registration_selection !==
                false;
        const tableFlowRequested =
            tableFlowAllowed &&
            hasSelectableTables;

        if (
            tableFlowAllowed &&
            tableSettings
                ?.selection_required ===
                true &&
            !hasSelectableTables
        ) {
            return NextResponse.json(
                {
                    error:
                        "Registration requires table selection, but the event company has not made any tables available.",
                },
                {
                    status: 409,
                },
            );
        }

        const {
            data: registration,
            error:
                registrationError,
        } = await admin
            .from(
                "registrations",
            )
            .insert({
                event_id:
                    eventId,
                full_name:
                    fullName,
                email,
                phone:
                    text(
                        answers.phone,
                        80,
                    ) || null,
                country_code:
                    text(
                        answers.country_code,
                        12,
                    ) ||
                    "+65",
                department:
                    text(
                        answers.department,
                        160,
                    ) || null,
                dietary_request:
                    text(
                        answers.dietary_request ??
                            answers.dietary,
                        1000,
                    ) || null,
                require_transport:
                    text(
                        answers.require_transport,
                        80,
                    ) || null,
                ticket_type_id:
                    ticketTypeId,
                selected_ticket_quantity:
                    selectedQuantity,
                custom_answers:
                    answers,
                registration_status:
                    "confirmed",
                rsvp_status:
                    "accepted",
                payment_status:
                    paymentStatus,
                table_selection_status:
                    "not_selected",
                email_verified:
                    false,
            })
            .select("*")
            .single();

        if (
            registrationError ||
            !registration
        ) {
            return NextResponse.json(
                {
                    error:
                        registrationError
                            ?.message ||
                        "Unable to create registration.",
                },
                {
                    status: 500,
                },
            );
        }

        registrationId =
            String(
                registration.id,
            );
        const qrToken =
            crypto.randomUUID();
        const paymentRequired =
            paymentStatus ===
            "pending";
        const tableSelectionRequired =
            tableFlowAllowed &&
            tableSettings
                ?.selection_required ===
                true;

        const {
            error: qrError,
        } = await admin
            .from(
                "qr_tickets",
            )
            .insert({
                registration_id:
                    registrationId,
                event_id:
                    eventId,
                qr_token:
                    qrToken,
                is_active:
                    !paymentRequired &&
                    !tableSelectionRequired,
            });

        if (qrError) {
            await admin
                .from(
                    "registrations",
                )
                .delete()
                .eq(
                    "id",
                    registrationId,
                );

            return NextResponse.json(
                {
                    error:
                        qrError.message,
                },
                {
                    status: 500,
                },
            );
        }

        const slug =
            String(
                event.event_slug ||
                    event.slug ||
                    event.id,
            );
        const qrPassUrl =
            `/event/${encodeURIComponent(
                slug,
            )}/pass?registration=${encodeURIComponent(
                registrationId,
            )}`;
        const paymentAllowsTable =
            tableSettings
                ?.require_paid_ticket !==
                true ||
            [
                "paid",
                "not_required",
            ].includes(
                paymentStatus,
            );
        const tableSelectionUrl =
            tableFlowRequested &&
            paymentAllowsTable
                ? `/event/${encodeURIComponent(
                      slug,
                  )}/registration/${encodeURIComponent(
                      qrToken,
                  )}/tables`
                : null;

        if (paymentRequired) {
            const [
                stripeAddonResult,
                companyResult,
            ] = await Promise.all([
                admin
                    .from(
                        "event_addons",
                    )
                    .select(
                        "enabled",
                    )
                    .eq(
                        "event_id",
                        eventId,
                    )
                    .eq(
                        "addon_key",
                        "stripe_payments",
                    )
                    .maybeSingle(),

                admin
                    .from(
                        "companies",
                    )
                    .select(
                        "id, stripe_connected_account_id, stripe_charges_enabled",
                    )
                    .eq(
                        "id",
                        event.company_id,
                    )
                    .maybeSingle(),
            ]);

            const company =
                companyResult.data;
            const stripeAddonEnabled =
                stripeAddonResult
                    .data
                    ?.enabled ===
                true;
            const usesPlatform =
                Boolean(
                    company,
                ) &&
                isPlatformCompany(
                    company!.id,
                );
            const companyReady =
                Boolean(
                    company,
                ) &&
                (
                    usesPlatform ||
                    (
                        Boolean(
                            company!
                                .stripe_connected_account_id,
                        ) &&
                        Boolean(
                            company!
                                .stripe_charges_enabled,
                        )
                    )
                );

            if (
                !stripeAddonEnabled ||
                !companyReady
            ) {
                await admin
                    .from(
                        "qr_tickets",
                    )
                    .delete()
                    .eq(
                        "registration_id",
                        registrationId,
                    );
                await admin
                    .from(
                        "registrations",
                    )
                    .delete()
                    .eq(
                        "id",
                        registrationId,
                    );

                return NextResponse.json(
                    {
                        error:
                            "Ticket payments are not set up for this event yet. Please contact the event organiser.",
                    },
                    {
                        status: 503,
                    },
                );
            }

            const urls =
                registrationCheckoutUrls(
                    {
                        slug,
                        registrationId,
                    },
                );

            try {
                const result =
                    await createTicketCheckoutSession(
                        {
                            admin,
                            eventId,
                            company:
                                company!,
                            usesPlatformStripeAccount:
                                usesPlatform,
                            registrationId,
                            recipientEmail:
                                email,
                            ticketTypeId:
                                ticketTypeId!,
                            quantity:
                                selectedQuantity,
                            ticket:
                                ticket!,
                            successUrl:
                                urls.success,
                            cancelUrl:
                                urls.cancel,
                            buildFreeSuccessUrl:
                                (
                                    orderId,
                                ) =>
                                    `${
                                        urls.success.split(
                                            "?",
                                        )[0]
                                    }` +
                                    `?free_order=${encodeURIComponent(
                                        orderId,
                                    )}` +
                                    `&registration=${encodeURIComponent(
                                        registrationId,
                                    )}`,
                        },
                    );

                return NextResponse.json(
                    {
                        success: true,
                        registrationId,
                        checkoutUrl:
                            result.url,
                        tableSelectionUrl,
                    },
                );
            } catch (
                checkoutError
            ) {
                await admin
                    .from(
                        "qr_tickets",
                    )
                    .delete()
                    .eq(
                        "registration_id",
                        registrationId,
                    );
                await admin
                    .from(
                        "registrations",
                    )
                    .delete()
                    .eq(
                        "id",
                        registrationId,
                    );

                return NextResponse.json(
                    {
                        error:
                            checkoutError instanceof
                            Error
                                ? checkoutError.message
                                : "Unable to start payment.",
                    },
                    {
                        status:
                            checkoutError instanceof
                            PaymentError
                                ? checkoutError.status
                                : 500,
                    },
                );
            }
        }

        // When table selection is still required, the confirmation email
        // (and its QR pass) is deferred until the guest completes it — see
        // activateQrPassIfReady, called from the table-selection confirm
        // route once the table is assigned.
        const emailJobError =
            tableSelectionRequired
                ? null
                : (
                      await admin
                          .from(
                              "email_jobs",
                          )
                          .insert({
                              event_id:
                                  eventId,
                              registration_id:
                                  registrationId,
                              recipient_email:
                                  email,
                              email_type:
                                  "confirmation",
                              status:
                                  "pending",
                              attempts: 0,
                              last_error:
                                  null,
                              sent_at:
                                  null,
                          })
                  ).error;

        const emailTriggered =
            tableSelectionRequired ||
            emailJobError
                ? false
                : await triggerEmailWorker(
                      request,
                  );

        return NextResponse.json({
            success: true,
            registrationId,
            qrPassUrl,
            tableSelectionUrl,
            // The existing DynamicRegistrationForm redirects to passUrl.
            // Returning the table URL here inserts table selection into the
            // registration journey without replacing the entire form component.
            passUrl:
                tableSelectionUrl ||
                qrPassUrl,
            emailQueued:
                !emailJobError,
            emailTriggered,
        });
    } catch (error) {
        if (registrationId) {
            try {
                await admin
                    .from(
                        "qr_tickets",
                    )
                    .delete()
                    .eq(
                        "registration_id",
                        registrationId,
                    );
                await admin
                    .from(
                        "registrations",
                    )
                    .delete()
                    .eq(
                        "id",
                        registrationId,
                    );
            } catch {
                // Preserve the original registration error.
            }
        }

        return NextResponse.json(
            {
                error:
                    error instanceof
                    Error
                        ? error.message
                        : "Registration failed.",
            },
            {
                status: 500,
            },
        );
    }
}

"use client";

import Link from "next/link";
import {
    CheckCircle2,
    CreditCard,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    SlidersHorizontal,
    Ticket,
    Trash2,
    WalletCards,
    X,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type TicketRow = {
    id: string;
    ticket_name: string;
    description: string | null;
    colour:
        | string
        | null;
    price_cents: number;
    currency: string;
    quantity_available: number | null;
    quantity_reserved: number;
    quantity_sold: number;
    min_per_order: number;
    max_per_order: number;
    sales_start: string | null;
    sales_end: string | null;
    is_active: boolean;
};

type OrderRow = {
    id: string;
    order_number: string;
    currency: string;
    total_cents: number;
    status: string;
    registrations:
        | {
              full_name?: string;
              email?: string;
          }
        | {
              full_name?: string;
              email?: string;
          }[]
        | null;
};

type TicketSalesSettings = {
    allow_registration_sales: boolean;
    allow_rsvp_sales: boolean;
    page_title: string | null;
    page_subtitle: string | null;
    banner_color_from: string | null;
    banner_color_to: string | null;
    banner_image_url: string | null;
};

type TicketAppearanceKey =
    | "page_title"
    | "page_subtitle"
    | "banner_color_from"
    | "banner_color_to"
    | "banner_image_url";

type TicketSalesPayload = {
    settings: TicketSalesSettings;
    registrationMode:
        | "invitation_only"
        | "public_registration";
};

type Payload = {
    isPlatformAdmin: boolean;
    company: {
        id: string;
        company_name: string;
        stripe_connected_account_id:
            | string
            | null;
        stripe_charges_enabled: boolean;
        stripe_payouts_enabled: boolean;
    } | null;
    paymentRecipient: {
        companyId: string | null;
        companyName: string;
        usesPlatformStripeAccount: boolean;
        connected: boolean;
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
        stripePaymentsAddonEnabled: boolean;
    };
    tickets: TicketRow[];
    orders: OrderRow[];
};

type FormState = {
    ticketName: string;
    description: string;
    colour: string;
    isPaid: boolean;
    price: string;
    currency: string;
    quantityAvailable: string;
    minPerOrder: string;
    maxPerOrder: string;
    salesStart: string;
    salesEnd: string;
    isActive: boolean;
};

const emptyForm: FormState = {
    ticketName: "",
    description: "",
    colour: "#4F46E5",
    isPaid: false,
    price: "0.00",
    currency: "SGD",
    quantityAvailable: "",
    minPerOrder: "1",
    maxPerOrder: "1",
    salesStart: "",
    salesEnd: "",
    isActive: true,
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
            return JSON.parse(
                raw,
            );
        } catch {
            return {
                error:
                    "The ticket API returned invalid JSON.",
            };
        }
    }

    const isHtml =
        contentType.includes(
            "text/html",
        ) ||
        /^\s*<!doctype html/i.test(
            raw,
        ) ||
        raw.includes(
            "/_next/static/",
        );

    if (isHtml) {
        return {
            error:
                response.status ===
                404
                    ? "The ticket-tier API route is missing."
                    : `The ticket server returned an HTML error page (HTTP ${response.status}).`,
        };
    }

    try {
        return JSON.parse(
            raw,
        );
    } catch {
        return {
            error:
                raw.length >
                500
                    ? `${raw.slice(
                          0,
                          500,
                      )}…`
                    : raw ||
                      "Unable to read the ticket response.",
        };
    }
}

function cents(
    value: string,
) {
    const number =
        Number(value);

    return Number.isFinite(
        number,
    )
        ? Math.round(
              number *
                  100,
          )
        : -1;
}

function money(
    value: number,
    currency: string,
) {
    return new Intl.NumberFormat(
        "en-SG",
        {
            style:
                "currency",
            currency,
        },
    ).format(
        value /
            100,
    );
}

function localDate(
    value: string | null,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);
    const offset =
        date.getTimezoneOffset() *
        60_000;

    return new Date(
        date.getTime() -
            offset,
    )
        .toISOString()
        .slice(
            0,
            16,
        );
}

export default function TicketPaymentsManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(
            null,
        );
    const [form, setForm] =
        useState<FormState>(
            emptyForm,
        );
    const [editingId, setEditingId] =
        useState<string | null>(
            null,
        );
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");
    const [salesSettings, setSalesSettings] =
        useState<TicketSalesPayload | null>(
            null,
        );

    const reloadSalesSettings =
        useCallback(async () => {
            try {
                const response =
                    await fetch(
                        `/api/events/${eventId}/ticket-settings`,
                        {
                            cache: "no-store",
                        },
                    );
                const result =
                    await readJson(
                        response,
                    );

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                            "Unable to load ticket sales settings.",
                    );
                }

                setSalesSettings(
                    result as TicketSalesPayload,
                );
            } catch {
                // Non-fatal — the toggle panel just stays hidden if this
                // fails; the main ticket list above still works.
            }
        }, [eventId]);

    useEffect(() => {
        void reloadSalesSettings();
    }, [reloadSalesSettings]);

    async function updateSalesSetting(
        key: keyof TicketSalesSettings,
        value: boolean,
    ) {
        if (!salesSettings) return;

        setWorking(key);
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/ticket-settings`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        [key]: value,
                    }),
                },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to save ticket sales settings.",
                );
            }

            setSalesSettings(
                result as TicketSalesPayload,
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save ticket sales settings.",
            );
        } finally {
            setWorking("");
        }
    }

    function updateAppearanceField(
        key: TicketAppearanceKey,
        value: string,
    ) {
        setSalesSettings((current) =>
            current
                ? {
                      ...current,
                      settings: {
                          ...current.settings,
                          [key]: value,
                      },
                  }
                : current,
        );
    }

    async function saveAppearance() {
        if (!salesSettings) return;

        setWorking("appearance");
        setMessage("");

        try {
            const response = await fetch(
                `/api/events/${eventId}/ticket-settings`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        page_title:
                            salesSettings.settings
                                .page_title,
                        page_subtitle:
                            salesSettings.settings
                                .page_subtitle,
                        banner_color_from:
                            salesSettings.settings
                                .banner_color_from,
                        banner_color_to:
                            salesSettings.settings
                                .banner_color_to,
                        banner_image_url:
                            salesSettings.settings
                                .banner_image_url,
                    }),
                },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to save the ticket page appearance.",
                );
            }

            setSalesSettings(
                result as TicketSalesPayload,
            );
            setMessage(
                result.message ||
                    "Ticket page appearance updated.",
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to save the ticket page appearance.",
            );
        } finally {
            setWorking("");
        }
    }

    async function uploadTicketBannerImage(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        setWorking("upload");
        setMessage("");

        try {
            const formData = new FormData();
            formData.set("file", file);

            const response = await fetch(
                `/api/events/${eventId}/ticket-settings/assets`,
                {
                    method: "POST",
                    body: formData,
                },
            );
            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                        "Unable to upload the banner image.",
                );
            }

            if (!result.url) {
                throw new Error(
                    "The upload completed without returning an image URL.",
                );
            }

            updateAppearanceField(
                "banner_image_url",
                result.url,
            );
            setMessage(
                "Image uploaded — click Save Appearance to apply it.",
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to upload the banner image.",
            );
        } finally {
            setWorking("");
        }
    }

    const reload =
        useCallback(async () => {
            setLoading(
                true,
            );

            try {
                const response =
                    await fetch(
                        `/api/events/${eventId}/ticket-tiers`,
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
                            "Unable to load tickets.",
                    );
                }

                setData(
                    result as Payload,
                );
                setMessage(
                    "",
                );
            } catch (error) {
                setMessage(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load tickets.",
                );
            } finally {
                setLoading(
                    false,
                );
            }
        }, [eventId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const hasPaidTickets =
        useMemo(
            () =>
                Boolean(
                    data?.tickets.some(
                        (
                            ticket,
                        ) =>
                            ticket.price_cents >
                            0,
                    ),
                ),
            [data],
        );

    const showPaymentGateway =
        hasPaidTickets ||
        form.isPaid;

    function update(
        key: keyof FormState,
        value:
            | string
            | boolean,
    ) {
        setForm(
            (
                current,
            ) => ({
                ...current,
                [key]:
                    value,
            }),
        );
    }

    function reset() {
        setEditingId(
            null,
        );
        setForm(
            emptyForm,
        );
    }

    function edit(
        ticket: TicketRow,
    ) {
        setEditingId(
            ticket.id,
        );
        setForm({
            ticketName:
                ticket.ticket_name,
            description:
                ticket.description ||
                "",
            colour:
                ticket.colour ||
                "#4F46E5",
            isPaid:
                ticket.price_cents >
                0,
            price:
                (
                    ticket.price_cents /
                    100
                ).toFixed(
                    2,
                ),
            currency:
                ticket.currency ||
                "SGD",
            quantityAvailable:
                ticket.quantity_available ===
                null
                    ? ""
                    : String(
                          ticket.quantity_available,
                      ),
            minPerOrder:
                String(
                    ticket.min_per_order,
                ),
            maxPerOrder:
                String(
                    ticket.max_per_order,
                ),
            salesStart:
                localDate(
                    ticket.sales_start,
                ),
            salesEnd:
                localDate(
                    ticket.sales_end,
                ),
            isActive:
                ticket.is_active,
        });

        window.scrollTo({
            top:
                0,
            behavior:
                "smooth",
        });
    }

    async function save(
        event:
            React.FormEvent,
    ) {
        event.preventDefault();
        setWorking(
            "save",
        );
        setMessage(
            "",
        );

        try {
            const priceCents =
                form.isPaid
                    ? cents(
                          form.price,
                      )
                    : 0;

            if (
                form.isPaid &&
                priceCents <=
                    0
            ) {
                throw new Error(
                    "Enter a ticket price greater than 0 for a paid ticket.",
                );
            }

            const response =
                await fetch(
                    `/api/events/${eventId}/ticket-tiers`,
                    {
                        method:
                            editingId
                                ? "PATCH"
                                : "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                ticketId:
                                    editingId,
                                ticketName:
                                    form.ticketName,
                                description:
                                    form.description,
                                colour:
                                    form.colour,
                                priceCents,
                                currency:
                                    form.isPaid
                                        ? form.currency
                                        : "SGD",
                                quantityAvailable:
                                    form.quantityAvailable,
                                minPerOrder:
                                    form.minPerOrder,
                                maxPerOrder:
                                    form.maxPerOrder,
                                salesStart:
                                    form.salesStart,
                                salesEnd:
                                    form.salesEnd,
                                isActive:
                                    form.isActive,
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
                        "Unable to save the ticket.",
                );
            }

            setMessage(
                result.message ||
                    "Ticket saved.",
            );
            reset();
            await reload();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to save the ticket.",
            );
        } finally {
            setWorking(
                "",
            );
        }
    }

    async function remove(
        ticket: TicketRow,
    ) {
        if (
            !window.confirm(
                `Delete ${ticket.ticket_name}?`,
            )
        ) {
            return;
        }

        setWorking(
            `delete:${ticket.id}`,
        );
        setMessage(
            "",
        );

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/ticket-tiers`,
                    {
                        method:
                            "DELETE",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                ticketId:
                                    ticket.id,
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
                        "Unable to delete the ticket.",
                );
            }

            setMessage(
                result.message ||
                    "Ticket deleted.",
            );
            await reload();
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to delete the ticket.",
            );
        } finally {
            setWorking(
                "",
            );
        }
    }

    if (
        loading &&
        !data
    ) {
        return (
            <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#4F46E5]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 font-bold text-red-700">
                {message ||
                    "Tickets could not be loaded."}
            </div>
        );
    }

    const paymentReady =
        data.paymentRecipient
            .chargesEnabled;
    const paymentSetupHref =
        data.paymentRecipient
            .companyId
            ? `/dashboard/payment-setup?companyId=${encodeURIComponent(
                  data
                      .paymentRecipient
                      .companyId,
              )}`
            : "/dashboard/payment-setup";

    return (
        <div className="space-y-6">
            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
                    {
                        message
                    }
                </div>
            )}

            <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
                <form
                    onSubmit={
                        save
                    }
                    className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                <Ticket
                                    size={
                                        20
                                    }
                                />
                            </span>

                            <div>
                                <h2 className="text-xl font-black">
                                    {editingId
                                        ? "Edit Ticket"
                                        : "Add Ticket"}
                                </h2>
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    Free or paid
                                </p>
                            </div>
                        </div>

                        {editingId && (
                            <button
                                type="button"
                                onClick={
                                    reset
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                                aria-label="Cancel editing"
                            >
                                <X
                                    size={
                                        17
                                    }
                                />
                            </button>
                        )}
                    </div>

                    <div className="mt-6 space-y-4">
                        <Field
                            label="Ticket Name"
                            value={
                                form.ticketName
                            }
                            onChange={(
                                value,
                            ) =>
                                update(
                                    "ticketName",
                                    value,
                                )
                            }
                            required
                        />

                        <label>
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Description
                            </span>
                            <textarea
                                value={
                                    form.description
                                }
                                onChange={(
                                    event,
                                ) =>
                                    update(
                                        "description",
                                        event.target
                                            .value,
                                    )
                                }
                                rows={
                                    3
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                            />
                        </label>

                        <ColourField
                            label="Ticket Colour"
                            value={
                                form.colour
                            }
                            onChange={(
                                value,
                            ) =>
                                update(
                                    "colour",
                                    value,
                                )
                            }
                        />

                        <div>
                            <span className="mb-2 block text-sm font-black text-slate-700">
                                Ticket Type
                            </span>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        update(
                                            "isPaid",
                                            false,
                                        )
                                    }
                                    className={`min-h-12 rounded-2xl border px-4 py-3 font-black transition ${
                                        !form.isPaid
                                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 bg-white text-slate-500"
                                    }`}
                                >
                                    Free
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        update(
                                            "isPaid",
                                            true,
                                        )
                                    }
                                    className={`min-h-12 rounded-2xl border px-4 py-3 font-black transition ${
                                        form.isPaid
                                            ? "border-[#4F46E5] bg-[#F7F5FF] text-[#4F46E5]"
                                            : "border-slate-200 bg-white text-slate-500"
                                    }`}
                                >
                                    Paid
                                </button>
                            </div>
                        </div>

                        {form.isPaid && (
                            <div className="grid grid-cols-[1fr_110px] gap-3 rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-4">
                                <Field
                                    label="Price"
                                    value={
                                        form.price
                                    }
                                    onChange={(
                                        value,
                                    ) =>
                                        update(
                                            "price",
                                            value,
                                        )
                                    }
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                />

                                <Field
                                    label="Currency"
                                    value={
                                        form.currency
                                    }
                                    onChange={(
                                        value,
                                    ) =>
                                        update(
                                            "currency",
                                            value.toUpperCase(),
                                        )
                                    }
                                    maxLength={
                                        3
                                    }
                                    required
                                />
                            </div>
                        )}

                        <Field
                            label="Available Quantity"
                            helper="Leave blank for unlimited tickets."
                            value={
                                form.quantityAvailable
                            }
                            onChange={(
                                value,
                            ) =>
                                update(
                                    "quantityAvailable",
                                    value,
                                )
                            }
                            type="number"
                            min="0"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label="Minimum per Order"
                                value={
                                    form.minPerOrder
                                }
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        "minPerOrder",
                                        value,
                                    )
                                }
                                type="number"
                                min="1"
                                required
                            />

                            <Field
                                label="Maximum per Order"
                                value={
                                    form.maxPerOrder
                                }
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        "maxPerOrder",
                                        value,
                                    )
                                }
                                type="number"
                                min="1"
                                required
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                            <Field
                                label="Sales Start"
                                value={
                                    form.salesStart
                                }
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        "salesStart",
                                        value,
                                    )
                                }
                                type="datetime-local"
                            />

                            <Field
                                label="Sales End"
                                value={
                                    form.salesEnd
                                }
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        "salesEnd",
                                        value,
                                    )
                                }
                                type="datetime-local"
                            />
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-black text-slate-700">
                            <input
                                type="checkbox"
                                checked={
                                    form.isActive
                                }
                                onChange={(
                                    event,
                                ) =>
                                    update(
                                        "isActive",
                                        event.target
                                            .checked,
                                    )
                                }
                                className="h-4 w-4"
                            />
                            Active Ticket
                        </label>

                        <button
                            type="submit"
                            disabled={
                                working ===
                                "save"
                            }
                            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-60"
                        >
                            {working ===
                            "save" ? (
                                <Loader2
                                    size={
                                        18
                                    }
                                    className="animate-spin"
                                />
                            ) : editingId ? (
                                <Save
                                    size={
                                        18
                                    }
                                />
                            ) : (
                                <Plus
                                    size={
                                        18
                                    }
                                />
                            )}
                            {editingId
                                ? "Save Changes"
                                : "Add Ticket"}
                        </button>
                    </div>
                </form>

                <div className="space-y-6">
                    {salesSettings && (
                        <section className="rounded-[2rem] border border-indigo-100 bg-[#F7F5FF] p-5 shadow-sm sm:p-6">
                            <p className="text-sm font-black text-[#4F46E5]">
                                Where guests can buy tickets
                            </p>

                            <div className="mt-3 space-y-3">
                                {salesSettings.registrationMode ===
                                    "public_registration" && (
                                    <label className="flex items-start gap-3 rounded-xl bg-white p-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                salesSettings
                                                    .settings
                                                    .allow_registration_sales
                                            }
                                            disabled={
                                                working ===
                                                "allow_registration_sales"
                                            }
                                            onChange={(event) =>
                                                void updateSalesSetting(
                                                    "allow_registration_sales",
                                                    event.target.checked,
                                                )
                                            }
                                            className="mt-1 h-4 w-4 accent-[#4F46E5]"
                                        />
                                        <span>
                                            <span className="block text-sm font-black">
                                                After public registration
                                            </span>
                                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                                Guests see ticket options while submitting the registration form.
                                            </span>
                                        </span>
                                    </label>
                                )}

                                {salesSettings.registrationMode ===
                                    "invitation_only" && (
                                    <label className="flex items-start gap-3 rounded-xl bg-white p-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                salesSettings
                                                    .settings
                                                    .allow_rsvp_sales
                                            }
                                            disabled={
                                                working ===
                                                "allow_rsvp_sales"
                                            }
                                            onChange={(event) =>
                                                void updateSalesSetting(
                                                    "allow_rsvp_sales",
                                                    event.target.checked,
                                                )
                                            }
                                            className="mt-1 h-4 w-4 accent-[#4F46E5]"
                                        />
                                        <span>
                                            <span className="block text-sm font-black">
                                                After accepting an invitation RSVP
                                            </span>
                                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                                Accepted invitees see a Choose Ticket & Pay action on their invitation page.
                                            </span>
                                        </span>
                                    </label>
                                )}
                            </div>
                        </section>
                    )}

                    {salesSettings && (
                        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <p className="text-sm font-black text-slate-700">
                                Page Appearance
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Customise the banner guests see on
                                the ticket purchase page.
                            </p>

                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="mb-2 block text-xs font-black text-slate-500">
                                        Banner Title
                                    </label>
                                    <input
                                        value={
                                            salesSettings.settings
                                                .page_title || ""
                                        }
                                        onChange={(event) =>
                                            updateAppearanceField(
                                                "page_title",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ticket Selection"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-black text-slate-500">
                                        Banner Subtitle
                                    </label>
                                    <textarea
                                        value={
                                            salesSettings.settings
                                                .page_subtitle || ""
                                        }
                                        onChange={(event) =>
                                            updateAppearanceField(
                                                "page_subtitle",
                                                event.target.value,
                                            )
                                        }
                                        rows={2}
                                        placeholder="Choose your ticket and pay securely with Stripe."
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-2 block text-xs font-black text-slate-500">
                                            Gradient From
                                        </label>
                                        <input
                                            type="color"
                                            value={
                                                salesSettings.settings
                                                    .banner_color_from ||
                                                "#4F46E5"
                                            }
                                            onChange={(event) =>
                                                updateAppearanceField(
                                                    "banner_color_from",
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-black text-slate-500">
                                            Gradient To
                                        </label>
                                        <input
                                            type="color"
                                            value={
                                                salesSettings.settings
                                                    .banner_color_to ||
                                                "#EC4899"
                                            }
                                            onChange={(event) =>
                                                updateAppearanceField(
                                                    "banner_color_to",
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-black text-slate-500">
                                        Banner Image
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                                            {working === "upload" ? (
                                                <Loader2
                                                    size={15}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <ImageIcon size={15} />
                                            )}
                                            Upload Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                disabled={
                                                    working === "upload"
                                                }
                                                onChange={
                                                    uploadTicketBannerImage
                                                }
                                            />
                                        </label>

                                        {salesSettings.settings
                                            .banner_image_url && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateAppearanceField(
                                                        "banner_image_url",
                                                        "",
                                                    )
                                                }
                                                className="text-xs font-black text-red-600"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="overflow-hidden rounded-2xl p-4 text-white shadow-sm"
                                    style={{
                                        backgroundImage:
                                            salesSettings.settings
                                                .banner_image_url
                                                ? `linear-gradient(rgba(2,6,23,.35), rgba(2,6,23,.55)), url("${salesSettings.settings.banner_image_url}")`
                                                : `linear-gradient(to right, ${
                                                      salesSettings
                                                          .settings
                                                          .banner_color_from ||
                                                      "#4F46E5"
                                                  }, ${
                                                      salesSettings
                                                          .settings
                                                          .banner_color_to ||
                                                      "#EC4899"
                                                  })`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }}
                                >
                                    <p className="text-xs font-black uppercase tracking-wide text-white/75">
                                        Preview
                                    </p>
                                    <p className="mt-1 text-lg font-black">
                                        {salesSettings.settings
                                            .page_title ||
                                            "Ticket Selection"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    void saveAppearance()
                                }
                                disabled={
                                    working === "appearance"
                                }
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-50"
                            >
                                {working === "appearance" ? (
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save size={17} />
                                )}
                                Save Appearance
                            </button>
                        </section>
                    )}

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black">
                                    Tickets
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    One list for free and paid ticket types.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    void reload()
                                }
                                disabled={
                                    loading
                                }
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 disabled:opacity-50"
                                aria-label="Refresh tickets"
                            >
                                <RefreshCw
                                    size={
                                        18
                                    }
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            {data.tickets.map(
                                (
                                    ticket,
                                ) => {
                                    const remaining =
                                        ticket.quantity_available ===
                                        null
                                            ? null
                                            : ticket.quantity_available -
                                              ticket.quantity_reserved -
                                              ticket.quantity_sold;
                                    const isPaid =
                                        ticket.price_cents >
                                        0;

                                    return (
                                        <article
                                            key={
                                                ticket.id
                                            }
                                            className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-5"
                                        >
                                            <div
                                                className="absolute inset-y-0 left-0 w-1.5"
                                                style={{
                                                    backgroundColor:
                                                        ticket.colour ||
                                                        "#4F46E5",
                                                }}
                                            />
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className="h-4 w-4 shrink-0 rounded-full border border-white shadow-sm"
                                                            style={{
                                                                backgroundColor:
                                                                    ticket.colour ||
                                                                    "#4F46E5",
                                                            }}
                                                            aria-hidden="true"
                                                        />

                                                        <h3 className="truncate text-lg font-black">
                                                            {
                                                                ticket.ticket_name
                                                            }
                                                        </h3>

                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-black ${
                                                                isPaid
                                                                    ? "bg-indigo-100 text-indigo-700"
                                                                    : "bg-emerald-100 text-emerald-700"
                                                            }`}
                                                        >
                                                            {isPaid
                                                                ? "Paid"
                                                                : "Free"}
                                                        </span>

                                                        {!ticket.is_active && (
                                                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="mt-2 text-2xl font-black text-[#4F46E5]">
                                                        {isPaid
                                                            ? money(
                                                                  ticket.price_cents,
                                                                  ticket.currency,
                                                              )
                                                            : "Free"}
                                                    </p>

                                                    {ticket.description && (
                                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                                            {
                                                                ticket.description
                                                            }
                                                        </p>
                                                    )}

                                                    <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
                                                        Sold {ticket.quantity_sold.toLocaleString()} · Reserved {ticket.quantity_reserved.toLocaleString()} · Remaining {remaining === null ? "Unlimited" : Math.max(0, remaining).toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            edit(
                                                                ticket,
                                                            )
                                                        }
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#4F46E5] shadow-sm"
                                                        aria-label={`Edit ${ticket.ticket_name}`}
                                                    >
                                                        <Pencil
                                                            size={
                                                                16
                                                            }
                                                        />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void remove(
                                                                ticket,
                                                            )
                                                        }
                                                        disabled={
                                                            Boolean(
                                                                working,
                                                            )
                                                        }
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 disabled:opacity-50"
                                                        aria-label={`Delete ${ticket.ticket_name}`}
                                                    >
                                                        {working ===
                                                        `delete:${ticket.id}` ? (
                                                            <Loader2
                                                                size={
                                                                    16
                                                                }
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Trash2
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                },
                            )}

                            {data.tickets.length ===
                                0 && (
                                <div className="rounded-2xl bg-slate-50 p-8 text-center">
                                    <Ticket className="mx-auto text-slate-300" />
                                    <p className="mt-3 font-black text-slate-500">
                                        No tickets yet
                                    </p>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Use the form to add a free or paid ticket.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {showPaymentGateway && (
                        <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                                    <WalletCards
                                        size={
                                            20
                                        }
                                    />
                                </span>

                                <div>
                                    <h2 className="text-xl font-black">
                                        Payment Gateway
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Required only because this event has a paid ticket.
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`rounded-2xl border p-4 ${
                                    paymentReady
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="flex items-center gap-2 font-black">
                                            {paymentReady && (
                                                <CheckCircle2
                                                    size={
                                                        17
                                                    }
                                                />
                                            )}
                                            {paymentReady
                                                ? "Payment account ready"
                                                : "Connect Stripe before accepting paid orders"}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold opacity-80">
                                            Recipient: {data.paymentRecipient.companyName}
                                        </p>
                                    </div>

                                    <Link
                                        href={
                                            paymentSetupHref
                                        }
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
                                    >
                                        <CreditCard
                                            size={
                                                16
                                            }
                                        />
                                        Payment Setup
                                    </Link>
                                </div>
                            </div>

                            {hasPaidTickets &&
                                !data
                                    .paymentRecipient
                                    .stripePaymentsAddonEnabled && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="font-black">
                                                    Enable Stripe Ticket
                                                    Payments for this
                                                    event
                                                </p>
                                                <p className="mt-1 text-sm font-semibold opacity-80">
                                                    Guests can&apos;t
                                                    check out for a
                                                    paid ticket until
                                                    this add-on is
                                                    turned on.
                                                </p>
                                            </div>

                                            <Link
                                                href={`/dashboard/events/${eventId}/settings`}
                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
                                            >
                                                <SlidersHorizontal
                                                    size={
                                                        16
                                                    }
                                                />
                                                Event Settings
                                            </Link>
                                        </div>
                                    </div>
                                )}
                        </section>
                    )}

                    {hasPaidTickets && (
                        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                                <h2 className="text-xl font-black sm:text-2xl">
                                    Paid Orders
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Orders appear only for paid tickets.
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {data.orders.map(
                                    (
                                        order,
                                    ) => {
                                        const registration =
                                            Array.isArray(
                                                order.registrations,
                                            )
                                                ? order.registrations[0]
                                                : order.registrations;

                                        return (
                                            <div
                                                key={
                                                    order.id
                                                }
                                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                                            >
                                                <div>
                                                    <p className="font-black">
                                                        {
                                                            order.order_number
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {registration?.full_name ||
                                                            "Guest"}
                                                    </p>
                                                </div>

                                                <div className="sm:text-right">
                                                    <p className="font-black">
                                                        {money(
                                                            order.total_cents,
                                                            order.currency,
                                                        )}
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold capitalize text-slate-500">
                                                        {
                                                            order.status
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}

                                {data.orders.length ===
                                    0 && (
                                    <p className="p-6 text-center font-bold text-slate-500">
                                        No paid orders yet.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </section>
        </div>
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
    const safeColour =
        /^#[0-9A-F]{6}$/i.test(
            value,
        )
            ? value
            : "#4F46E5";

    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {
                    label
                }
            </span>

            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 px-3 focus-within:border-[#4F46E5]">
                <input
                    type="color"
                    value={
                        safeColour
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event.target
                                .value
                                .toUpperCase(),
                        )
                    }
                    className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                    aria-label="Choose ticket colour"
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
                            event.target
                                .value
                                .toUpperCase(),
                        )
                    }
                    placeholder="#4F46E5"
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold outline-none"
                />

                <span
                    className="h-8 w-8 shrink-0 rounded-xl border border-slate-200"
                    style={{
                        backgroundColor:
                            safeColour,
                    }}
                    aria-hidden="true"
                />
            </div>

            <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                Used to identify this ticket on registration and event-management screens.
            </span>
        </label>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    helper,
    required = false,
    min,
    step,
    maxLength,
}: {
    label: string;
    value: string;
    onChange:
        (
            value: string,
        ) => void;
    type?: string;
    helper?: string;
    required?: boolean;
    min?: string;
    step?: string;
    maxLength?: number;
}) {
    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {
                    label
                }
            </span>

            <input
                value={
                    value
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                type={
                    type
                }
                required={
                    required
                }
                min={
                    min
                }
                step={
                    step
                }
                maxLength={
                    maxLength
                }
                className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#4F46E5]"
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

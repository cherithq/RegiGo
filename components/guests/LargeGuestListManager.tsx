"use client";

import {
    FileUp,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Users,
} from "lucide-react";
import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

type Guest = {
    id: string;
    full_name: string;
    email:
        | string
        | null;
    phone:
        | string
        | null;
    department:
        | string
        | null;
    status: string;
    selected_ticket_quantity:
        | number
        | null;
    created_at: string;
};

type Payload = {
    event: {
        id: string;
        eventName: string;
        maxGuests: number;
    };
    guests: Guest[];
    pagination: {
        hasMore: boolean;
        nextCursor:
            | string
            | null;
    };
    counters: {
        registered: number;
        checkedIn: number;
        capacity: number;
    };
    access: {
        canWrite: boolean;
    };
};

type CsvGuest = {
    fullName: string;
    email?: string;
    phone?: string;
    department?: string;
    quantity?: number;
    status?: string;
};

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
            return JSON.parse(raw);
        } catch {
            return {
                error:
                    "The guest server returned invalid JSON.",
            };
        }
    }

    if (
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
                    ? "The scalable Guest List API route is missing."
                    : `The guest server returned HTML (HTTP ${response.status}).`,
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

function splitCsvLine(
    line: string,
) {
    const output: string[] =
        [];
    let value = "";
    let quoted = false;

    for (
        let index = 0;
        index <
        line.length;
        index += 1
    ) {
        const character =
            line[index];

        if (
            character === '"'
        ) {
            if (
                quoted &&
                line[index + 1] ===
                    '"'
            ) {
                value += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
            continue;
        }

        if (
            character === "," &&
            !quoted
        ) {
            output.push(
                value.trim(),
            );
            value = "";
            continue;
        }

        value += character;
    }

    output.push(
        value.trim(),
    );

    return output;
}

function parseCsv(
    csv: string,
): CsvGuest[] {
    const lines =
        csv
            .replace(
                /^\uFEFF/,
                "",
            )
            .split(
                /\r?\n/,
            )
            .filter(
                (line) =>
                    line.trim(),
            );

    if (
        lines.length < 2
    ) {
        throw new Error(
            "The CSV must contain a header row and at least one guest.",
        );
    }

    const headers =
        splitCsvLine(
            lines[0],
        ).map(
            (header) =>
                header
                    .trim()
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "_",
                    ),
        );

    const indexOf = (
        ...names: string[]
    ) =>
        names
            .map((name) =>
                headers.indexOf(
                    name,
                ),
            )
            .find(
                (index) =>
                    index !== -1,
            ) ?? -1;

    const nameIndex =
        indexOf(
            "full_name",
            "name",
            "guest_name",
        );
    const emailIndex =
        indexOf("email");
    const phoneIndex =
        indexOf(
            "phone",
            "contact_number",
        );
    const departmentIndex =
        indexOf(
            "department",
            "company",
        );
    const quantityIndex =
        indexOf(
            "quantity",
            "ticket_quantity",
            "selected_ticket_quantity",
        );
    const statusIndex =
        indexOf("status");

    if (
        nameIndex === -1
    ) {
        throw new Error(
            "The CSV header must contain full_name or name.",
        );
    }

    return lines
        .slice(1)
        .map(
            (
                line,
                rowIndex,
            ) => {
                const values =
                    splitCsvLine(
                        line,
                    );
                const fullName =
                    values[
                        nameIndex
                    ]?.trim();

                if (!fullName) {
                    throw new Error(
                        `CSV row ${rowIndex + 2} has no guest name.`,
                    );
                }

                const quantity =
                    quantityIndex ===
                    -1
                        ? 1
                        : Number(
                              values[
                                  quantityIndex
                              ] || 1,
                          );

                return {
                    fullName,
                    email:
                        emailIndex ===
                        -1
                            ? undefined
                            : values[
                                  emailIndex
                              ],
                    phone:
                        phoneIndex ===
                        -1
                            ? undefined
                            : values[
                                  phoneIndex
                              ],
                    department:
                        departmentIndex ===
                        -1
                            ? undefined
                            : values[
                                  departmentIndex
                              ],
                    quantity:
                        Number.isInteger(
                            quantity,
                        ) &&
                        quantity > 0
                            ? quantity
                            : 1,
                    status:
                        statusIndex ===
                        -1
                            ? "registered"
                            : values[
                                  statusIndex
                              ],
                };
            },
        );
}

export default function LargeGuestListManager({
    eventId,
}: {
    eventId: string;
}) {
    const [data, setData] =
        useState<Payload | null>(
            null,
        );
    const [guests, setGuests] =
        useState<Guest[]>([]);
    const [search, setSearch] =
        useState("");
    const [status, setStatus] =
        useState("all");
    const [loading, setLoading] =
        useState(true);
    const [working, setWorking] =
        useState("");
    const [message, setMessage] =
        useState("");
    const [importProgress, setImportProgress] =
        useState("");

    const [fullName, setFullName] =
        useState("");
    const [email, setEmail] =
        useState("");
    const [phone, setPhone] =
        useState("");
    const [department, setDepartment] =
        useState("");
    const [quantity, setQuantity] =
        useState("1");

    const load =
        useCallback(
            async ({
                cursor,
                append = false,
                searchValue = search,
                statusValue = status,
            }: {
                cursor?:
                    | string
                    | null;
                append?: boolean;
                searchValue?: string;
                statusValue?: string;
            } = {}) => {
                if (!append) {
                    setLoading(
                        true,
                    );
                }

                try {
                    const params =
                        new URLSearchParams({
                            limit: "100",
                            search:
                                searchValue,
                            status:
                                statusValue,
                        });

                    if (cursor) {
                        params.set(
                            "cursor",
                            cursor,
                        );
                    }

                    const response =
                        await fetch(
                            `/api/events/${eventId}/guests?${params.toString()}`,
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
                                "Unable to load guests.",
                        );
                    }

                    const payload =
                        result as Payload;

                    setData(
                        payload,
                    );
                    setGuests(
                        (current) =>
                            append
                                ? [
                                      ...current,
                                      ...payload.guests,
                                  ]
                                : payload.guests,
                    );
                    setMessage("");
                } catch (error) {
                    setMessage(
                        error instanceof
                            Error
                            ? error.message
                            : "Unable to load guests.",
                    );
                } finally {
                    setLoading(
                        false,
                    );
                }
            },
            [
                eventId,
                search,
                status,
            ],
        );

    useEffect(() => {
        const timer =
            window.setTimeout(
                () => {
                    void load({
                        searchValue:
                            search,
                        statusValue:
                            status,
                    });
                },
                350,
            );

        return () =>
            window.clearTimeout(
                timer,
            );
    }, [
        load,
        search,
        status,
    ]);

    async function addGuest(
        event: FormEvent,
    ) {
        event.preventDefault();
        setWorking("add");
        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/events/${eventId}/guests`,
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                fullName,
                                email,
                                phone,
                                department,
                                quantity:
                                    Number(
                                        quantity,
                                    ) || 1,
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
                        "Unable to register the guest.",
                );
            }

            setFullName("");
            setEmail("");
            setPhone("");
            setDepartment("");
            setQuantity("1");
            setMessage(
                result.message ||
                    "Guest registered.",
            );
            await load({
                searchValue:
                    search,
                statusValue:
                    status,
            });
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to register the guest.",
            );
        } finally {
            setWorking("");
        }
    }

    async function importCsv(
        file: File,
    ) {
        setWorking("import");
        setMessage("");
        setImportProgress("");

        try {
            const rows =
                parseCsv(
                    await file.text(),
                );

            if (
                rows.length >
                20000
            ) {
                throw new Error(
                    "A single event import cannot exceed 20,000 guests.",
                );
            }

            let completed = 0;

            for (
                let index = 0;
                index <
                rows.length;
                index += 500
            ) {
                const chunk =
                    rows.slice(
                        index,
                        index + 500,
                    );
                const response =
                    await fetch(
                        `/api/events/${eventId}/guests/bulk`,
                        {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body:
                                JSON.stringify({
                                    guests:
                                        chunk,
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
                            `Import failed after ${completed} guests.`,
                    );
                }

                completed +=
                    Number(
                        result.inserted ||
                            chunk.length,
                    );
                setImportProgress(
                    `${completed.toLocaleString()} / ${rows.length.toLocaleString()} guests imported`,
                );
            }

            setMessage(
                `${completed.toLocaleString()} guests imported successfully.`,
            );
            await load({
                searchValue:
                    search,
                statusValue:
                    status,
            });
        } catch (error) {
            setMessage(
                error instanceof
                    Error
                    ? error.message
                    : "Unable to import the CSV.",
            );
        } finally {
            setWorking("");
        }
    }

    const capacityPercent =
        useMemo(() => {
            if (!data) {
                return 0;
            }

            return Math.min(
                100,
                Math.round(
                    (
                        data.counters
                            .registered /
                        Math.max(
                            data.counters
                                .capacity,
                            1,
                        )
                    ) *
                        100,
                ),
            );
        }, [data]);

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
                    "Guest List could not be loaded."}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-3">
                <Counter
                    label="Registered"
                    value={
                        data.counters
                            .registered
                    }
                />
                <Counter
                    label="Checked In"
                    value={
                        data.counters
                            .checkedIn
                    }
                />
                <Counter
                    label="Capacity"
                    value={
                        data.counters
                            .capacity
                    }
                    suffix={`${capacityPercent}% used`}
                />
            </section>

            {message && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-6 text-slate-700">
                    {message}
                </div>
            )}

            {data.access
                .canWrite && (
                <section className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
                    <form
                        onSubmit={
                            addGuest
                        }
                        className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                    >
                        <div className="flex items-center gap-3">
                            <Plus className="text-[#4F46E5]" />
                            <h2 className="text-xl font-black">
                                Add Guest
                            </h2>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Full name"
                                value={
                                    fullName
                                }
                                onChange={
                                    setFullName
                                }
                                required
                            />
                            <Field
                                label="Email"
                                value={
                                    email
                                }
                                onChange={
                                    setEmail
                                }
                                type="email"
                            />
                            <Field
                                label="Phone"
                                value={
                                    phone
                                }
                                onChange={
                                    setPhone
                                }
                            />
                            <Field
                                label="Department"
                                value={
                                    department
                                }
                                onChange={
                                    setDepartment
                                }
                            />
                            <Field
                                label="Ticket quantity"
                                value={
                                    quantity
                                }
                                onChange={
                                    setQuantity
                                }
                                type="number"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={
                                working ===
                                "add"
                            }
                            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white disabled:opacity-60"
                        >
                            {working ===
                            "add" ? (
                                <Loader2
                                    size={
                                        18
                                    }
                                    className="animate-spin"
                                />
                            ) : (
                                <Plus
                                    size={
                                        18
                                    }
                                />
                            )}
                            Register Guest
                        </button>
                    </form>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-center gap-3">
                            <FileUp className="text-[#4F46E5]" />
                            <h2 className="text-xl font-black">
                                Large CSV Import
                            </h2>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Upload up to 20,000 guests. RegiGo processes the file in safe batches of 500 instead of sending the whole event list in one request.
                        </p>

                        <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
                            Headers: full_name, email, phone, department, quantity, status (saved as registration_status)
                        </p>

                        <label className="mt-5 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700">
                            {working ===
                            "import" ? (
                                <Loader2
                                    size={
                                        18
                                    }
                                    className="animate-spin"
                                />
                            ) : (
                                <FileUp
                                    size={
                                        18
                                    }
                                />
                            )}
                            Choose CSV File
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                disabled={
                                    working ===
                                    "import"
                                }
                                className="hidden"
                                onChange={(
                                    event,
                                ) => {
                                    const file =
                                        event
                                            .target
                                            .files?.[0];

                                    if (file) {
                                        void importCsv(
                                            file,
                                        );
                                    }

                                    event.target.value =
                                        "";
                                }}
                            />
                        </label>

                        {importProgress && (
                            <p className="mt-4 text-sm font-black text-[#4F46E5]">
                                {
                                    importProgress
                                }
                            </p>
                        )}
                    </section>
                </section>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="relative flex-1">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Search name, email, phone or department"
                            className="min-h-12 w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4"
                        />
                    </label>

                    <select
                        value={status}
                        onChange={(
                            event,
                        ) =>
                            setStatus(
                                event
                                    .target
                                    .value,
                            )
                        }
                        className="min-h-12 rounded-2xl border border-slate-200 px-4 font-bold"
                    >
                        <option value="all">
                            All statuses
                        </option>
                        <option value="registered">
                            Registered
                        </option>
                        <option value="confirmed">
                            Confirmed
                        </option>
                        <option value="pending">
                            Pending
                        </option>
                        <option value="cancelled">
                            Cancelled
                        </option>
                        <option value="declined">
                            Declined
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={() =>
                            void load({
                                searchValue:
                                    search,
                                statusValue:
                                    status,
                            })
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black"
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

                <div className="mt-5 space-y-3 md:hidden">
                    {guests.map(
                        (guest) => (
                            <GuestCard
                                key={
                                    guest.id
                                }
                                guest={
                                    guest
                                }
                            />
                        ),
                    )}
                </div>

                <div className="mt-5 hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[850px]">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                                <th className="px-3 py-3">
                                    Guest
                                </th>
                                <th className="px-3 py-3">
                                    Contact
                                </th>
                                <th className="px-3 py-3">
                                    Department
                                </th>
                                <th className="px-3 py-3">
                                    Quantity
                                </th>
                                <th className="px-3 py-3">
                                    Status
                                </th>
                                <th className="px-3 py-3">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {guests.map(
                                (
                                    guest,
                                ) => (
                                    <tr
                                        key={
                                            guest.id
                                        }
                                        className="border-b border-slate-100"
                                    >
                                        <td className="px-3 py-4 font-black">
                                            {
                                                guest.full_name
                                            }
                                        </td>
                                        <td className="px-3 py-4 text-sm text-slate-600">
                                            <p>
                                                {
                                                    guest.email ||
                                                    "—"
                                                }
                                            </p>
                                            <p>
                                                {
                                                    guest.phone ||
                                                    "—"
                                                }
                                            </p>
                                        </td>
                                        <td className="px-3 py-4 text-sm">
                                            {
                                                guest.department ||
                                                "—"
                                            }
                                        </td>
                                        <td className="px-3 py-4 font-black">
                                            {guest.selected_ticket_quantity ||
                                                1}
                                        </td>
                                        <td className="px-3 py-4">
                                            <Status
                                                value={
                                                    guest.status
                                                }
                                            />
                                        </td>
                                        <td className="px-3 py-4 text-sm text-slate-500">
                                            {new Date(
                                                guest.created_at,
                                            ).toLocaleString()}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>

                {guests.length ===
                    0 &&
                    !loading && (
                    <div className="py-12 text-center text-slate-500">
                        <Users className="mx-auto text-slate-300" />
                        <p className="mt-3 font-bold">
                            No guests found.
                        </p>
                    </div>
                )}

                {data.pagination
                    .hasMore && (
                    <button
                        type="button"
                        onClick={() =>
                            void load({
                                cursor:
                                    data
                                        .pagination
                                        .nextCursor,
                                append:
                                    true,
                            })
                        }
                        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 font-black"
                    >
                        <Plus
                            size={
                                17
                            }
                        />
                        Load Next 100 Guests
                    </button>
                )}
            </section>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange:
        (value: string) =>
            void;
    type?: string;
    required?: boolean;
}) {
    return (
        <label>
            <span className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </span>
            <input
                type={type}
                required={required}
                min={
                    type ===
                    "number"
                        ? "1"
                        : undefined
                }
                max={
                    type ===
                    "number"
                        ? "100"
                        : undefined
                }
                value={value}
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
        </label>
    );
}

function Counter({
    label,
    value,
    suffix,
}: {
    label: string;
    value: number;
    suffix?: string;
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-3xl font-black">
                {value.toLocaleString()}
            </p>
            {suffix && (
                <p className="mt-1 text-xs font-bold text-[#4F46E5]">
                    {suffix}
                </p>
            )}
        </div>
    );
}

function GuestCard({
    guest,
}: {
    guest: Guest;
}) {
    return (
        <article className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-black">
                        {guest.full_name}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                        {guest.email ||
                            guest.phone ||
                            "No contact"}
                    </p>
                </div>
                <Status
                    value={
                        guest.status
                    }
                />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-white px-3 py-1.5">
                    {guest.department ||
                        "No department"}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5">
                    Qty{" "}
                    {guest.selected_ticket_quantity ||
                        1}
                </span>
            </div>
        </article>
    );
}

function Status({
    value,
}: {
    value: string;
}) {
    const cancelled =
        value ===
            "cancelled" ||
        value ===
            "declined";

    return (
        <span
            className={[
                "inline-flex rounded-full px-3 py-1.5 text-xs font-black capitalize",
                cancelled
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
        >
            {value}
        </span>
    );
}

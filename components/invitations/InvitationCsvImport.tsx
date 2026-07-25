"use client";

import {
    CheckCircle2,
    Download,
    FileSpreadsheet,
    Loader2,
    Upload,
    XCircle,
} from "lucide-react";
import {
    ChangeEvent,
    MouseEvent,
    useState,
} from "react";

type CsvRow =
    Record<
        string,
        string
    >;

const SAMPLE_CSV =
    [
        "full_name,email,phone,department,quantity,dietary_request",
        "Alicia Tan,alicia@example.com,+6591234567,Finance,1,Vegetarian",
        "Benjamin Lee,benjamin@example.com,+6592345678,Engineering,2,No peanuts",
        "Chloe Lim,chloe@example.com,+6593456789,Marketing,1,",
    ].join("\r\n");

function downloadSampleCsv(
    event:
        MouseEvent<HTMLButtonElement>,
) {
    // Prevent a parent form, Link or click handler from navigating away.
    event.preventDefault();
    event.stopPropagation();

    const blob =
        new Blob(
            [
                "\uFEFF",
                SAMPLE_CSV,
            ],
            {
                type:
                    "text/csv;charset=utf-8",
            },
        );
    const objectUrl =
        window.URL.createObjectURL(
            blob,
        );
    const temporaryLink =
        document.createElement(
            "a",
        );

    temporaryLink.href =
        objectUrl;
    temporaryLink.download =
        "regigo-invitation-guests-sample.csv";
    temporaryLink.rel =
        "noopener";
    temporaryLink.style.display =
        "none";

    document.body.appendChild(
        temporaryLink,
    );
    temporaryLink.click();
    temporaryLink.remove();

    window.setTimeout(
        () => {
            window.URL.revokeObjectURL(
                objectUrl,
            );
        },
        1500,
    );
}

function normaliseHeader(
    value: string,
) {
    return value
        .replace(
            /^\uFEFF/,
            "",
        )
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "_",
        )
        .replace(
            /^_+|_+$/g,
            "",
        );
}

function parseCsv(
    text: string,
) {
    const records:
        string[][] = [];
    let record:
        string[] = [];
    let value =
        "";
    let quoted =
        false;

    for (
        let index = 0;
        index < text.length;
        index += 1
    ) {
        const character =
            text[index];
        const next =
            text[index + 1];

        if (
            character ===
                '"' &&
            quoted &&
            next === '"'
        ) {
            value += '"';
            index += 1;
            continue;
        }

        if (
            character ===
            '"'
        ) {
            quoted =
                !quoted;
            continue;
        }

        if (
            character ===
                "," &&
            !quoted
        ) {
            record.push(
                value.trim(),
            );
            value = "";
            continue;
        }

        if (
            (
                character ===
                    "\n" ||
                character ===
                    "\r"
            ) &&
            !quoted
        ) {
            if (
                character ===
                    "\r" &&
                next === "\n"
            ) {
                index += 1;
            }

            record.push(
                value.trim(),
            );

            if (
                record.some(
                    Boolean,
                )
            ) {
                records.push(
                    record,
                );
            }

            record = [];
            value = "";
            continue;
        }

        value +=
            character;
    }

    record.push(
        value.trim(),
    );

    if (
        record.some(
            Boolean,
        )
    ) {
        records.push(
            record,
        );
    }

    if (
        records.length <
        2
    ) {
        return [];
    }

    const headers =
        records[0].map(
            normaliseHeader,
        );

    return records
        .slice(1)
        .map(
            (
                values,
            ) =>
                Object.fromEntries(
                    headers.map(
                        (
                            header,
                            index,
                        ) => [
                            header,
                            values[
                                index
                            ] ||
                                "",
                        ],
                    ),
                ) as CsvRow,
        );
}

export default function InvitationCsvImport({
    eventId,
}: {
    eventId: string;
}) {
    const [
        working,
        setWorking,
    ] =
        useState(false);
    const [
        progress,
        setProgress,
    ] =
        useState("");
    const [
        result,
        setResult,
    ] = useState<{
        type:
            | "success"
            | "error";
        text: string;
    } | null>(null);

    async function upload(
        event:
            ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target
                .files?.[0];

        event.target.value =
            "";

        if (!file) {
            return;
        }

        setWorking(
            true,
        );
        setProgress(
            "Reading CSV…",
        );
        setResult(
            null,
        );

        try {
            const rows =
                parseCsv(
                    await file.text(),
                );

            if (
                rows.length ===
                0
            ) {
                throw new Error(
                    "The CSV does not contain any guest rows.",
                );
            }

            if (
                rows.length >
                20000
            ) {
                throw new Error(
                    "The CSV cannot contain more than 20,000 guests.",
                );
            }

            const importedIds:
                string[] = [];
            let inserted =
                0;
            let updated =
                0;
            const batchSize =
                500;

            for (
                let start =
                    0;
                start <
                rows.length;
                start +=
                    batchSize
            ) {
                const batch =
                    rows.slice(
                        start,
                        start +
                            batchSize,
                    );
                const end =
                    Math.min(
                        start +
                            batch.length,
                        rows.length,
                    );

                setProgress(
                    `Importing ${start + 1}–${end} of ${rows.length.toLocaleString()}…`,
                );

                const response =
                    await fetch(
                        `/api/events/${encodeURIComponent(
                            eventId,
                        )}/invitations/import`,
                        {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                            },
                            body:
                                JSON.stringify(
                                    {
                                        guests:
                                            batch,
                                    },
                                ),
                        },
                    );
                const payload =
                    await response
                        .json()
                        .catch(
                            () => ({}),
                        );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        payload.error ||
                            `Import failed at row ${start + 1}.`,
                    );
                }

                inserted +=
                    Number(
                        payload.inserted ||
                            0,
                    );
                updated +=
                    Number(
                        payload.updated ||
                            0,
                    );

                if (
                    Array.isArray(
                        payload.registrationIds,
                    )
                ) {
                    importedIds.push(
                        ...payload.registrationIds.map(
                            String,
                        ),
                    );
                }
            }

            setProgress(
                "",
            );
            setResult({
                type:
                    "success",
                text:
                    `${inserted.toLocaleString()} guest${inserted === 1 ? "" : "s"} added` +
                    (
                        updated >
                        0
                            ? ` and ${updated.toLocaleString()} updated`
                            : ""
                    ) +
                    ". Imported guests are selected below and ready for invitation sending.",
            });

            window.dispatchEvent(
                new CustomEvent(
                    "regigo:invitations-imported",
                    {
                        detail: {
                            registrationIds:
                                Array.from(
                                    new Set(
                                        importedIds,
                                    ),
                                ),
                        },
                    },
                ),
            );
        } catch (error) {
            setProgress(
                "",
            );
            setResult({
                type:
                    "error",
                text:
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to import the CSV.",
            });
        } finally {
            setWorking(
                false,
            );
        }
    }

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                        <FileSpreadsheet
                            size={
                                22
                            }
                        />
                    </div>

                    <div>
                        <h2 className="text-xl font-black">
                            Import Invitation Guests
                        </h2>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                            Upload a guest list instead of entering guests individually. RegiGo processes the file in 500-row batches and keeps the existing invitation workflow below.
                        </p>

                        <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                            Required columns: full_name and email. Optional columns: phone, department, quantity (party size) and Registration Builder field keys.
                        </p>
                    </div>
                </div>

                <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 font-black text-white">
                    {working ? (
                        <Loader2
                            size={
                                18
                            }
                            className="animate-spin"
                        />
                    ) : (
                        <Upload
                            size={
                                18
                            }
                        />
                    )}

                    Upload CSV

                    <input
                        type="file"
                        accept=".csv,text/csv"
                        disabled={
                            working
                        }
                        className="hidden"
                        onChange={(
                            event,
                        ) =>
                            void upload(
                                event,
                            )
                        }
                    />
                </label>
            </div>

            {(progress ||
                result) && (
                <div
                    className={[
                        "mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-bold leading-6",
                        result
                            ?.type ===
                        "error"
                            ? "bg-red-50 text-red-700"
                            : result
                                    ?.type ===
                                "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-50 text-slate-700",
                    ].join(
                        " ",
                    )}
                >
                    {working ? (
                        <Loader2
                            size={
                                17
                            }
                            className="mt-0.5 shrink-0 animate-spin"
                        />
                    ) : result
                          ?.type ===
                      "error" ? (
                        <XCircle
                            size={
                                17
                            }
                            className="mt-0.5 shrink-0"
                        />
                    ) : (
                        <CheckCircle2
                            size={
                                17
                            }
                            className="mt-0.5 shrink-0"
                        />
                    )}

                    {progress ||
                        result?.text}
                </div>
            )}

            <button
                type="button"
                formNoValidate
                onClick={(
                    event,
                ) =>
                    downloadSampleCsv(
                        event,
                    )
                }
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#F7F5FF] px-4 py-3 text-sm font-black text-[#4F46E5] transition hover:bg-indigo-100 hover:text-[#EC4899]"
            >
                <Download
                    size={
                        17
                    }
                />
                Download Sample CSV
            </button>
        </section>
    );
}

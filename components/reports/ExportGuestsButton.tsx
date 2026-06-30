"use client";

export default function ExportGuestsButton({
    guests,
    fields,
    filename = "regigo-guests.csv",
}: {
    guests: any[];
    fields: any[];
    filename?: string;
}) {
    function exportCsv() {
        const headers = [
            ...fields.map((field) => field.field_label),
            "Check-In Status",
        ];

        const rows = guests.map((guest) => [
            ...fields.map((field) => {
                const key = field.field_key;

                return (
                    guest[key] ||
                    guest.custom_answers?.[key] ||
                    ""
                );
            }),
            guest.checkin_status || "Pending",
        ]);

        const csv = [headers, ...rows]
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
                    .join(",")
            )
            .join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    return (
        <button
            onClick={exportCsv}
            className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-3 font-black text-white shadow-lg"
        >
            Export CSV
        </button>
    );
}
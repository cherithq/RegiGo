import fs from "node:fs";
import path from "node:path";

const relative =
    "app/api/public/events/[slug]/invite/[token]/tables/route.ts";
const absolute =
    path.join(
        process.cwd(),
        relative,
    );

if (!fs.existsSync(absolute)) {
    console.error(
        `Missing ${relative}`,
    );
    process.exit(1);
}

const original =
    fs.readFileSync(
        absolute,
        "utf8",
    );

if (
    !original.includes(
        "snapshot.registration.payment_status",
    )
) {
    console.error(
        "The expected payment_status access was not found.",
    );
    process.exit(1);
}

let next =
    original;
let changed =
    false;

/*
 * Fix common Supabase select forms:
 *
 * registration:id(...)
 * registration(...)
 * .select("..., id, full_name, email, rsvp_status, ...")
 *
 * Only add payment_status beside rsvp_status when it is not already
 * selected in that same registration field list.
 */
const patterns = [
    /(\bregistration\s*:\s*[^(\s,]+\s*\(\s*[^)]*\brsvp_status\b)(?![^)]*\bpayment_status\b)([^)]*\))/g,
    /(\bregistration\s*\(\s*[^)]*\brsvp_status\b)(?![^)]*\bpayment_status\b)([^)]*\))/g,
    /(\bid\s*,\s*full_name\s*,\s*email\s*,\s*rsvp_status\b)(?!\s*,\s*payment_status\b)/g,
    /(\bfull_name\s*,\s*email\s*,\s*rsvp_status\b)(?!\s*,\s*payment_status\b)/g,
];

for (const pattern of patterns) {
    const before =
        next;

    next =
        next.replace(
            pattern,
            (
                match,
                first,
                second = "",
            ) => {
                changed =
                    true;

                if (second) {
                    return `${first}, payment_status${second}`;
                }

                return `${first}, payment_status`;
            },
        );

    if (
        next !== before
    ) {
        break;
    }
}

/*
 * Last-resort targeted insertion: find the closest rsvp_status before
 * snapshot.registration.payment_status and add payment_status there.
 */
if (!changed) {
    const accessIndex =
        next.indexOf(
            "snapshot.registration.payment_status",
        );
    const preceding =
        next.slice(
            0,
            accessIndex,
        );
    const statusIndex =
        preceding.lastIndexOf(
            "rsvp_status",
        );

    if (statusIndex >= 0) {
        const afterStatus =
            statusIndex +
            "rsvp_status".length;
        const localWindow =
            next.slice(
                afterStatus,
                Math.min(
                    accessIndex,
                    afterStatus + 180,
                ),
            );

        if (
            !localWindow.includes(
                "payment_status",
            )
        ) {
            next =
                next.slice(
                    0,
                    afterStatus,
                ) +
                ", payment_status" +
                next.slice(
                    afterStatus,
                );
            changed =
                true;
        }
    }
}

if (!changed) {
    console.error(
        "Could not locate the registration select list that contains rsvp_status.",
    );
    console.error(
        "No file was changed.",
    );
    process.exit(1);
}

/*
 * Ensure the selected field appears before the later property access.
 */
const accessIndex =
    next.indexOf(
        "snapshot.registration.payment_status",
    );
const selectedIndex =
    next.lastIndexOf(
        "payment_status",
        accessIndex - 1,
    );

if (
    selectedIndex <
    0
) {
    console.error(
        "payment_status was not added to the preceding registration query.",
    );
    process.exit(1);
}

const backup =
    `${absolute}.before-payment-status-select-fix`;

if (!fs.existsSync(backup)) {
    fs.copyFileSync(
        absolute,
        backup,
    );
}

fs.writeFileSync(
    absolute,
    next,
    "utf8",
);

console.log(
    "Added payment_status to the invitation registration selection.",
);
console.log(
    "Guest table-selection behaviour was not changed.",
);
import fs from "node:fs";
import path from "node:path";

const relative =
    "app/event/[slug]/invite/[token]/page.tsx";
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
        "registration?.payment_status",
    ) &&
    !original.includes(
        "registration.payment_status",
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

const replacements = [
    {
        pattern:
            /\bid\s*,\s*full_name\s*,\s*email\s*,\s*rsvp_status\b(?!\s*,\s*payment_status\b)/g,
        replacement:
            "id, full_name, email, rsvp_status, payment_status",
    },
    {
        pattern:
            /\bfull_name\s*,\s*email\s*,\s*rsvp_status\b(?!\s*,\s*payment_status\b)/g,
        replacement:
            "full_name, email, rsvp_status, payment_status",
    },
    {
        pattern:
            /(\bregistration\s*:\s*[^(\s,]+\s*\(\s*[^)]*\brsvp_status\b)(?![^)]*\bpayment_status\b)([^)]]*\))/g,
        replacement:
            "$1, payment_status$2",
    },
    {
        pattern:
            /(\bregistration\s*\(\s*[^)]*\brsvp_status\b)(?![^)]*\bpayment_status\b)([^)]]*\))/g,
        replacement:
            "$1, payment_status$2",
    },
];

for (const entry of replacements) {
    const before =
        next;

    next =
        next.replace(
            entry.pattern,
            entry.replacement,
        );

    if (next !== before) {
        changed =
            true;
        break;
    }
}

/*
 * Fallback for multiline template strings where the exact spacing is
 * different. Add payment_status after the nearest rsvp_status that
 * appears before registration?.payment_status.
 */
if (!changed) {
    const accessCandidates = [
        next.indexOf(
            "registration?.payment_status",
        ),
        next.indexOf(
            "registration.payment_status",
        ),
    ].filter(
        (
            index,
        ) =>
            index >=
            0,
    );

    const accessIndex =
        Math.min(
            ...accessCandidates,
        );
    const preceding =
        next.slice(
            0,
            accessIndex,
        );
    const rsvpIndex =
        preceding.lastIndexOf(
            "rsvp_status",
        );

    if (rsvpIndex >= 0) {
        const insertAt =
            rsvpIndex +
            "rsvp_status".length;
        const nearby =
            next.slice(
                insertAt,
                Math.min(
                    accessIndex,
                    insertAt +
                        180,
                ),
            );

        if (
            !nearby.includes(
                "payment_status",
            )
        ) {
            next =
                next.slice(
                    0,
                    insertAt,
                ) +
                ", payment_status" +
                next.slice(
                    insertAt,
                );
            changed =
                true;
        }
    }
}

if (!changed) {
    const accessIndex =
        Math.max(
            original.indexOf(
                "registration?.payment_status",
            ),
            original.indexOf(
                "registration.payment_status",
            ),
        );
    const preceding =
        original.slice(
            0,
            accessIndex,
        );

    if (
        preceding.lastIndexOf(
            "payment_status",
        ) >=
        0
    ) {
        console.log(
            "payment_status already appears in the registration query.",
        );
        process.exit(0);
    }

    console.error(
        "Could not locate the registration selection containing rsvp_status.",
    );
    console.error(
        "No file was changed.",
    );
    process.exit(1);
}

const accessCandidates = [
    next.indexOf(
        "registration?.payment_status",
    ),
    next.indexOf(
        "registration.payment_status",
    ),
].filter(
    (
        index,
    ) =>
        index >=
        0,
);
const accessIndex =
    Math.min(
        ...accessCandidates,
    );
const selectedIndex =
    next.lastIndexOf(
        "payment_status",
        accessIndex -
            1,
    );

if (selectedIndex < 0) {
    console.error(
        "payment_status was not added to the registration query.",
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
    "Added payment_status to the invitation-page registration query.",
);
console.log(
    "RSVP, payment and table-selection behaviour were not changed.",
);
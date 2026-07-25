import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

const sourceFile =
    ts.createSourceFile(
        relative,
        original,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );

function hasModifier(
    node,
    kind,
) {
    return Boolean(
        node.modifiers?.some(
            (
                modifier,
            ) =>
                modifier.kind ===
                kind,
        ),
    );
}

const existingDefault =
    sourceFile.statements.some(
        (
            statement,
        ) =>
            hasModifier(
                statement,
                ts.SyntaxKind.DefaultKeyword,
            ) ||
            ts.isExportAssignment(
                statement,
            ),
    );

if (existingDefault) {
    console.log(
        "The invite page already has a default export.",
    );
    process.exit(0);
}

const preferredNames = [
    "InvitePage",
    "InvitationPage",
    "EventInvitePage",
    "InviteTokenPage",
    "Page",
];

const functionCandidates =
    sourceFile.statements.filter(
        (
            statement,
        ) =>
            ts.isFunctionDeclaration(
                statement,
            ) &&
            statement.name,
    );

function functionScore(
    statement,
) {
    const name =
        statement.name?.text ||
        "";
    let score =
        0;

    if (
        preferredNames.includes(
            name,
        )
    ) {
        score +=
            100;
    }

    if (
        name.endsWith(
            "Page",
        )
    ) {
        score +=
            60;
    }

    if (
        hasModifier(
            statement,
            ts.SyntaxKind.ExportKeyword,
        )
    ) {
        score +=
            15;
    }

    if (
        hasModifier(
            statement,
            ts.SyntaxKind.AsyncKeyword,
        )
    ) {
        score +=
            10;
    }

    if (
        statement.parameters.some(
            (
                parameter,
            ) =>
                ts.isIdentifier(
                    parameter.name,
                ) &&
                parameter.name.text ===
                    "params",
        )
    ) {
        score +=
            30;
    }

    return score;
}

const functionCandidate =
    functionCandidates
        .map(
            (
                statement,
            ) => ({
                statement,
                score:
                    functionScore(
                        statement,
                    ),
            }),
        )
        .sort(
            (
                first,
                second,
            ) =>
                second.score -
                first.score,
        )[0];

let next =
    original;
let chosenName =
    "";

if (
    functionCandidate &&
    functionCandidate.score >
        0
) {
    const statement =
        functionCandidate.statement;
    chosenName =
        statement.name?.text ||
        "Page";
    const start =
        statement.getStart(
            sourceFile,
        );
    const declarationText =
        original.slice(
            start,
            statement.getEnd(),
        );

    if (
        hasModifier(
            statement,
            ts.SyntaxKind.ExportKeyword,
        )
    ) {
        const exportIndex =
            declarationText.indexOf(
                "export",
            );

        next =
            original.slice(
                0,
                start +
                    exportIndex,
            ) +
            "export default" +
            original.slice(
                start +
                    exportIndex +
                    "export".length,
            );
    } else {
        next =
            original.slice(
                0,
                start,
            ) +
            "export default " +
            original.slice(
                start,
            );
    }
} else {
    const variableCandidates =
        [];

    for (const statement of
        sourceFile.statements) {
        if (
            !ts.isVariableStatement(
                statement,
            )
        ) {
            continue;
        }

        for (const declaration of
            statement.declarationList
                .declarations) {
            if (
                !ts.isIdentifier(
                    declaration.name,
                ) ||
                !declaration.initializer
            ) {
                continue;
            }

            if (
                !(
                    ts.isArrowFunction(
                        declaration.initializer,
                    ) ||
                    ts.isFunctionExpression(
                        declaration.initializer,
                    )
                )
            ) {
                continue;
            }

            const name =
                declaration.name
                    .text;
            let score =
                0;

            if (
                preferredNames.includes(
                    name,
                )
            ) {
                score +=
                    100;
            }

            if (
                name.endsWith(
                    "Page",
                )
            ) {
                score +=
                    60;
            }

            if (
                hasModifier(
                    statement,
                    ts.SyntaxKind.ExportKeyword,
                )
            ) {
                score +=
                    15;
            }

            variableCandidates.push({
                name,
                score,
            });
        }
    }

    const variableCandidate =
        variableCandidates.sort(
            (
                first,
                second,
            ) =>
                second.score -
                first.score,
        )[0];

    if (
        !variableCandidate ||
        variableCandidate.score <=
            0
    ) {
        console.error(
            "No likely page component was found.",
        );
        console.error(
            "No file was changed. Upload the page.tsx file for an exact replacement.",
        );
        process.exit(1);
    }

    chosenName =
        variableCandidate.name;
    next =
        `${original.trimEnd()}\n\nexport default ${chosenName};\n`;
}

const verificationFile =
    ts.createSourceFile(
        relative,
        next,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
const nowHasDefault =
    verificationFile.statements.some(
        (
            statement,
        ) =>
            hasModifier(
                statement,
                ts.SyntaxKind.DefaultKeyword,
            ) ||
            ts.isExportAssignment(
                statement,
            ),
    );

if (!nowHasDefault) {
    console.error(
        "A default export could not be confirmed. No file was changed.",
    );
    process.exit(1);
}

const backup =
    `${absolute}.before-default-export-fix`;

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
    `Restored the default export using ${chosenName}.`,
);
console.log(
    "Invitation, RSVP, payment and table-selection logic were not changed.",
);
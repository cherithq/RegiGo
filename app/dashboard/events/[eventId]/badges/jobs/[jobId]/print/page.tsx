import QRCode from "qrcode";
import AutoPrintController from "@/components/badges/AutoPrintController";
import {
    BadgeError,
    cleanBadgeElements,
    loadBadgeData,
    requireBadgeManager,
    type BadgeElement,
    type BadgeMergeKey,
} from "@/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BadgeData = Record<
    BadgeMergeKey,
    string
>;

function elementText(
    element: BadgeElement,
    badge: BadgeData,
) {
    if (element.staticText) {
        return element.staticText;
    }

    if (element.key) {
        return badge[element.key] || "";
    }

    return "";
}

function textAlignment(
    align: BadgeElement["align"],
) {
    if (align === "center") {
        return "center";
    }

    if (align === "right") {
        return "flex-end";
    }

    return "flex-start";
}

export default async function WebsiteBadgePrintPage({
    params,
    searchParams,
}: {
    params: Promise<{
        eventId: string;
        jobId: string;
    }>;
    searchParams: Promise<{
        requestId?: string;
        copies?: string;
    }>;
}) {
    const {
        eventId,
        jobId,
    } = await params;
    const query = await searchParams;
    const requestId =
        query.requestId?.trim() || "";
    const parsedCopies =
        Number(query.copies || 1);
    const copies =
        Number.isInteger(parsedCopies)
            ? Math.min(
                  Math.max(
                      parsedCopies,
                      1,
                  ),
                  20,
              )
            : 1;

    try {
        const configuration =
            await requireBadgeManager(
                eventId,
            );
        const admin =
            configuration.actor.admin;

        const {
            data: job,
            error,
        } = await admin
            .from("badge_print_jobs")
            .select(
                "id, job_name, event_id, template_id, status, badge_count, badge_templates(badge_width_mm, badge_height_mm, background_color, elements)",
            )
            .eq("id", jobId)
            .eq("event_id", eventId)
            .maybeSingle();

        if (error) {
            throw new BadgeError(
                error.message,
            );
        }

        if (!job) {
            throw new BadgeError(
                "The badge job could not be found.",
                404,
            );
        }

        const template =
            Array.isArray(
                job.badge_templates,
            )
                ? job.badge_templates[0]
                : job.badge_templates;

        if (!template) {
            throw new BadgeError(
                "The badge template could not be loaded.",
                404,
            );
        }

        const {
            data: items,
            error: itemError,
        } = await admin
            .from(
                "badge_print_job_items",
            )
            .select(
                "registration_id, item_order",
            )
            .eq("job_id", jobId)
            .order("item_order", {
                ascending: true,
            });

        if (itemError) {
            throw new BadgeError(
                itemError.message,
            );
        }

        const registrationIds = (
            items || []
        ).map((item) =>
            String(
                item.registration_id,
            ),
        );

        if (
            registrationIds.length === 0
        ) {
            throw new BadgeError(
                "The badge job has no guests.",
            );
        }

        const { badges } =
            await loadBadgeData({
                admin,
                eventId,
                registrationIds,
            });

        const elements =
            cleanBadgeElements(
                template.elements,
            );

        const qrImages =
            await Promise.all(
                badges.map(
                    async (badge) =>
                        badge.qr_code
                            ? QRCode.toDataURL(
                                  badge.qr_code,
                                  {
                                      margin: 0,
                                      width: 768,
                                      errorCorrectionLevel:
                                          "M",
                                  },
                              )
                            : "",
                ),
            );

        await admin
            .from("badge_print_jobs")
            .update({
                status: "ready",
                generated_at:
                    new Date().toISOString(),
                error_message: null,
            })
            .eq("id", jobId);

        const width = Number(
            template.badge_width_mm,
        );
        const height = Number(
            template.badge_height_mm,
        );

        const printableBadges =
            Array.from(
                {
                    length: copies,
                },
                (_, copyIndex) =>
                    badges.map(
                        (
                            badge,
                            badgeIndex,
                        ) => ({
                            badge,
                            badgeIndex,
                            copyIndex,
                        }),
                    ),
            ).flat();

        return (
            <main>
                <AutoPrintController
                    eventId={eventId}
                    requestId={
                        requestId ||
                        undefined
                    }
                />

                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                            @page {
                                size: ${width}mm ${height}mm;
                                margin: 0;
                            }

                            html,
                            body {
                                margin: 0;
                                padding: 0;
                                background: #e2e8f0;
                            }

                            .print-toolbar {
                                position: sticky;
                                top: 0;
                                z-index: 100;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 20px;
                                padding: 16px 24px;
                                background: white;
                                border-bottom: 1px solid #e2e8f0;
                                font-family: Arial, sans-serif;
                            }

                            .badge-print-area {
                                padding: 24px;
                            }

                            .badge-sheet {
                                position: relative;
                                width: ${width}mm;
                                height: ${height}mm;
                                margin: 0 auto 24px;
                                overflow: hidden;
                                background: ${template.background_color || "#FFFFFF"};
                                box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
                                page-break-after: always;
                                break-after: page;
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                            }

                            .badge-sheet:last-child {
                                page-break-after: auto;
                                break-after: auto;
                            }

                            @media print {
                                html,
                                body {
                                    background: white;
                                }

                                .print-toolbar {
                                    display: none !important;
                                }

                                .badge-print-area {
                                    padding: 0;
                                }

                                .badge-sheet {
                                    margin: 0;
                                    box-shadow: none;
                                }
                            }
                        `,
                    }}
                />

                <section className="badge-print-area">
                    {printableBadges.map(
                        ({
                            badge,
                            badgeIndex,
                            copyIndex,
                        }) => (
                            <article
                                key={`${jobId}-${badgeIndex}-${copyIndex}`}
                                className="badge-sheet"
                            >
                                {elements.map(
                                    (element) => {
                                        const commonStyle = {
                                            position:
                                                "absolute" as const,
                                            left: `${element.x}mm`,
                                            top: `${element.y}mm`,
                                            width: `${element.width}mm`,
                                            height: `${element.height}mm`,
                                        };

                                        if (
                                            element.type ===
                                            "rectangle"
                                        ) {
                                            return (
                                                <div
                                                    key={
                                                        element.id
                                                    }
                                                    style={{
                                                        ...commonStyle,
                                                        backgroundColor:
                                                            element.fill ===
                                                            false
                                                                ? "transparent"
                                                                : element.backgroundColor ||
                                                                  "#FFFFFF",
                                                        borderStyle:
                                                            element.dashed
                                                                ? "dashed"
                                                                : "solid",
                                                        borderColor:
                                                            element.borderColor ||
                                                            "#CBD5E1",
                                                        borderWidth:
                                                            `${element.borderWidth || 0}px`,
                                                        boxSizing:
                                                            "border-box",
                                                        transform:
                                                            element.rotation
                                                                ? `rotate(${element.rotation}deg)`
                                                                : undefined,
                                                    }}
                                                />
                                            );
                                        }

                                        if (
                                            element.type ===
                                            "ticket_color"
                                        ) {
                                            return (
                                                <div
                                                    key={
                                                        element.id
                                                    }
                                                    style={{
                                                        ...commonStyle,
                                                        backgroundColor:
                                                            badge.ticket_colour ||
                                                            "#94A3B8",
                                                        boxSizing:
                                                            "border-box",
                                                        transform:
                                                            element.rotation
                                                                ? `rotate(${element.rotation}deg)`
                                                                : undefined,
                                                    }}
                                                />
                                            );
                                        }

                                        if (
                                            element.type ===
                                            "line"
                                        ) {
                                            const style =
                                                element.dashed
                                                    ? "dashed"
                                                    : "solid";

                                            if (
                                                element.lineOrientation ===
                                                "vertical"
                                            ) {
                                                return (
                                                    <div
                                                        key={
                                                            element.id
                                                        }
                                                        style={{
                                                            ...commonStyle,
                                                            left: `calc(${element.x}mm + ${element.width / 2}mm)`,
                                                            width: 0,
                                                            borderLeftStyle:
                                                                style,
                                                            borderLeftWidth:
                                                                `${Math.max(element.borderWidth || 1, 0.5)}px`,
                                                            borderLeftColor:
                                                                element.color ||
                                                                "#0F172A",
                                                        }}
                                                    />
                                                );
                                            }

                                            return (
                                                <div
                                                    key={
                                                        element.id
                                                    }
                                                    style={{
                                                        ...commonStyle,
                                                        top: `calc(${element.y}mm + ${element.height / 2}mm)`,
                                                        height:
                                                            0,
                                                        borderTopStyle:
                                                            style,
                                                        borderTopWidth:
                                                            `${Math.max(element.borderWidth || 1, 0.5)}px`,
                                                        borderTopColor:
                                                            element.color ||
                                                            "#0F172A",
                                                    }}
                                                />
                                            );
                                        }

                                        if (
                                            element.type ===
                                            "qr"
                                        ) {
                                            return qrImages[
                                                badgeIndex
                                            ] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    key={
                                                        element.id
                                                    }
                                                    src={
                                                        qrImages[
                                                            badgeIndex
                                                        ]
                                                    }
                                                    alt="Guest QR code"
                                                    style={{
                                                        ...commonStyle,
                                                        objectFit:
                                                            "contain",
                                                    }}
                                                />
                                            ) : null;
                                        }

                                        if (
                                            element.type ===
                                            "image"
                                        ) {
                                            return element.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    key={
                                                        element.id
                                                    }
                                                    src={
                                                        element.imageUrl
                                                    }
                                                    alt=""
                                                    style={{
                                                        ...commonStyle,
                                                        objectFit:
                                                            "cover",
                                                        transform:
                                                            element.rotation
                                                                ? `rotate(${element.rotation}deg)`
                                                                : undefined,
                                                    }}
                                                />
                                            ) : null;
                                        }

                                        return (
                                            <div
                                                key={
                                                    element.id
                                                }
                                                style={{
                                                    ...commonStyle,
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    justifyContent:
                                                        textAlignment(
                                                            element.align,
                                                        ),
                                                    overflow:
                                                        "hidden",
                                                    whiteSpace:
                                                        "nowrap",
                                                    color:
                                                        element.color ||
                                                        "#0F172A",
                                                    fontFamily:
                                                        "Arial, Helvetica, sans-serif",
                                                    fontSize:
                                                        `${element.fontSize || 12}pt`,
                                                    fontWeight:
                                                        element.fontWeight ===
                                                        "bold"
                                                            ? 700
                                                            : 400,
                                                    textAlign:
                                                        element.align ||
                                                        "left",
                                                    lineHeight:
                                                        1,
                                                    boxSizing:
                                                        "border-box",
                                                    transform:
                                                        element.rotation
                                                            ? `rotate(${element.rotation}deg)`
                                                            : undefined,
                                                    transformOrigin:
                                                        "center",
                                                }}
                                            >
                                                {elementText(
                                                    element,
                                                    badge,
                                                )}
                                            </div>
                                        );
                                    },
                                )}
                            </article>
                        ),
                    )}
                </section>
            </main>
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to prepare badges for printing.";

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
                <section className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">
                    <h1 className="text-3xl font-black">
                        Printing unavailable
                    </h1>
                    <p className="mt-4 leading-7 text-slate-600">
                        {message}
                    </p>
                </section>
            </main>
        );
    }
}

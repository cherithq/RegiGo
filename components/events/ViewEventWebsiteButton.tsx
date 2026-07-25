import Link from "next/link";
import {
    ExternalLink,
    Globe2,
} from "lucide-react";

export default function ViewEventWebsiteButton({
    eventSlug,
    compact =
        false,
    className =
        "",
}: {
    eventSlug:
        | string
        | null
        | undefined;
    compact?: boolean;
    className?: string;
}) {
    const slug =
        String(
            eventSlug ||
                "",
        ).trim();

    if (
        !slug
    ) {
        return null;
    }

    return (
        <Link
            href={`/event/${encodeURIComponent(
                slug,
            )}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className={[
                compact
                    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5] transition hover:border-[#4F46E5] hover:bg-white"
                    : "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/40 hover:bg-[#F7F5FF] hover:text-[#4F46E5]",
                className,
            ].join(
                " ",
            )}
        >
            <Globe2
                size={
                    18
                }
            />

            <span>
                View Website
            </span>

            <ExternalLink
                size={
                    15
                }
            />
        </Link>
    );
}

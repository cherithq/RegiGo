import Link from "next/link";

export default function Logo({
    href,
    className = "",
}: {
    href?: string;
    className?: string;
}) {
    const logo = (
        <div className={`text-3xl font-black tracking-tight ${className}`}>
            <span className="text-[#4F46E5]">Regi</span>
            <span className="text-[#EC4899]">Go</span>
            <span className="text-[#EC4899]">✦</span>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="inline-flex items-center">
                {logo}
            </Link>
        );
    }

    return logo;
}
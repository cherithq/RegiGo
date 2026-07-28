import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const VARIANT_CLASSES = {
    light: "bg-white text-[#4F46E5] shadow-sm hover:text-[#EC4899]",
    subtle: "bg-[#F7F5FF] text-[#4F46E5] hover:text-[#EC4899]",
    dark: "bg-white/10 text-white backdrop-blur hover:bg-white/20",
} as const;

export default function BackButton({
    href,
    children,
    variant = "light",
    className = "",
}: {
    href: string;
    children: ReactNode;
    variant?: keyof typeof VARIANT_CLASSES;
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={[
                "inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                VARIANT_CLASSES[variant],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <ArrowLeft size={16} />
            {children}
        </Link>
    );
}

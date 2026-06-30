import Link from "next/link";

type ButtonProps = {
    children: React.ReactNode;
    href?: string;
    type?: "button" | "submit";
    variant?: "primary" | "secondary" | "outline";
    disabled?: boolean;
};

export default function Button({
    children,
    href,
    type = "button",
    variant = "primary",
    disabled = false,
}: ButtonProps) {
    const base =
        "inline-flex items-center justify-center rounded-2xl px-6 py-3 font-bold transition hover:scale-[1.01] disabled:opacity-60";

    const variants = {
        primary: "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-lg",
        secondary: "bg-slate-950 text-white shadow-lg",
        outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    };

    const className = `${base} ${variants[variant]}`;

    if (href) {
        return (
            <Link href={href} className={className}>
                {children}
            </Link>
        );
    }

    return (
        <button type={type} disabled={disabled} className={className}>
            {children}
        </button>
    );
}
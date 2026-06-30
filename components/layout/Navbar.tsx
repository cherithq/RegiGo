import Link from "next/link";
import Logo from "./Logo";
import Button from "../ui/Button";

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
                <Logo />

                <nav className="hidden gap-8 font-semibold text-slate-700 lg:flex">
                    <Link href="/">Home</Link>
                    <Link href="/features">Features</Link>
                    <Link href="/pricing">Pricing</Link>
                    <Link href="/about">About</Link>
                    <Link href="/contact">Contact</Link>
                </nav>

                <div className="hidden gap-3 sm:flex">
                    <Button href="/auth/login" variant="outline">Login</Button>
                    <Button href="/auth/register">Get Started</Button>
                </div>
            </div>
        </header>
    );
}
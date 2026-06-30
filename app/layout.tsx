import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-jakarta",
});

export const metadata: Metadata = {
    title: "RegiGo",
    description: "Smart Event Registration & QR Check-In Platform",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${jakarta.variable} font-sans bg-[#F7F5FF] text-slate-950`}>
                {children}
            </body>
        </html>
    );
}
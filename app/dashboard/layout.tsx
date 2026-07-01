"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/layout/DashboardShell";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
                window.location.href = "/auth/login";
                return;
            }

            setChecking(false);
        };

        checkUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                window.location.href = "/auth/login";
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (checking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF]">
                <p className="font-bold text-slate-700">Checking login...</p>
            </main>
        );
    }

    return <DashboardShell>{children}</DashboardShell>;
}
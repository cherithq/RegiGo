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
        async function checkUser() {
            const { data } = await supabase.auth.getUser();

            if (!data.user) {
                window.location.href = "/auth/login";
                return;
            }

            setChecking(false);
        }

        checkUser();
    }, []);

    if (checking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF]">
                <p className="font-bold">Checking login...</p>
            </main>
        );
    }

    return <DashboardShell>{children}</DashboardShell>;
}
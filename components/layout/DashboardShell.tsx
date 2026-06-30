"use client";

import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function DashboardFrame({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar();

    return (
        <main className="min-h-screen bg-[#F7F5FF] text-slate-950">
            <DashboardSidebar />
            <DashboardHeader />

            <section
                className={`px-5 py-7 transition-all duration-300 ${collapsed ? "lg:ml-24" : "lg:ml-72"
                    }`}
            >
                <div className="mx-auto max-w-7xl">{children}</div>
            </section>
        </main>
    );
}

export default function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <DashboardFrame>{children}</DashboardFrame>
        </SidebarProvider>
    );
}
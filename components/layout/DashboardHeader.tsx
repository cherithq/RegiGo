"use client";

import { Menu, Search, Bell, UserCircle } from "lucide-react";
import { useSidebar } from "./SidebarContext";

export default function DashboardHeader() {
    const { collapsed, setMobileOpen } = useSidebar();

    return (
        <header
            className={`sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl transition-all duration-300 ${collapsed ? "lg:ml-24" : "lg:ml-72"
                }`}
        >
            <div className="flex h-20 items-center justify-between gap-4 px-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="rounded-xl bg-[#F7F5FF] p-2 lg:hidden"
                    >
                        <Menu size={20} />
                    </button>

                    <div>
                        <p className="text-sm font-bold text-slate-500">RegiGo Workspace</p>
                        <p className="text-lg font-black">Event Management</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
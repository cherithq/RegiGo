"use client";

import { createContext, useContext, useState } from "react";

type SidebarContextType = {
    collapsed: boolean;
    setCollapsed: (value: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    setCollapsed: () => { },
    mobileOpen: false,
    setMobileOpen: () => { },
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <SidebarContext.Provider
            value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return useContext(SidebarContext);
}

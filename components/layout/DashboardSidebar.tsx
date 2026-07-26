"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    usePathname,
} from "next/navigation";
import {
    supabase,
} from "@/lib/supabase";
import type {
    SidebarModuleKey,
    SidebarModuleMap,
} from "@/lib/sidebar-modules";
import Logo from "@/components/layout/Logo";
import {
    useSidebar,
} from "./SidebarContext";
import {
    BadgeCheck,
    BarChart3,
    Building2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    CreditCard,
    Gift,
    Globe2,
    Home,
    ListTodo,
    LogOut,
    Mail,
    Map,
    Mic2,
    Palette,
    PlusCircle,
    Printer,
    Puzzle,
    QrCode,
    Settings,
    ShieldCheck,
    Table2,
    TableProperties,
    Trophy,
    UserCircle,
    UserRoundCheck,
    Users,
    WalletCards,
    X,
} from "lucide-react";
import type {
    LucideIcon,
} from "lucide-react";

type PermissionKey =
    | "canCreateEvent"
    | "canManageUsers"
    | "canManageRoles"
    | "canManageStripe"
    | "canManageWorkspace"
    | "canManageEvent"
    | "canScan"
    | "canViewReports";

type SidebarContextPayload = {
    profile: {
        id: string;
        fullName:
            | string
            | null;
        email:
            | string
            | null;
        role:
            | "admin"
            | "organizer"
            | "viewer"
            | "scanner";
        platformRole:
            | string
            | null;
        isPlatformAdmin:
            boolean;
    };
    company:
        | {
              id: string;
              name: string;
              slug:
                  | string
                  | null;
          }
        | null;
    event:
        | {
              id: string;
              name: string;
              companyId:
                  | string
                  | null;
              companyName:
                  | string
                  | null;
          }
        | null;
    modules:
        | SidebarModuleMap
        | null;
    permissions: Record<
        PermissionKey,
        boolean
    >;
};

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
    permission?: PermissionKey;
    moduleKeys?:
        SidebarModuleKey[];
    moduleMode?:
        | "all"
        | "any";
    alwaysVisibleForManagers?:
        boolean;
    platformAdminOnly?:
        boolean;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

async function readJson(
    response: Response,
) {
    const raw =
        await response.text();

    if (!raw.trim()) {
        return {};
    }

    const contentType =
        response.headers.get(
            "content-type",
        ) || "";

    if (
        contentType.includes(
            "application/json",
        )
    ) {
        try {
            return JSON.parse(raw);
        } catch {
            return {
                error:
                    "The sidebar API returned invalid JSON.",
            };
        }
    }

    if (
        contentType.includes(
            "text/html",
        ) ||
        /^\s*<!doctype html/i.test(
            raw,
        ) ||
        raw.includes(
            "/_next/static/",
        )
    ) {
        return {
            error:
                response.status ===
                404
                    ? "The sidebar context API is missing. Copy app/api/sidebar/context/route.ts and restart Next.js."
                    : `The sidebar server returned an HTML error page (HTTP ${response.status}).`,
        };
    }

    try {
        return JSON.parse(raw);
    } catch {
        return {
            error:
                raw.length > 400
                    ? `${raw.slice(
                          0,
                          400,
                      )}…`
                    : raw ||
                      "Unable to read the sidebar response.",
        };
    }
}

function eventIdFromPath(
    pathname: string,
) {
    const match =
        pathname.match(
            /^\/dashboard\/events\/([^/]+)/,
        );
    const id =
        match?.[1];

    if (
        !id ||
        id === "new" ||
        id === "create"
    ) {
        return null;
    }

    return id;
}

function itemIsActive(
    pathname: string,
    item: NavItem,
) {
    if (item.exact) {
        return (
            pathname ===
            item.href
        );
    }

    return (
        pathname ===
            item.href ||
        pathname.startsWith(
            `${item.href}/`,
        )
    );
}

export default function DashboardSidebar() {
    const pathname =
        usePathname();
    const {
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
    } = useSidebar();

    const eventId =
        useMemo(
            () =>
                eventIdFromPath(
                    pathname,
                ),
            [pathname],
        );

    const [context, setContext] =
        useState<SidebarContextPayload | null>(
            null,
        );
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState("");
    const [loggingOut, setLoggingOut] =
        useState(false);

    const loadContext =
        useCallback(async () => {
            setLoading(true);
            setError("");

            try {
                const query =
                    eventId
                        ? `?eventId=${encodeURIComponent(
                              eventId,
                          )}`
                        : "";
                const response =
                    await fetch(
                        `/api/sidebar/context${query}`,
                        {
                            cache:
                                "no-store",
                        },
                    );
                const result =
                    await readJson(
                        response,
                    );

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                            "Unable to load the sidebar.",
                    );
                }

                setContext(
                    result as SidebarContextPayload,
                );
            } catch (loadError) {
                setContext(null);
                setError(
                    loadError instanceof
                        Error
                        ? loadError.message
                        : "Unable to load the sidebar.",
                );
            } finally {
                setLoading(false);
            }
        }, [eventId]);

    useEffect(() => {
        void loadContext();
    }, [loadContext]);

    useEffect(() => {
        setMobileOpen(false);
    }, [
        pathname,
        setMobileOpen,
    ]);

    useEffect(() => {
        if (!mobileOpen) {
            return;
        }

        const previousOverflow =
            document.body.style
                .overflow;
        document.body.style.overflow =
            "hidden";

        function closeOnEscape(
            event: KeyboardEvent,
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                setMobileOpen(
                    false,
                );
            }
        }

        window.addEventListener(
            "keydown",
            closeOnEscape,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;
            window.removeEventListener(
                "keydown",
                closeOnEscape,
            );
        };
    }, [
        mobileOpen,
        setMobileOpen,
    ]);

    useEffect(() => {
        const reload = () => {
            void loadContext();
        };

        window.addEventListener(
            "regigo:modules-changed",
            reload,
        );
        window.addEventListener(
            "regigo:events-changed",
            reload,
        );
        window.addEventListener(
            "regigo:company-changed",
            reload,
        );

        const {
            data: {
                subscription,
            },
        } =
            supabase.auth.onAuthStateChange(
                () => {
                    void loadContext();
                },
            );

        return () => {
            window.removeEventListener(
                "regigo:modules-changed",
                reload,
            );
            window.removeEventListener(
                "regigo:events-changed",
                reload,
            );
            window.removeEventListener(
                "regigo:company-changed",
                reload,
            );
            subscription.unsubscribe();
        };
    }, [loadContext]);

    async function logout() {
        if (loggingOut) {
            return;
        }

        setLoggingOut(true);

        try {
            await supabase.auth
                .signOut();
        } finally {
            window.location.assign(
                "/auth/login",
            );
        }
    }

    const eventGroups =
        useMemo<NavGroup[]>(
            () =>
                eventId
                    ? [
                          {
                              title:
                                  "Event Workspace",
                              items: [
                                  {
                                      href:
                                          `/dashboard/events/${eventId}`,
                                      label:
                                          "Event Overview",
                                      icon:
                                          ClipboardList,
                                      exact:
                                          true,
                                      moduleKeys:
                                          [
                                              "overview",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/guests`,
                                      label:
                                          "Guest List",
                                      icon:
                                          Users,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "guests",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/invitations`,
                                      label:
                                          "Guest Invitations",
                                      icon:
                                          UserRoundCheck,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "invitations",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/payments`,
                                      label:
                                          "Ticket Payments",
                                      icon:
                                          CreditCard,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "payments",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/tables`,
                                      label:
                                          "Tables",
                                      icon:
                                          Table2,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "tables",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/table-selection`,
                                      label:
                                          "Guest Table Selection",
                                      icon:
                                          TableProperties,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "table_selection",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/floor-plan`,
                                      label:
                                          "Floor Plan",
                                      icon:
                                          Map,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "floor_plan",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/speakers`,
                                      label:
                                          "Speakers",
                                      icon:
                                          Mic2,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "speakers",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/agenda`,
                                      label:
                                          "Programme",
                                      icon:
                                          ListTodo,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "agenda",
                                          ],
                                  },
                              ],
                          },
                          {
                              title:
                                  "Event Day",
                              items: [
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/scanner`,
                                      label:
                                          "QR Scanner",
                                      icon:
                                          QrCode,
                                      exact:
                                          true,
                                      permission:
                                          "canScan",
                                      moduleKeys:
                                          [
                                              "scanner",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/check-in-printing`,
                                      label:
                                          "Check-in & Printing",
                                      icon:
                                          Printer,
                                      exact:
                                          true,
                                      permission:
                                          "canScan",
                                      moduleKeys:
                                          [
                                              "checkin_printing",
                                              "direct_printing",
                                          ],
                                      moduleMode:
                                          "any",
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/badges`,
                                      label:
                                          "Badge Designer",
                                      icon:
                                          BadgeCheck,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "badges",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/lucky-draw`,
                                      label:
                                          "Lucky Draw",
                                      icon:
                                          Gift,
                                      exact:
                                          true,
                                      permission:
                                          "canScan",
                                      moduleKeys:
                                          [
                                              "lucky_draw",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/games`,
                                      label:
                                          "Tournament",
                                      icon:
                                          Trophy,
                                      exact:
                                          true,
                                      permission:
                                          "canScan",
                                      moduleKeys:
                                          [
                                              "tournament",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/analytics`,
                                      label:
                                          "Analytics",
                                      icon:
                                          BarChart3,
                                      exact:
                                          true,
                                      permission:
                                          "canViewReports",
                                      moduleKeys:
                                          [
                                              "analytics",
                                          ],
                                  },
                              ],
                          },
                          {
                              title:
                                  "Administration",
                              items: [
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/registration`,
                                      label:
                                          "Registration Builder",
                                      icon:
                                          ClipboardList,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "registration",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/website`,
                                      label:
                                          "Website Builder",
                                      icon:
                                          Globe2,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "website",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/branding`,
                                      label:
                                          "Branding",
                                      icon:
                                          Palette,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "branding",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/emails`,
                                      label:
                                          "Email Centre",
                                      icon:
                                          Mail,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "emails",
                                          ],
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/settings`,
                                      label:
                                          "Settings & Add-ons",
                                      icon:
                                          Puzzle,
                                      exact:
                                          true,
                                      platformAdminOnly:
                                          true,
                                  },
                                  {
                                      href:
                                          `/dashboard/events/${eventId}/lucky-draw/settings`,
                                      label:
                                          "Lucky Draw Settings",
                                      icon:
                                          Settings,
                                      exact:
                                          true,
                                      permission:
                                          "canManageEvent",
                                      moduleKeys:
                                          [
                                              "lucky_draw_settings",
                                          ],
                                  },
                              ],
                          },
                      ]
                    : [],
            [eventId],
        );

    const navigation =
        useMemo<NavGroup[]>(
            () => [
                {
                    title: "Main",
                    items: [
                        {
                            href:
                                "/dashboard",
                            label:
                                "Dashboard",
                            icon: Home,
                            exact: true,
                        },
                        {
                            href:
                                "/dashboard/events",
                            label:
                                "My Events",
                            icon:
                                CalendarDays,
                            exact: true,
                        },
                        {
                            href:
                                "/dashboard/events/new",
                            label:
                                "Create Event",
                            icon:
                                PlusCircle,
                            exact: true,
                            permission:
                                "canCreateEvent",
                        },
                    ],
                },
                {
                    title:
                        "Management",
                    items: [
                        {
                            href:
                                "/dashboard/users",
                            label:
                                "Users & Permissions",
                            icon: Users,
                            exact: true,
                            permission:
                                "canManageUsers",
                        },
                        {
                            href:
                                "/dashboard/roles",
                            label:
                                "Roles & Permissions",
                            icon:
                                ShieldCheck,
                            exact: true,
                            permission:
                                "canManageRoles",
                        },
                        {
                            href:
                                "/dashboard/payment-setup",
                            label:
                                "Stripe Payment Setup",
                            icon:
                                WalletCards,
                            exact: true,
                            permission:
                                "canManageStripe",
                        },
                        {
                            href:
                                "/dashboard/company-plans",
                            label:
                                "Company Plans",
                            icon:
                                Building2,
                            exact: true,
                            platformAdminOnly:
                                true,
                        },
                    ],
                },
                ...eventGroups,
                {
                    title:
                        "Account",
                    items: [
                        {
                            href:
                                "/dashboard/profile",
                            label:
                                "My Profile",
                            icon:
                                UserCircle,
                            exact: true,
                        },
                        {
                            href:
                                "/dashboard/settings",
                            label:
                                "Settings",
                            icon:
                                Settings,
                            exact: true,
                            platformAdminOnly:
                                true,
                        },
                    ],
                },
            ],
            [eventGroups],
        );

    function canShow(
        item: NavItem,
    ) {
        if (!context) {
            return false;
        }

        if (
            item.platformAdminOnly &&
            !context.profile
                .isPlatformAdmin
        ) {
            return false;
        }

        if (
            item.permission
        ) {
            const isManagementItem =
                item.permission ===
                    "canManageUsers" ||
                item.permission ===
                    "canManageRoles" ||
                item.permission ===
                    "canManageStripe" ||
                item.permission ===
                    "canManageWorkspace";

            const legacyAdminFallback =
                isManagementItem &&
                (
                    context.profile
                        .isPlatformAdmin ||
                    context.profile
                        .role ===
                        "admin"
                );

            if (
                !context.permissions[
                    item.permission
                ] &&
                !legacyAdminFallback
            ) {
                return false;
            }
        }

        if (
            item.alwaysVisibleForManagers &&
            context.permissions
                .canManageEvent
        ) {
            return true;
        }

        if (
            !item.moduleKeys ||
            item.moduleKeys
                .length === 0
        ) {
            return true;
        }

        const states =
            item.moduleKeys.map(
                (key) =>
                    context.modules?.[
                        key
                    ] !== false,
            );

        return item.moduleMode ===
            "any"
            ? states.some(
                  Boolean,
              )
            : states.every(
                  Boolean,
              );
    }

    const showLabels =
        !collapsed;

    return (
        <>
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() =>
                        setMobileOpen(
                            false,
                        )
                    }
                    className="fixed inset-0 z-40 cursor-default bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
                />
            )}

            <aside
                aria-label="Dashboard navigation"
                className={[
                    "fixed inset-y-0 left-0 z-50 flex h-[100dvh] flex-col border-r border-slate-200 bg-white shadow-2xl transition-[width,transform] duration-300 ease-out lg:shadow-none",
                    "w-[min(90vw,20rem)] sm:w-80",
                    collapsed
                        ? "lg:w-24"
                        : "lg:w-80",
                    mobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0",
                ].join(" ")}
                style={{
                    paddingTop:
                        "max(1rem, env(safe-area-inset-top))",
                    paddingBottom:
                        "max(1rem, env(safe-area-inset-bottom))",
                }}
            >
                <header className="flex shrink-0 items-center justify-between gap-3 px-4 sm:px-5">
                    <div
                        className={
                            collapsed
                                ? "lg:hidden"
                                : ""
                        }
                    >
                        <Logo />
                    </div>

                    {collapsed && (
                        <Link
                            href="/dashboard/events"
                            aria-label="RegiGo events"
                            onClick={() =>
                                setMobileOpen(
                                    false,
                                )
                            }
                            className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] font-black text-white shadow-lg lg:flex"
                        >
                            R
                        </Link>
                    )}

                    <button
                        type="button"
                        aria-label={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                        onClick={() =>
                            setCollapsed(
                                !collapsed,
                            )
                        }
                        className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 lg:flex"
                    >
                        {collapsed ? (
                            <ChevronRight
                                size={
                                    20
                                }
                            />
                        ) : (
                            <ChevronLeft
                                size={
                                    20
                                }
                            />
                        )}
                    </button>

                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() =>
                            setMobileOpen(
                                false,
                            )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 lg:hidden"
                    >
                        <X size={21} />
                    </button>
                </header>

                {context && (
                    <div
                        className={[
                            "mx-4 mt-5 rounded-2xl border border-indigo-100 bg-[#F7F5FF] p-4 sm:mx-5",
                            collapsed
                                ? "lg:hidden"
                                : "",
                        ].join(" ")}
                    >
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4F46E5] shadow-sm">
                                {context.event ? (
                                    <CalendarDays
                                        size={
                                            19
                                        }
                                    />
                                ) : (
                                    <Building2
                                        size={
                                            19
                                        }
                                    />
                                )}
                            </span>

                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#4F46E5]">
                                    {context.event
                                        ? "Current Event"
                                        : context.profile
                                              .isPlatformAdmin
                                          ? "Platform Workspace"
                                          : "Company Workspace"}
                                </p>

                                <p className="mt-1 truncate text-sm font-black text-slate-900">
                                    {context.event
                                        ?.name ||
                                        context.company
                                            ?.name ||
                                        "RegiGo"}
                                </p>

                                {context.event &&
                                    context.event
                                        .companyName && (
                                        <p className="mt-1 truncate text-xs text-slate-500">
                                            {
                                                context
                                                    .event
                                                    .companyName
                                            }
                                        </p>
                                    )}
                            </div>
                        </div>
                    </div>
                )}

                <nav className="mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-4 sm:px-4">
                    {loading ? (
                        <SidebarSkeleton
                            collapsed={
                                collapsed
                            }
                        />
                    ) : error ? (
                        <div
                            className={[
                                "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700",
                                collapsed
                                    ? "lg:hidden"
                                    : "",
                            ].join(" ")}
                        >
                            {error}
                        </div>
                    ) : (
                        navigation.map(
                            (group) => {
                                const items =
                                    group.items.filter(
                                        canShow,
                                    );

                                if (
                                    items.length ===
                                    0
                                ) {
                                    return null;
                                }

                                return (
                                    <SidebarGroup
                                        key={
                                            group.title
                                        }
                                        title={
                                            group.title
                                        }
                                        collapsed={
                                            collapsed
                                        }
                                    >
                                        {items.map(
                                            (
                                                item,
                                            ) => (
                                                <SidebarLink
                                                    key={
                                                        item.href
                                                    }
                                                    item={
                                                        item
                                                    }
                                                    active={itemIsActive(
                                                        pathname,
                                                        item,
                                                    )}
                                                    collapsed={
                                                        collapsed
                                                    }
                                                    onClick={() =>
                                                        setMobileOpen(
                                                            false,
                                                        )
                                                    }
                                                />
                                            ),
                                        )}
                                    </SidebarGroup>
                                );
                            },
                        )
                    )}
                </nav>

                <footer className="shrink-0 border-t border-slate-100 px-4 pt-4 sm:px-5">
                    {context && (
                        <div
                            className={[
                                "mb-3 rounded-2xl bg-[#F7F5FF] px-4 py-3",
                                collapsed
                                    ? "lg:hidden"
                                    : "",
                            ].join(" ")}
                        >
                            <p className="truncate text-sm font-black text-slate-800">
                                {context.profile
                                    .fullName ||
                                    "User"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                {
                                    context
                                        .profile
                                        .email
                                }
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-black capitalize text-[#4F46E5]">
                                    {context.profile
                                        .isPlatformAdmin
                                        ? "Platform Admin"
                                        : context
                                              .profile
                                              .role}
                                </span>

                                {context.company
                                    ?.name && (
                                    <span className="max-w-[55%] truncate text-right text-[11px] font-bold text-slate-400">
                                        {
                                            context
                                                .company
                                                .name
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            void logout()
                        }
                        disabled={
                            loggingOut
                        }
                        className={[
                            "flex min-h-11 w-full items-center rounded-2xl px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60",
                            collapsed
                                ? "gap-3 lg:justify-center lg:px-3"
                                : "gap-3",
                        ].join(" ")}
                    >
                        <LogOut
                            size={
                                20
                            }
                            className="shrink-0"
                        />
                        <span
                            className={
                                showLabels
                                    ? ""
                                    : "lg:hidden"
                            }
                        >
                            {loggingOut
                                ? "Logging out…"
                                : "Logout"}
                        </span>
                    </button>
                </footer>
            </aside>
        </>
    );
}

function SidebarGroup({
    title,
    collapsed,
    children,
}: {
    title: string;
    collapsed: boolean;
    children:
        React.ReactNode;
}) {
    return (
        <section>
            <p
                className={[
                    "mb-2 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400",
                    collapsed
                        ? "lg:hidden"
                        : "",
                ].join(" ")}
            >
                {title}
            </p>

            <div className="space-y-1">
                {children}
            </div>
        </section>
    );
}

function SidebarLink({
    item,
    active,
    collapsed,
    onClick,
}: {
    item: NavItem;
    active: boolean;
    collapsed: boolean;
    onClick: () => void;
}) {
    const Icon =
        item.icon;

    return (
        <Link
            href={item.href}
            title={
                collapsed
                    ? item.label
                    : undefined
            }
            aria-current={
                active
                    ? "page"
                    : undefined
            }
            onClick={onClick}
            className={[
                "group flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/25",
                collapsed
                    ? "gap-3 lg:justify-center lg:px-3"
                    : "gap-3",
                active
                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-lg shadow-indigo-200/70"
                    : "text-slate-700 hover:bg-[#EEF2FF] hover:text-[#4F46E5]",
            ].join(" ")}
        >
            <Icon
                size={20}
                className="shrink-0"
            />
            <span
                className={[
                    "min-w-0 truncate",
                    collapsed
                        ? "lg:hidden"
                        : "",
                ].join(" ")}
            >
                {item.label}
            </span>
        </Link>
    );
}

function SidebarSkeleton({
    collapsed,
}: {
    collapsed: boolean;
}) {
    return (
        <div className="space-y-6 px-1">
            {[0, 1, 2].map(
                (group) => (
                    <div
                        key={
                            group
                        }
                        className="space-y-2"
                    >
                        <div
                            className={[
                                "h-3 w-24 animate-pulse rounded-full bg-slate-100",
                                collapsed
                                    ? "lg:hidden"
                                    : "",
                            ].join(" ")}
                        />
                        {[0, 1, 2].map(
                            (item) => (
                                <div
                                    key={
                                        item
                                    }
                                    className={[
                                        "h-11 animate-pulse rounded-2xl bg-slate-100",
                                        collapsed
                                            ? "lg:mx-auto lg:w-11"
                                            : "w-full",
                                    ].join(" ")}
                                />
                            ),
                        )}
                    </div>
                ),
            )}
        </div>
    );
}
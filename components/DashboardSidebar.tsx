"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    usePathname,
} from "next/navigation";
import {
    supabase,
} from "@/lib/supabase";
import Logo from "./Logo";
import {
    useSidebar,
} from "./SidebarContext";
import {
    BadgeCheck,
    BarChart3,
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
    Ticket,
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
import {
    cleanOrganizerEnabledModules,
    defaultOrganizerEnabledModules,
} from "@/lib/event-modules";

type UserRole =
    | "admin"
    | "organizer"
    | "viewer"
    | "scanner";

type RawProfile = {
    id: string;
    full_name:
        | string
        | null;
    email:
        | string
        | null;
    role:
        | string
        | null;
    platform_role?:
        | string
        | null;
    company_id?:
        | string
        | null;
};

type Profile = {
    id: string;
    full_name:
        | string
        | null;
    email:
        | string
        | null;
    role: UserRole;
    platform_role:
        | string
        | null;
    company_id:
        | string
        | null;
    is_platform_admin:
        boolean;
};

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    exact?: boolean;
    roles: UserRole[];
    moduleKey?: string;
    moduleKeys?: string[];
    moduleMode?:
        | "all"
        | "any";
    alwaysVisibleForAdmin?:
        boolean;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

const allRoles: UserRole[] = [
    "admin",
    "organizer",
    "viewer",
    "scanner",
];

const adminOnly: UserRole[] = [
    "admin",
];

const eventManagers: UserRole[] = [
    "admin",
    "organizer",
];

const scanners: UserRole[] = [
    "admin",
    "organizer",
    "scanner",
];

const reportViewers: UserRole[] = [
    "admin",
    "organizer",
    "viewer",
];

const addonToModule: Record<
    string,
    string
> = {
    guest_invitations:
        "invitations",
    stripe_payments:
        "payments",
    guest_table_selection:
        "table_selection",
    badge_designer:
        "badges",
    direct_printing:
        "direct_printing",
};

const sidebarDefaults: Record<
    string,
    boolean
> = {
    ...(defaultOrganizerEnabledModules as Record<
        string,
        boolean
    >),
    overview: true,
    guests: true,
    invitations: true,
    tickets: true,
    payments: true,
    tables: true,
    table_selection: true,
    floor_plan: true,
    speakers: true,
    agenda: true,
    scanner: true,
    checkin_printing: true,
    lucky_draw: true,
    tournament: true,
    analytics: true,
    registration: true,
    website: true,
    branding: true,
    emails: true,
    badges: true,
    direct_printing: true,
    settings: true,
    addons: true,
    lucky_draw_settings: true,
};

function canonicalRole(
    profileRole: unknown,
    platformRole: unknown,
    companyRole: unknown,
): UserRole {
    const platform =
        String(
            platformRole ||
                "",
        )
            .trim()
            .toLowerCase();

    if (
        platform ===
            "super_admin" ||
        platform ===
            "super-admin" ||
        platform ===
            "platform_admin" ||
        platform ===
            "platform-admin"
    ) {
        return "admin";
    }

    const values = [
        companyRole,
        profileRole,
    ].map((value) =>
        String(value || "")
            .trim()
            .toLowerCase(),
    );

    if (
        values.some(
            (value) =>
                value ===
                    "admin" ||
                value ===
                    "administrator" ||
                value ===
                    "company_admin" ||
                value ===
                    "company-admin" ||
                value ===
                    "owner" ||
                value ===
                    "super_admin" ||
                value ===
                    "super-admin",
        )
    ) {
        return "admin";
    }

    if (
        values.some(
            (value) =>
                value ===
                    "organizer" ||
                value ===
                    "organiser" ||
                value ===
                    "manager" ||
                value ===
                    "event_manager" ||
                value ===
                    "event-manager",
        )
    ) {
        return "organizer";
    }

    if (
        values.some(
            (value) =>
                value ===
                    "scanner" ||
                value ===
                    "checkin" ||
                value ===
                    "check_in" ||
                value ===
                    "check-in",
        )
    ) {
        return "scanner";
    }

    return "viewer";
}

function parseModuleMap(
    value: unknown,
) {
    let source: Record<
        string,
        unknown
    > = {};

    if (
        value &&
        typeof value ===
            "object" &&
        !Array.isArray(value)
    ) {
        source =
            value as Record<
                string,
                unknown
            >;
    } else if (
        typeof value ===
        "string"
    ) {
        try {
            const parsed =
                JSON.parse(value);

            if (
                parsed &&
                typeof parsed ===
                    "object" &&
                !Array.isArray(
                    parsed,
                )
            ) {
                source =
                    parsed;
            }
        } catch {
            source = {};
        }
    }

    const legacy =
        cleanOrganizerEnabledModules(
            value,
        ) as Record<
            string,
            boolean
        >;

    const output = {
        ...sidebarDefaults,
        ...legacy,
    };

    for (const [
        key,
        enabled,
    ] of Object.entries(
        source,
    )) {
        if (
            typeof enabled ===
            "boolean"
        ) {
            output[key] =
                enabled;
        }
    }

    return output;
}

function eventIdFromPath(
    pathname: string,
) {
    const match =
        pathname.match(
            /^\/dashboard\/events\/([^/]+)/,
        );
    const eventId =
        match?.[1];

    if (
        !eventId ||
        eventId === "new" ||
        eventId === "create"
    ) {
        return null;
    }

    return eventId;
}

function isActive(
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

    const [profile, setProfile] =
        useState<Profile | null>(
            null,
        );
    const [
        loadingProfile,
        setLoadingProfile,
    ] = useState(true);
    const [
        enabledModules,
        setEnabledModules,
    ] = useState<
        Record<
            string,
            boolean
        >
    >(sidebarDefaults);
    const [
        loadingModules,
        setLoadingModules,
    ] = useState(false);
    const [menuError, setMenuError] =
        useState("");
    const [
        loggingOut,
        setLoggingOut,
    ] = useState(false);

    const loadProfile =
        useCallback(async () => {
            setLoadingProfile(
                true,
            );
            setMenuError("");

            try {
                const {
                    data: {
                        user,
                    },
                    error:
                        userError,
                } =
                    await supabase.auth
                        .getUser();

                if (
                    userError ||
                    !user
                ) {
                    setProfile(
                        null,
                    );
                    return;
                }

                let profileResult =
                    await supabase
                        .from(
                            "profiles",
                        )
                        .select(
                            "id, full_name, email, role, platform_role, company_id",
                        )
                        .eq(
                            "id",
                            user.id,
                        )
                        .maybeSingle();

                if (
                    profileResult.error
                ) {
                    profileResult =
                        await supabase
                            .from(
                                "profiles",
                            )
                            .select(
                                "id, full_name, email, role",
                            )
                            .eq(
                                "id",
                                user.id,
                            )
                            .maybeSingle();
                }

                const rawProfile =
                    (
                        profileResult.data ||
                        {
                            id:
                                user.id,
                            full_name:
                                null,
                            email:
                                user.email ||
                                null,
                            role:
                                "viewer",
                        }
                    ) as RawProfile;

                let companyRole:
                    | string
                    | null =
                    null;

                const membershipResult =
                    await supabase
                        .from(
                            "company_members",
                        )
                        .select(
                            "company_role, status",
                        )
                        .eq(
                            "user_id",
                            user.id,
                        )
                        .in(
                            "status",
                            [
                                "active",
                                "invited",
                            ],
                        )
                        .order(
                            "created_at",
                            {
                                ascending:
                                    false,
                            },
                        )
                        .limit(1)
                        .maybeSingle();

                if (
                    !membershipResult.error
                ) {
                    companyRole =
                        membershipResult
                            .data
                            ?.company_role ||
                        null;
                }

                const role =
                    canonicalRole(
                        rawProfile.role,
                        rawProfile
                            .platform_role,
                        companyRole,
                    );
                const platformRole =
                    rawProfile
                        .platform_role ||
                    null;

                setProfile({
                    id:
                        rawProfile.id ||
                        user.id,
                    full_name:
                        rawProfile
                            .full_name ||
                        null,
                    email:
                        rawProfile
                            .email ||
                        user.email ||
                        null,
                    role,
                    platform_role:
                        platformRole,
                    company_id:
                        rawProfile
                            .company_id ||
                        null,
                    is_platform_admin:
                        [
                            "super_admin",
                            "super-admin",
                            "platform_admin",
                            "platform-admin",
                        ].includes(
                            String(
                                platformRole ||
                                    "",
                            ).toLowerCase(),
                        ),
                });
            } catch (error) {
                setProfile(null);
                setMenuError(
                    error instanceof
                        Error
                        ? error.message
                        : "Unable to load the sidebar profile.",
                );
            } finally {
                setLoadingProfile(
                    false,
                );
            }
        }, []);

    useEffect(() => {
        void loadProfile();

        const {
            data: {
                subscription,
            },
        } =
            supabase.auth.onAuthStateChange(
                () => {
                    void loadProfile();
                },
            );

        return () => {
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    const loadEventModules =
        useCallback(async () => {
            if (!eventId) {
                setEnabledModules(
                    sidebarDefaults,
                );
                setLoadingModules(
                    false,
                );
                return;
            }

            setLoadingModules(
                true,
            );

            try {
                const [
                    settingsResult,
                    addonsResult,
                ] =
                    await Promise.all([
                        supabase
                            .from(
                                "event_settings",
                            )
                            .select(
                                "enabled_modules",
                            )
                            .eq(
                                "event_id",
                                eventId,
                            )
                            .maybeSingle(),

                        supabase
                            .from(
                                "event_addons",
                            )
                            .select(
                                "addon_key, enabled",
                            )
                            .eq(
                                "event_id",
                                eventId,
                            ),
                    ]);

                let modules =
                    settingsResult.error
                        ? {
                              ...sidebarDefaults,
                          }
                        : parseModuleMap(
                              settingsResult
                                  .data
                                  ?.enabled_modules,
                          );

                if (
                    !addonsResult.error
                ) {
                    for (const addon of
                        addonsResult.data ||
                        []) {
                        const moduleKey =
                            addonToModule[
                                String(
                                    addon.addon_key,
                                )
                            ];

                        if (
                            moduleKey
                        ) {
                            modules[
                                moduleKey
                            ] =
                                Boolean(
                                    addon.enabled,
                                );
                        }
                    }
                }

                setEnabledModules(
                    modules,
                );
            } catch {
                setEnabledModules(
                    sidebarDefaults,
                );
            } finally {
                setLoadingModules(
                    false,
                );
            }
        }, [eventId]);

    useEffect(() => {
        void loadEventModules();

        const reload = () => {
            void loadEventModules();
            void loadProfile();
        };

        window.addEventListener(
            "regigo:modules-changed",
            reload,
        );
        window.addEventListener(
            "regigo:company-changed",
            reload,
        );

        return () => {
            window.removeEventListener(
                "regigo:modules-changed",
                reload,
            );
            window.removeEventListener(
                "regigo:company-changed",
                reload,
            );
        };
    }, [
        loadEventModules,
        loadProfile,
    ]);

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

        const previous =
            document.body.style
                .overflow;
        document.body.style.overflow =
            "hidden";

        const closeOnEscape = (
            event: KeyboardEvent,
        ) => {
            if (
                event.key ===
                "Escape"
            ) {
                setMobileOpen(
                    false,
                );
            }
        };

        window.addEventListener(
            "keydown",
            closeOnEscape,
        );

        return () => {
            document.body.style.overflow =
                previous;
            window.removeEventListener(
                "keydown",
                closeOnEscape,
            );
        };
    }, [
        mobileOpen,
        setMobileOpen,
    ]);

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

    const eventGroups:
        NavGroup[] =
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
                              roles:
                                  allRoles,
                              moduleKey:
                                  "overview",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "guests",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "invitations",
                          },
                          {
                              href:
                                  `/dashboard/events/${eventId}/tickets`,
                              label:
                                  "Ticket Types",
                              icon:
                                  Ticket,
                              exact:
                                  true,
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "tickets",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "payments",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "tables",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "table_selection",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "floor_plan",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "speakers",
                          },
                          {
                              href:
                                  `/dashboard/events/${eventId}/agenda`,
                              label:
                                  "Agenda",
                              icon:
                                  ListTodo,
                              exact:
                                  true,
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "agenda",
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
                              roles:
                                  scanners,
                              moduleKey:
                                  "scanner",
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
                              roles:
                                  scanners,
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "badges",
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
                              roles:
                                  scanners,
                              moduleKey:
                                  "lucky_draw",
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
                              roles:
                                  scanners,
                              moduleKey:
                                  "tournament",
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
                              roles:
                                  reportViewers,
                              moduleKey:
                                  "analytics",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "registration",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "website",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "branding",
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "emails",
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
                              roles:
                                  eventManagers,
                              moduleKeys:
                                  [
                                      "settings",
                                      "addons",
                                  ],
                              moduleMode:
                                  "any",
                              alwaysVisibleForAdmin:
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
                              roles:
                                  eventManagers,
                              moduleKey:
                                  "lucky_draw_settings",
                          },
                      ],
                  },
              ]
            : [];

    const groups: NavGroup[] = [
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
                    roles: allRoles,
                },
                {
                    href:
                        "/dashboard/events",
                    label:
                        "My Events",
                    icon:
                        CalendarDays,
                    exact: true,
                    roles: allRoles,
                },
                {
                    href:
                        "/dashboard/events/new",
                    label:
                        "Create Event",
                    icon:
                        PlusCircle,
                    exact: true,
                    roles: adminOnly,
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
                    roles: adminOnly,
                },
                {
                    href:
                        "/dashboard/roles",
                    label:
                        "Roles & Permissions",
                    icon:
                        ShieldCheck,
                    exact: true,
                    roles: adminOnly,
                },
                {
                    href:
                        "/dashboard/payment-setup",
                    label:
                        "Stripe Payment Setup",
                    icon:
                        WalletCards,
                    exact: true,
                    roles: adminOnly,
                },
            ],
        },
        ...eventGroups,
        {
            title: "Account",
            items: [
                {
                    href:
                        "/dashboard/profile",
                    label:
                        "My Profile",
                    icon:
                        UserCircle,
                    exact: true,
                    roles: allRoles,
                },
                {
                    href:
                        "/dashboard/settings",
                    label:
                        "Settings",
                    icon:
                        Settings,
                    exact: true,
                    roles: adminOnly,
                },
            ],
        },
    ];

    function canShow(
        item: NavItem,
    ) {
        if (
            loadingProfile ||
            !profile
        ) {
            return false;
        }

        if (
            !item.roles.includes(
                profile.role,
            )
        ) {
            return false;
        }

        // Company and platform admins always retain management/settings links.
        if (
            profile.role ===
                "admin" &&
            (
                item.alwaysVisibleForAdmin ||
                !item.moduleKey &&
                !item.moduleKeys
            )
        ) {
            return true;
        }

        if (
            !eventId ||
            (
                !item.moduleKey &&
                !item.moduleKeys
            )
        ) {
            return true;
        }

        if (
            loadingModules
        ) {
            return (
                profile.role ===
                "admin"
            );
        }

        if (
            item.alwaysVisibleForAdmin &&
            profile.role ===
                "admin"
        ) {
            return true;
        }

        const keys =
            item.moduleKeys ||
            (
                item.moduleKey
                    ? [
                          item.moduleKey,
                      ]
                    : []
            );
        const states =
            keys.map(
                (key) =>
                    enabledModules[
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
                    "fixed inset-y-0 left-0 z-50 flex h-[100dvh] flex-col border-r border-slate-200 bg-white shadow-2xl transition-[width,transform] duration-300 lg:shadow-none",
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
                            className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] font-black text-white lg:flex"
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
                        className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] lg:flex"
                    >
                        {collapsed ? (
                            <ChevronRight
                                size={20}
                            />
                        ) : (
                            <ChevronLeft
                                size={20}
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
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5] lg:hidden"
                    >
                        <X size={21} />
                    </button>
                </header>

                <nav className="mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-4 sm:px-4">
                    {loadingProfile ? (
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
                            <span
                                className={
                                    collapsed
                                        ? "lg:hidden"
                                        : ""
                                }
                            >
                                Loading menu…
                            </span>
                        </div>
                    ) : menuError ? (
                        <div
                            className={[
                                "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700",
                                collapsed
                                    ? "lg:hidden"
                                    : "",
                            ].join(" ")}
                        >
                            {menuError}
                        </div>
                    ) : (
                        groups.map(
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
                                    <NavGroup
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
                                                <SideLink
                                                    key={
                                                        item.href
                                                    }
                                                    item={
                                                        item
                                                    }
                                                    active={isActive(
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
                                    </NavGroup>
                                );
                            },
                        )
                    )}
                </nav>

                <footer className="shrink-0 border-t border-slate-100 px-4 pt-4 sm:px-5">
                    {profile && (
                        <div
                            className={[
                                "mb-3 rounded-2xl bg-[#F7F5FF] px-4 py-3",
                                collapsed
                                    ? "lg:hidden"
                                    : "",
                            ].join(" ")}
                        >
                            <p className="truncate text-sm font-black text-slate-800">
                                {profile.full_name ||
                                    "User"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                {profile.email}
                            </p>
                            <p className="mt-2 text-xs font-black capitalize text-[#4F46E5]">
                                {profile.is_platform_admin
                                    ? "Platform Admin"
                                    : profile.role ===
                                        "admin"
                                      ? "Company Admin"
                                      : profile.role}
                            </p>
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
                            "flex min-h-11 w-full items-center rounded-2xl px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60",
                            collapsed
                                ? "gap-3 lg:justify-center lg:px-3"
                                : "gap-3",
                        ].join(" ")}
                    >
                        <LogOut
                            size={20}
                            className="shrink-0"
                        />
                        <span
                            className={
                                collapsed
                                    ? "lg:hidden"
                                    : ""
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

function NavGroup({
    title,
    collapsed,
    children,
}: {
    title: string;
    collapsed: boolean;
    children: ReactNode;
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

function SideLink({
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
                "flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-bold transition",
                collapsed
                    ? "gap-3 lg:justify-center lg:px-3"
                    : "gap-3",
                active
                    ? "bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-lg"
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

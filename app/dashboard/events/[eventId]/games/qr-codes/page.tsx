import Link from "next/link";
import { redirect } from "next/navigation";
import * as QRCode from "qrcode";
import {
    ArrowLeft,
    ExternalLink,
    Gamepad2,
    Mail,
    QrCode as QrCodeIcon,
    Search,
    UserCheck,
    UserRoundX,
} from "lucide-react";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GuestAccessRow = {
    registration_id: string;
    guest_name: string;
    guest_email: string;
    access_token: string;
    checked_in: boolean;
};

type GuestQr = GuestAccessRow & {
    gameUrl: string;
    qrDataUrl: string;
};

const PUBLIC_APP_URL = "https://regigo-events-henna.vercel.app";

function getBaseUrl() {
    return PUBLIC_APP_URL;
}

export default async function GuestGameQrCodesPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ q?: string }>;
}) {
    const { supabaseServer } = await requirePermission("can_manage_guests");
    const { eventId } = await params;

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: profile } = await supabaseServer
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    const canManageQrCodes =
        profile?.role === "admin" ||
        profile?.role === "organizer" ||
        profile?.role === "organiser";

    if (!canManageQrCodes) {
        redirect(`/dashboard/events/${eventId}`);
    }

    const { data: moduleSettings } = await supabaseServer
        .from("event_settings")
        .select("enabled_modules")
        .eq("event_id", eventId)
        .maybeSingle();

    const enabledModules =
        (moduleSettings?.enabled_modules as Record<string, boolean> | null) || {};

    if (enabledModules.glitter_games_qr_codes === false) {
        redirect(`/dashboard/events/${eventId}`);
    }
    const { q = "" } = await searchParams;
    const searchQuery = q.trim().toLowerCase();

    const { data: event, error: eventError } = await supabaseServer
        .from("events")
        .select("id,event_name,event_slug")
        .eq("id", eventId)
        .maybeSingle();

    if (eventError || !event) {
        return (
            <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
                <div className="mx-auto max-w-5xl rounded-[1.5rem] border border-red-200 bg-white p-6 shadow-sm md:rounded-[2rem] md:p-8">
                    <p className="font-black text-red-600">
                        {eventError?.message || "Event not found."}
                    </p>
                </div>
            </main>
        );
    }

    const { data, error } = await supabaseServer.rpc(
        "get_glitter_guest_access_list_v1",
        { p_event_id: String(event.id) },
    );

    const rows = ((data || []) as GuestAccessRow[]).map((row) => ({
        ...row,
        checked_in: row.checked_in === true,
    }));

    const readyGuests = rows.filter((row) => row.checked_in);
    const pendingGuests = rows.filter((row) => !row.checked_in);
    const baseUrl = getBaseUrl();

    const guestQrs: GuestQr[] = await Promise.all(
        readyGuests.map(async (guest) => {
            const gameUrl = `${baseUrl}/event/${encodeURIComponent(
                event.event_slug,
            )}/games/access?code=${encodeURIComponent(guest.access_token)}`;

            const qrDataUrl = await QRCode.toDataURL(gameUrl, {
                width: 360,
                margin: 3,
                errorCorrectionLevel: "Q",
            });

            return { ...guest, gameUrl, qrDataUrl };
        }),
    );

    const filteredGuestQrs = searchQuery
        ? guestQrs.filter((guest) => {
              const name = guest.guest_name?.toLowerCase() || "";
              const email = guest.guest_email?.toLowerCase() || "";

              return name.includes(searchQuery) || email.includes(searchQuery);
          })
        : guestQrs;

    return (
        <main className="min-h-[100dvh] overflow-x-hidden bg-[#F7F5FF] px-4 py-5 text-slate-950 sm:px-6 md:p-8">
            <div className="mx-auto w-full max-w-7xl space-y-5 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={`/dashboard/events/${eventId}`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:text-[#EC4899]"
                    >
                        <ArrowLeft size={17} />
                        Back to Event
                    </Link>

                    <Link
                        href={`${baseUrl}/event/${encodeURIComponent(event.event_slug)}/games`}
                        target="_blank"
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#4F46E5]/20 bg-white px-4 py-3 text-sm font-black text-[#4F46E5] shadow-sm transition hover:border-[#4F46E5]/40"
                    >
                        <ExternalLink size={17} />
                        Open Public Lobby
                    </Link>
                </div>

                <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:rounded-[2rem] md:p-10">
                    <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#EC4899]/10 blur-3xl" />
                    <div className="absolute -bottom-16 right-24 h-52 w-52 rounded-full bg-[#4F46E5]/10 blur-3xl" />

                    <div className="relative z-10 max-w-3xl">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                            <QrCodeIcon size={28} />
                        </div>
                        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                            Guest Game Pass Access
                        </p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                            Glitter Games QR Codes
                        </h1>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 sm:text-base sm:leading-7">
                            Each checked-in guest receives a different QR code. Every QR opens the live RegiGo website, so guests can scan it from any phone.
                        </p>

                        <div className="mt-5 rounded-2xl border border-indigo-100 bg-[#F7F5FF] px-4 py-3 text-sm font-bold text-slate-600">
                            QR website address:{" "}
                            <span className="break-all font-black text-[#4F46E5]">
                                {baseUrl}
                            </span>
                        </div>
                    </div>
                </section>

                {error && (
                    <section className="rounded-2xl border border-red-200 bg-white p-5 font-bold text-red-700 shadow-sm">
                        Unable to load QR codes: {error.message}
                    </section>
                )}

                <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Registered"
                        value={rows.length}
                        icon={Gamepad2}
                    />
                    <StatCard
                        label="QR Ready"
                        value={guestQrs.length}
                        icon={QrCodeIcon}
                    />
                    <StatCard
                        label="Checked In"
                        value={readyGuests.length}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Awaiting Check-In"
                        value={pendingGuests.length}
                        icon={UserRoundX}
                    />
                </section>

                <section>
                    <div className="mb-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4F46E5]">
                            Ready to Play
                        </p>
                        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                            Find a guest QR code
                        </h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            Search by the checked-in guest&apos;s name or email address when they did not receive their game pass email.
                        </p>
                    </div>

                    <form
                        method="GET"
                        className="mb-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:rounded-[2rem]"
                    >
                        <label
                            htmlFor="guest-qr-search"
                            className="text-sm font-black text-slate-700"
                        >
                            Search checked-in guests
                        </label>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    id="guest-qr-search"
                                    name="q"
                                    defaultValue={q}
                                    placeholder="Search guest name or email"
                                    autoComplete="off"
                                    className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                                />
                            </div>

                            <button
                                type="submit"
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-black text-white transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20"
                            >
                                <Search size={17} aria-hidden="true" />
                                Search
                            </button>

                            {searchQuery && (
                                <Link
                                    href={`/dashboard/events/${eventId}/games/qr-codes`}
                                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
                                >
                                    Clear
                                </Link>
                            )}
                        </div>
                    </form>

                    {guestQrs.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm md:rounded-[2rem]">
                            <UserRoundX
                                size={32}
                                className="mx-auto text-slate-400"
                            />
                            <h3 className="mt-4 text-xl font-black">
                                No checked-in guests yet
                            </h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                Check guests in first. Their unique game QR codes will appear here automatically. Refresh this page after check-in to generate the latest QR links.
                            </p>
                        </div>
                    ) : filteredGuestQrs.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm md:rounded-[2rem]">
                            <Search
                                size={32}
                                className="mx-auto text-slate-400"
                            />
                            <h3 className="mt-4 text-xl font-black">
                                No matching guest found
                            </h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                Try the guest&apos;s full name, part of their name, or their registered email address.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-4 text-sm font-bold text-slate-500">
                                Showing {filteredGuestQrs.length} of {guestQrs.length} checked-in guest
                                {guestQrs.length === 1 ? "" : "s"}.
                            </p>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredGuestQrs.map((guest) => (
                                <article
                                    key={guest.registration_id}
                                    className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <UserCheck size={21} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-lg font-black">
                                                {guest.guest_name}
                                            </h3>
                                            <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold text-slate-500">
                                                <Mail size={14} className="shrink-0" />
                                                <span className="truncate">
                                                    {guest.guest_email || "No email"}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-[1.25rem] border border-slate-100 bg-white p-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={guest.qrDataUrl}
                                            alt={`Glitter Games QR code for ${guest.guest_name}`}
                                            className="mx-auto aspect-square w-full max-w-[260px]"
                                        />
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            QR destination
                                        </p>
                                        <p className="mt-1 break-all text-xs font-semibold leading-5 text-slate-600">
                                            {guest.gameUrl}
                                        </p>
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
                                        <p className="text-sm font-black text-emerald-700">
                                            Ask the guest to scan this QR code
                                        </p>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700/80">
                                            It will verify their checked-in registration and open the Glitter Games lobby on their phone.
                                        </p>
                                    </div>
                                </article>
                            ))}
                            </div>
                        </>
                    )}
                </section>

                {pendingGuests.length > 0 && (
                    <section className="rounded-[1.5rem] border border-amber-200 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                        <h2 className="text-lg font-black">
                            {pendingGuests.length} guest
                            {pendingGuests.length === 1 ? " is" : "s are"} awaiting check-in
                        </h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            Their access tokens already exist, but the QR link will refuse entry until Regigo records a completed check-in.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Gamepad2;
}) {
    return (
        <div className="min-w-0 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:rounded-[1.5rem]">
            <Icon size={20} className="text-[#4F46E5]" />
            <p className="mt-3 truncate text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-xs">
                {label}
            </p>
            <p className="mt-1 text-2xl font-black sm:text-3xl">{value}</p>
        </div>
    );
}
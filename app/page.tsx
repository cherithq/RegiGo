import Link from "next/link";
import Logo from "@/components/layout/Logo";
import EnquiryForm from "@/components/forms/EnquiryForm";
import type { ElementType } from "react";
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Gift,
    Globe2,
    Mail,
    Map,
    Mic2,
    Palette,
    QrCode,
    ShieldCheck,
    Table2,
    Ticket,
    Users,
} from "lucide-react";

const features: {
    title: string;
    description: string;
    icon: ElementType;
}[] = [
        {
            title: "Register Guests",
            description:
                "Create customisable registration pages with branded event details, guest forms, required fields and QR pass support.",
            icon: Globe2,
        },
        {
            title: "Manage Event Setup",
            description:
                "RegiGo prepares the event setup based on your requirements, including branding, forms, tables, emails and event-day tools.",
            icon: ClipboardList,
        },
        {
            title: "Go Live Smoothly",
            description:
                "Run event day with QR check-in, attendance tracking, lucky draw display and exportable reports.",
            icon: QrCode,
        },
        {
            title: "Custom Registration Forms",
            description:
                "Collect guest details, dietary needs, ticket types, phone country codes and custom questions based on the event.",
            icon: Ticket,
        },
        {
            title: "Email Automation",
            description:
                "Send confirmation emails, event updates, table assignments and other guest communications.",
            icon: Mail,
        },
        {
            title: "Table Management",
            description:
                "Create tables, manage capacity, assign guests and export seating information for operations.",
            icon: Table2,
        },
        {
            title: "Floor Plan",
            description:
                "Prepare venue layout support when needed so organisers can communicate movement and zones clearly.",
            icon: Map,
        },
        {
            title: "Speakers & Agenda",
            description:
                "Add speakers, hosts, presenters and schedules when the event needs programme information.",
            icon: Mic2,
        },
        {
            title: "Lucky Draw",
            description:
                "Run a Wheel of Fortune style lucky draw using checked-in guests only, with an audience-safe display.",
            icon: Gift,
        },
        {
            title: "Branding Controls",
            description:
                "Customise banners, backgrounds and visuals to match the client’s brand and event identity.",
            icon: Palette,
        },
        {
            title: "Reports & Analytics",
            description:
                "Track registrations, attendance, check-in status, guest data and export reports after the event.",
            icon: BarChart3,
        },
        {
            title: "Protected Dashboard",
            description:
                "Only approved users can log in to access event setup, guest data, check-in tools and reports.",
            icon: ShieldCheck,
        },
    ];

const workflow = [
    {
        number: "01",
        title: "Enquire",
        description:
            "Tell RegiGo about your event, expected guest count, event type, date, venue and required features.",
    },
    {
        number: "02",
        title: "Register",
        description:
            "RegiGo prepares the custom registration page and form so guests can register smoothly.",
    },
    {
        number: "03",
        title: "Manage",
        description:
            "Approved users can manage guests, tables, emails, event details and event-day preparation.",
    },
    {
        number: "04",
        title: "Go",
        description:
            "Run the event with QR check-in, attendance tracking, lucky draw display and reports.",
    },
];

export default function MarketingPage() {
    return (
        <main className="min-h-screen bg-white text-slate-950">
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link href="#home" className="inline-flex items-center gap-4">
                        <Logo />

                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                        <p className="hidden text-xs font-black uppercase tracking-[0.24em] text-slate-400 sm:block">
                            Register. Manage. Go.
                        </p>
                    </Link>

                    <nav className="hidden items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-bold text-slate-600 shadow-sm lg:flex">
                        <a
                            href="#home"
                            className="rounded-full px-5 py-2.5 transition hover:bg-white hover:text-[#4F46E5] hover:shadow-sm"
                        >
                            Home
                        </a>

                        <a
                            href="#workflow"
                            className="rounded-full px-5 py-2.5 transition hover:bg-white hover:text-[#4F46E5] hover:shadow-sm"
                        >
                            Workflow
                        </a>

                        <a
                            href="#features"
                            className="rounded-full px-5 py-2.5 transition hover:bg-white hover:text-[#4F46E5] hover:shadow-sm"
                        >
                            Features
                        </a>

                        <a
                            href="#event-day"
                            className="rounded-full px-5 py-2.5 transition hover:bg-white hover:text-[#4F46E5] hover:shadow-sm"
                        >
                            Event Day
                        </a>

                        <a
                            href="#enquiry"
                            className="rounded-full px-5 py-2.5 transition hover:bg-white hover:text-[#EC4899] hover:shadow-sm"
                        >
                            Enquiry
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <a
                            href="#enquiry"
                            className="hidden items-center justify-center rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-5 py-3 text-sm font-black text-white shadow-md transition hover:opacity-90 sm:inline-flex"
                        >
                            Submit Enquiry
                        </a>

                        <Link
                            href="/auth/login"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-[#4F46E5]/40 hover:bg-[#F7F5FF] hover:text-[#4F46E5]"
                        >
                            Login
                        </Link>
                    </div>
                </div>

                <div className="h-[3px] w-full bg-gradient-to-r from-[#4F46E5] via-[#8B5CF6] to-[#EC4899]" />
            </header>

            <section
                id="home"
                className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-[#FBFAFF] to-[#F7F5FF]"
            >
                <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#4F46E5]/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-[-280px] right-[-180px] h-[560px] w-[560px] rounded-full bg-[#EC4899]/10 blur-3xl" />

                <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                            <ShieldCheck size={16} className="text-[#4F46E5]" />
                            Register. Manage. Go.
                        </div>

                        <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-tight text-slate-950 md:text-7xl">
                            Register guests. Manage events. Go live with confidence.
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                            RegiGo helps organisations launch custom registration pages,
                            manage event operations and run smoother event-day experiences.
                            From QR check-in and table assignments to email updates, lucky
                            draws and reports, RegiGo prepares the setup around your event
                            needs.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a
                                href="#enquiry"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-6 py-4 font-bold text-white shadow-lg transition hover:opacity-90"
                            >
                                Start an Enquiry
                                <ArrowRight size={18} />
                            </a>

                            <a
                                href="#workflow"
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-700 shadow-sm transition hover:border-[#4F46E5] hover:text-[#4F46E5]"
                            >
                                See the Process
                            </a>
                        </div>

                        <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
                            <HeroStat value="Register" label="Custom guest registration" />
                            <HeroStat value="Manage" label="Event operations" />
                            <HeroStat value="Go" label="Event-day tools" />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl">
                        <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/40">
                                        RegiGo Experience
                                    </p>
                                    <h2 className="mt-3 text-3xl font-black">
                                        Register. Manage. Go — built around your event.
                                    </h2>
                                    <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
                                        A managed event setup flow for teams that want a clean
                                        registration and event-day system without building
                                        everything from scratch.
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white/10 p-3 text-pink-300">
                                    <ClipboardList size={28} />
                                </div>
                            </div>

                            <div className="mt-8 space-y-4">
                                <ProcessPreview
                                    number="01"
                                    title="Register"
                                    text="RegiGo prepares a custom registration page and form for your guests."
                                />
                                <ProcessPreview
                                    number="02"
                                    title="Manage"
                                    text="Approved users manage guests, tables, emails, event details and reports."
                                />
                                <ProcessPreview
                                    number="03"
                                    title="Go"
                                    text="Run event day with QR check-in, attendance tracking and lucky draw tools."
                                />
                            </div>

                            <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-slate-950">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-500">
                                            Contact RegiGo
                                        </p>
                                        <a
                                            href="mailto:regigo.noreply@gmail.com"
                                            className="mt-1 block break-all text-lg font-black transition hover:text-[#4F46E5]"
                                        >
                                            regigo.noreply@gmail.com
                                        </a>
                                    </div>

                                    <div className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] p-3 text-white">
                                        <Mail size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="workflow" className="px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Workflow"
                        title="From enquiry to event day."
                        description="RegiGo follows a clear flow: understand your event requirements, prepare the registration setup, support event management and help your team go live smoothly."
                    />

                    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {workflow.map((item) => (
                            <WorkflowCard
                                key={item.number}
                                number={item.number}
                                title={item.title}
                                description={item.description}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section id="features" className="bg-slate-50 px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Features"
                        title="Everything you need to register, manage and go."
                        description="RegiGo can support registration pages, branding, guest forms, QR check-in, seating, agenda, lucky draw and reporting depending on what each event needs."
                    />

                    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {features.map((feature) => (
                            <FeatureCard
                                key={feature.title}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section id="event-day" className="px-6 py-20">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <SectionHeader
                            eyebrow="Go Live"
                            title="Run guest flow and engagement with confidence."
                            description="After the event is created, approved users can access tools for QR check-in, seating, attendance tracking, lucky draw display and reports."
                        />

                        <div className="mt-8 space-y-4">
                            <InfoPoint
                                title="Register"
                                text="Guests register through a custom event page and receive confirmation details or QR passes."
                            />
                            <InfoPoint
                                title="Manage"
                                text="Your team can manage guest lists, tables, emails, attendance and event-day preparation."
                            />
                            <InfoPoint
                                title="Go"
                                text="On event day, use QR check-in, live attendance tracking, lucky draw display and exportable reports."
                            />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl">
                        <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/40">
                                        Event Dashboard
                                    </p>
                                    <h3 className="mt-3 text-3xl font-black">
                                        Manage everything from one place.
                                    </h3>
                                    <p className="mt-2 text-sm font-semibold text-white/50">
                                        Registration, check-in and event-day tools in a protected
                                        dashboard.
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white/10 p-3 text-pink-300">
                                    <CalendarDays size={28} />
                                </div>
                            </div>

                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                <PreviewMetric icon={Users} label="Registrations" value="248" />
                                <PreviewMetric
                                    icon={CheckCircle2}
                                    label="Checked In"
                                    value="186"
                                />
                                <PreviewMetric icon={Table2} label="Tables" value="32" />
                                <PreviewMetric icon={Gift} label="Lucky Draw" value="Ready" />
                            </div>

                            <div className="mt-6 rounded-[1.5rem] bg-white p-5 text-slate-950">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-500">
                                            Register. Manage. Go.
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            Custom Event Setup
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] p-3 text-white">
                                        <Globe2 size={24} />
                                    </div>
                                </div>

                                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]" />
                                </div>

                                <p className="mt-4 text-sm font-semibold text-slate-500">
                                    Each event can have its own branding, fields and registration
                                    requirements.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="enquiry" className="bg-slate-50 px-6 py-20">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                    <div>
                        <SectionHeader
                            eyebrow="Enquiry"
                            title="Start with RegiGo."
                            description="Submit your event details below. RegiGo will review your requirements and prepare the event setup so you can register guests, manage operations and go live with confidence."
                        />

                        <div className="mt-8 space-y-4">
                            <InfoPoint
                                title="Register"
                                text="Tell us what kind of registration page, fields and guest information your event needs."
                            />
                            <InfoPoint
                                title="Manage"
                                text="RegiGo prepares the event setup, branding, modules and dashboard access based on your requirements."
                            />
                            <InfoPoint
                                title="Go"
                                text="Once ready, approved users can log in and run the event using RegiGo’s event-day tools."
                            />
                        </div>

                        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-[#F7F5FF] p-3 text-[#4F46E5]">
                                    <Mail size={22} />
                                </div>

                                <div>
                                    <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                                        Email
                                    </p>
                                    <a
                                        href="mailto:regigo.noreply@gmail.com"
                                        className="mt-1 block break-all text-lg font-black text-slate-950 transition hover:text-[#4F46E5]"
                                    >
                                        regigo.noreply@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <EnquiryForm />
                </div>
            </section>

            <footer className="border-t border-slate-200 bg-white px-6 py-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
                    <p>
                        © {new Date().getFullYear()} RegiGo. Register. Manage. Go.
                    </p>

                    <a
                        href="mailto:regigo.noreply@gmail.com"
                        className="break-all transition hover:text-[#EC4899]"
                    >
                        regigo.noreply@gmail.com
                    </a>
                </div>
            </footer>
        </main>
    );
}

function HeroStat({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="bg-gradient-to-r from-[#4F46E5] to-[#EC4899] bg-clip-text text-2xl font-black text-transparent">
                {value}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
        </div>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4F46E5]">
                {eyebrow}
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                {title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                {description}
            </p>
        </div>
    );
}

function WorkflowCard({
    number,
    title,
    description,
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#4F46E5]/30 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F5FF] text-xl font-black text-[#4F46E5] transition group-hover:bg-gradient-to-r group-hover:from-[#4F46E5] group-hover:to-[#EC4899] group-hover:text-white">
                {number}
            </div>

            <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        </div>
    );
}

function FeatureCard({
    title,
    description,
    icon: Icon,
}: {
    title: string;
    description: string;
    icon: ElementType;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#4F46E5]/30 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F5FF] text-[#4F46E5]">
                <Icon size={24} />
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
    );
}

function InfoPoint({ title, text }: { title: string; text: string }) {
    return (
        <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
            </div>

            <div>
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
        </div>
    );
}

function PreviewMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-white/10 p-5">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3 text-pink-300">
                    <Icon size={21} />
                </div>

                <div>
                    <p className="text-sm font-semibold text-white/50">{label}</p>
                    <p className="text-2xl font-black">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ProcessPreview({
    number,
    title,
    text,
}: {
    number: string;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-2xl bg-white/10 p-5">
            <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-[#4F46E5]">
                    {number}
                </div>

                <div>
                    <h3 className="font-black text-white">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/55">{text}</p>
                </div>
            </div>
        </div>
    );
}
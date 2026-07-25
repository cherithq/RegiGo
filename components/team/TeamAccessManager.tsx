"use client";

import {
    ArrowRight,
    Users,
} from "lucide-react";
import Link from "next/link";

export default function TeamAccessManager() {
    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F5FF] text-[#4F46E5]">
                <Users size={23} />
            </div>

            <h2 className="mt-5 text-2xl font-black">
                Team Access moved
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Company users, password invitations, roles and event assignments are now managed together under Users & Permissions.
            </p>

            <Link
                href="/dashboard/users"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#4F46E5] px-5 py-3 font-black text-white"
            >
                Open Users & Permissions
                <ArrowRight size={17} />
            </Link>
        </section>
    );
}

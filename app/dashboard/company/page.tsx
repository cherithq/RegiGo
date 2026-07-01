import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase-server";
import CompanyForm from "@/components/forms/CompanyForm";
import { requirePermission } from "@/lib/permissions";

export default async function CompanyPage() {
    await requirePermission("can_manage_company");
    const { data: company } = await supabaseServer
        .from("companies")
        .select("*")
        .eq("company_slug", "regigo-demo")
        .maybeSingle();

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-5xl">

                <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-4xl font-black">Company</h1>
                    <p className="mt-2 text-slate-600">
                        Manage your organization details and default branding.
                    </p>

                    <div className="mt-8">
                        <CompanyForm company={company} />
                    </div>
                </div>
            </div>
        </main>
    );
}
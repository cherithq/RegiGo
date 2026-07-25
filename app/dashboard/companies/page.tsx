import CompanyModulesManager from "@/components/company/CompanyModulesManager";

export const dynamic = "force-dynamic";

export default function CompaniesPage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl">
                <CompanyModulesManager />
            </div>
        </main>
    );
}

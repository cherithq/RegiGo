import CompanyRentalPlanManager from "@/components/company/CompanyRentalPlanManager";

export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

export default function CompanyPlansPage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                <CompanyRentalPlanManager />
            </div>
        </main>
    );
}

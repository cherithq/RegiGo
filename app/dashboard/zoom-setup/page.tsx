import ZoomSetupManager from "@/components/company/ZoomSetupManager";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default async function ZoomSetupPage({
    searchParams,
}: {
    searchParams: Promise<{
        companyId?:
            | string
            | string[];
    }>;
}) {
    const params =
        await searchParams;
    const companyId =
        typeof params.companyId ===
        "string"
            ? params.companyId
            : null;

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-3xl">
                <ZoomSetupManager
                    companyId={
                        companyId
                    }
                />
            </div>
        </main>
    );
}

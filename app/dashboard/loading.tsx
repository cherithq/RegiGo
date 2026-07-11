export default function DashboardLoading() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="h-40 animate-pulse rounded-[2rem] bg-white shadow-sm" />

                <div className="grid gap-5 md:grid-cols-3">
                    <div className="h-32 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                    <div className="h-32 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                    <div className="h-32 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                </div>

                <div className="h-96 animate-pulse rounded-[2rem] bg-white shadow-sm" />
            </div>
        </main>
    );
}
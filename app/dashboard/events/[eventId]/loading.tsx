export default function EventPageLoading() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="h-40 animate-pulse rounded-[2rem] bg-white shadow-sm" />

                <div className="grid gap-5 md:grid-cols-4">
                    <div className="h-28 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                    <div className="h-28 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                    <div className="h-28 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                    <div className="h-28 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="h-96 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                    <div className="h-96 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                </div>
            </div>
        </main>
    );
}
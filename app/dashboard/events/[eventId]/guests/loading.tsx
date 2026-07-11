export default function GuestsLoading() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="h-36 animate-pulse rounded-[2rem] bg-white shadow-sm" />
                <div className="h-16 animate-pulse rounded-[2rem] bg-white shadow-sm" />

                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-20 animate-pulse rounded-2xl bg-white shadow-sm"
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}
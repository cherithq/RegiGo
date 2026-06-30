import Link from "next/link";

export default function DashboardSettingsPage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-4xl">

                <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
                    <h1 className="text-4xl font-black">Settings</h1>
                    <p className="mt-2 text-slate-600">
                        Manage your RegiGo workspace settings.
                    </p>

                    <div className="mt-8 rounded-2xl bg-[#F7F5FF] p-6">
                        <h2 className="text-2xl font-black">Workspace</h2>
                        <p className="mt-2 text-slate-600">
                            You are currently using the RegiGo demo workspace.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
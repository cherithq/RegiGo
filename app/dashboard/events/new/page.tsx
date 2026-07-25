import CreateEventManager from "@/components/company/CreateEventManager";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default function NewEventPage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-5 text-slate-950 md:p-8">
            <div className="mx-auto max-w-7xl">
                <CreateEventManager />
            </div>
        </main>
    );
}

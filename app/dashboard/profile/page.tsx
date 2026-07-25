import ProfilePageClient from "@/components/profile/ProfilePageClient";

export const dynamic =
    "force-dynamic";
export const revalidate =
    0;

export default function ProfilePage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-4 text-slate-950 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
                <ProfilePageClient />
            </div>
        </main>
    );
}

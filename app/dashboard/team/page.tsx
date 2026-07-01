import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import TeamMemberForm from "../../../components/forms/TeamMemberForm";
import { requirePermission } from "@/lib/permissions";

export default async function TeamPage() {
    const supabaseServer = await createSupabaseServerClient();
    await requirePermission("can_manage_team");
    const { data: company } = await supabaseServer
        .from("companies")
        .select("*")
        .eq("company_slug", "regigo-demo")
        .maybeSingle();

    const { data: members } = await supabaseServer
        .from("team_members")
        .select("*")
        .eq("company_id", company?.id)
        .order("created_at", { ascending: false });

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-6xl">

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
                    <section className="rounded-[2rem] bg-white p-8 shadow-xl">
                        <h1 className="text-4xl font-black">Team Members</h1>
                        <p className="mt-2 text-slate-600">
                            Manage staff who can help create events, scan QR codes, and view reports.
                        </p>

                        <div className="mt-8 space-y-4">
                            {members && members.length > 0 ? (
                                members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex flex-col gap-4 rounded-2xl bg-[#F7F5FF] p-5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="text-lg font-black">{member.full_name}</p>
                                            <p className="text-sm text-slate-500">{member.email}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#4F46E5]">
                                                {member.role}
                                            </span>
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                                                {member.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl bg-[#F7F5FF] p-8 text-center">
                                    <div className="text-5xl">👥</div>
                                    <h2 className="mt-4 text-2xl font-black">No team members yet</h2>
                                    <p className="mt-2 text-slate-500">
                                        Add staff to help manage events and event-day check-ins.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[2rem] bg-white p-8 shadow-xl">
                        <h2 className="text-2xl font-black">Add Team Member</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Add a staff member and assign their access role.
                        </p>

                        <div className="mt-6">
                            <TeamMemberForm companyId={company?.id || ""} />
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
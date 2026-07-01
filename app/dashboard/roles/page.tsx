import { supabaseServer } from "@/lib/supabase-server";
import RolePermissionsManager from "@/components/forms/RolePermissionsManager";
import { requirePermission } from "@/lib/permissions";

export default async function RolesPage() {
    await requirePermission("can_manage_settings");
    const { data } = await supabaseServer
        .from("role_permissions")
        .select("*")
        .order("role");

    return (

        <div className="mx-auto max-w-7xl">

            <div className="rounded-[2rem] bg-white p-8 shadow-xl">

                <h1 className="text-4xl font-black">
                    Role & Permission Management
                </h1>

                <p className="mt-2 text-slate-500">
                    Control what each role can access.
                </p>

                <div className="mt-8">

                    <RolePermissionsManager
                        roles={data ?? []}
                    />

                </div>

            </div>

        </div>

    );

}
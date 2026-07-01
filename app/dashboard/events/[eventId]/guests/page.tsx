import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { requirePermission } from "@/lib/permissions";

export default async function GuestsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    await requirePermission("can_manage_events");
    const { eventId } = await params;

    const { data: event } = await supabaseServer
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (!event) return <main className="p-8">Event not found.</main>;

    const { data: guests } = await supabaseServer
        .from("registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    const { data: form } = await supabaseServer
        .from("registration_forms")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

    const { data: fields } = await supabaseServer
        .from("registration_fields")
        .select("*")
        .eq("form_id", form?.id)
        .order("sort_order", { ascending: true });

    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-7xl">
                <Link
                    href={`/dashboard/events/${eventId}`}
                    className="font-bold text-[#4F46E5]"
                >
                    ← Back to Event
                </Link>

                <h1 className="mt-6 text-4xl font-black">Guest List</h1>
                <p className="mt-2 text-slate-600">{event.event_name}</p>

                <div className="mt-8 overflow-x-auto rounded-[2rem] bg-white shadow-xl">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                {(fields || []).map((field) => (
                                    <th key={field.id} className="p-4">
                                        {field.field_label}
                                    </th>
                                ))}
                                <th className="p-4">Registered At</th>
                            </tr>
                        </thead>

                        <tbody>
                            {guests?.map((guest) => (
                                <tr key={guest.id} className="border-t border-slate-100">
                                    {(fields || []).map((field) => {
                                        const value =
                                            guest[field.field_key] ||
                                            guest.custom_answers?.[field.field_key] ||
                                            "-";

                                        return (
                                            <td key={field.id} className="p-4">
                                                {value}
                                            </td>
                                        );
                                    })}

                                    <td className="p-4 text-slate-500">
                                        {new Date(guest.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}

                            {(!guests || guests.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={(fields?.length || 0) + 1}
                                        className="p-8 text-center text-slate-500"
                                    >
                                        No guests registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
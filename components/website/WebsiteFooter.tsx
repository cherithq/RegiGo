import Link from "next/link";

export default function WebsiteFooter({ event }: { event: any }) {
    return (
        <footer className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black">{event.event_name}</h2>

                    <p className="mt-2 text-white/70">
                        {event.event_date || "-"} · {event.event_time || "-"}
                    </p>

                    <p className="mt-1 text-white/70">{event.venue || "-"}</p>
                </div>

                {event.registration_open && (
                    <Link
                        href={`/event/${event.event_slug}/register`}
                        className="rounded-2xl bg-white px-6 py-3 text-center font-black text-slate-950"
                    >
                        Register Now
                    </Link>
                )}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6 text-sm text-white/50">
                Powered by RegiGo
            </div>
        </footer>
    );
}
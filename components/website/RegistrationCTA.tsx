import Link from "next/link";

export default function RegistrationCTA({ event }: { event: any }) {
    const isOpen = event.registration_open;

    return (
        <section className="mb-10 rounded-[2rem] bg-white p-8 shadow-xl">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-black">
                        {isOpen ? "Ready to join this event?" : "Registration Closed"}
                    </h2>

                    <p className="mt-2 text-slate-600">
                        {isOpen
                            ? "Complete your registration and receive your QR pass."
                            : "This event is no longer accepting registrations."}
                    </p>
                </div>

                {isOpen ? (
                    <Link
                        href={`/event/${event.event_slug}/register`}
                        className="rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-7 py-4 text-center font-black text-white shadow-lg"
                    >
                        Register Now
                    </Link>
                ) : (
                    <span className="rounded-2xl bg-slate-100 px-7 py-4 text-center font-black text-slate-500">
                        Closed
                    </span>
                )}
            </div>
        </section>
    );
}
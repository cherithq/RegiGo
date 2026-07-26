import { formatClockTime } from "@/lib/format-time";

type AgendaItem = {
    id: string;
    start_time?: string | null;
    end_time?: string | null;
    title?: string | null;
    location?: string | null;
    description?: string | null;
    speakers?: {
        full_name?: string | null;
    } | null;
};

export default function EventAgenda({
    agenda,
}: {
    agenda: AgendaItem[];
}) {

    if (!agenda.length) return null;

    return (

        <section className="mb-12 rounded-[2rem] bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-black">
                Programme
            </h2>

            <div className="mt-8 space-y-6">

                {agenda.map((item) => (

                    <div
                        key={item.id}
                        className="flex gap-6 rounded-2xl bg-[#F7F5FF] p-6"
                    >

                        <div className="min-w-[90px]">

                            <p className="text-lg font-black text-[#4F46E5]">
                                {formatClockTime(item.start_time)}
                                {item.end_time && (
                                    <>
                                        <br />
                                        <span className="text-sm font-bold text-[#4F46E5]/70">
                                            – {formatClockTime(item.end_time)}
                                        </span>
                                    </>
                                )}
                            </p>

                        </div>

                        <div>

                            <h3 className="text-xl font-black">
                                {item.title}
                            </h3>

                            <p className="mt-1 text-slate-500">
                                {item.location}
                            </p>

                            {item.speakers && (

                                <p className="mt-2 font-bold">

                                    Speaker

                                    {" · "}

                                    {item.speakers.full_name}

                                </p>

                            )}

                            <p className="mt-3 text-slate-700">
                                {item.description}
                            </p>

                        </div>

                    </div>

                ))}

            </div>

        </section>

    );

}
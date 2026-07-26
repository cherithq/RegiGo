type Speaker = {
    id: string;
    profile_image?: string | null;
    full_name: string;
    designation?: string | null;
    company?: string | null;
    biography?: string | null;
};

export default function EventSpeakers({
    speakers,
}: {
    speakers: Speaker[];
}) {

    if (!speakers.length) return null;

    return (

        <section className="mb-12 p-1 pt-2 sm:p-2 sm:pt-3">

            <h2 className="mb-8 text-3xl font-black">

                Featured Speakers

            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

                {speakers.map((speaker) => (

                    <div
                        key={speaker.id}
                        className="mx-auto w-full max-w-xs overflow-hidden rounded-[2rem] bg-white shadow-xl"
                    >

                        <div className="relative">

                            {speaker.profile_image ? (

                                <img
                                    src={speaker.profile_image}
                                    alt={speaker.full_name}
                                    className="aspect-square w-full object-cover object-top"
                                />

                            ) : (

                                <div className="flex aspect-square items-center justify-center bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-6xl font-black text-white">

                                    {speaker.full_name.charAt(0)}

                                </div>

                            )}

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-10">

                                <h3 className="text-xl font-black text-white">

                                    {speaker.full_name}

                                </h3>

                            </div>

                        </div>

                        <div className="p-5">

                            <p className="text-slate-500">

                                {speaker.designation}

                            </p>

                            <p className="text-slate-500">

                                {speaker.company}

                            </p>

                            <p className="mt-4 text-sm leading-6 text-slate-700">

                                {speaker.biography}

                            </p>

                        </div>

                    </div>

                ))}

            </div>

        </section>

    );

}
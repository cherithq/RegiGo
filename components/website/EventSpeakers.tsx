export default function EventSpeakers({
    speakers,
}: {
    speakers: any[];
}) {

    if (!speakers.length) return null;

    return (

        <section className="mb-12">

            <h2 className="mb-8 text-3xl font-black">

                Featured Speakers

            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {speakers.map((speaker) => (

                    <div
                        key={speaker.id}
                        className="rounded-[2rem] bg-white p-6 shadow-xl"
                    >

                        {speaker.profile_image ? (

                            <img
                                src={speaker.profile_image}
                                alt={speaker.full_name}
                                className="h-56 w-full rounded-2xl object-cover"
                            />

                        ) : (

                            <div className="flex h-56 items-center justify-center rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-6xl font-black text-white">

                                {speaker.full_name.charAt(0)}

                            </div>

                        )}

                        <h3 className="mt-5 text-2xl font-black">

                            {speaker.full_name}

                        </h3>

                        <p className="mt-2 text-slate-500">

                            {speaker.designation}

                        </p>

                        <p className="text-slate-500">

                            {speaker.company}

                        </p>

                        <p className="mt-5 text-sm leading-7 text-slate-700">

                            {speaker.biography}

                        </p>

                    </div>

                ))}

            </div>

        </section>

    );

}
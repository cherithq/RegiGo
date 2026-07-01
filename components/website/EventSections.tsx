export default function EventSections({
    sections,
}: {
    sections: any[];
}) {
    if (!sections.length) return null;

    return (
        <section className="mb-12 space-y-8">

            {sections.map((section) => (
                <div
                    key={section.id}
                    className="rounded-[2rem] bg-white p-8 shadow-xl"
                >
                    <h2 className="text-3xl font-black">
                        {section.title}
                    </h2>

                    <div className="mt-5 whitespace-pre-wrap leading-8 text-slate-700">
                        {section.content}
                    </div>
                </div>
            ))}

        </section>
    );
}
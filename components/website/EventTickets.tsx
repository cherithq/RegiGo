export default function EventTickets({
    tickets,
}: {
    tickets: any[];
}) {

    if (!tickets.length) return null;

    return (

        <section className="mb-12 rounded-[2rem] bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-black">

                Ticket Types

            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {tickets.map((ticket) => (

                    <div
                        key={ticket.id}
                        className="rounded-2xl border p-6"
                    >

                        <span
                            className="inline-flex rounded-full px-4 py-1 text-sm font-black text-white"
                            style={{
                                backgroundColor: ticket.colour,
                            }}
                        >
                            {ticket.ticket_name}
                        </span>

                        <p className="mt-5 text-slate-600">

                            {ticket.description}

                        </p>

                        <div className="mt-5 rounded-xl bg-[#F7F5FF] p-4">

                            Capacity

                            <span className="float-right font-black">

                                {ticket.capacity}

                            </span>

                        </div>

                    </div>

                ))}

            </div>

        </section>

    );

}
import EventForm from "@/components/forms/EventForm";

export default function NewEventPage() {
    return (
        <main className="min-h-screen bg-[#F7F5FF] p-8 text-slate-950">
            <div className="mx-auto max-w-3xl">
                <h1 className="text-4xl font-black">Create New Event</h1>
                <p className="mt-2 text-slate-600">
                    Fill in your event details to generate your RegiGo event page.
                </p>

                <div className="mt-8 rounded-[2rem] bg-white p-8 shadow-xl">
                    <EventForm />
                </div>
            </div>
        </main>
    );
}
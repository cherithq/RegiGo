import EventConfigurationManager from "@/components/forms/EventConfigurationManager";

export default function EventSettingsForm({
    event,
}: {
    event: {
        id: string;
    };
}) {
    return (
        <EventConfigurationManager
            eventId={event.id}
        />
    );
}

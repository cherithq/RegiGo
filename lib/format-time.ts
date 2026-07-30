export function formatClockTime(
    value: string | null | undefined,
) {
    if (!value) return "";

    const match = value.match(
        /^(\d{1,2}):(\d{2})/,
    );

    if (!match) return value;

    const hours = Number(match[1]);
    const minutes = match[2];

    if (
        !Number.isFinite(hours) ||
        hours < 0 ||
        hours > 23
    ) {
        return value;
    }

    const period =
        hours >= 12 ? "PM" : "AM";
    const twelveHour =
        hours % 12 === 0
            ? 12
            : hours % 12;

    return `${twelveHour}:${minutes} ${period}`;
}

export function formatDisplayDate(
    value: string | null | undefined,
) {
    if (!value) return "";

    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})/,
    );

    if (!match) return value;

    const [, year, month, day] = match;

    return `${day}-${month}-${year}`;
}

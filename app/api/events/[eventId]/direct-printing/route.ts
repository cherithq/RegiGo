import {
    NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

function response(
    eventId: string,
) {
    return NextResponse.json(
        {
            error:
                "Legacy direct printing has been replaced by browser printing.",
            redirectTo:
                `/dashboard/events/${eventId}/check-in-printing`,
        },
        {
            status: 410,
            headers: {
                "Cache-Control":
                    "no-store",
            },
        },
    );
}

export async function GET(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    const { eventId } =
        await params;

    return response(eventId);
}

export async function POST(
    _request: Request,
    {
        params,
    }: {
        params: Promise<{
            eventId: string;
        }>;
    },
) {
    const { eventId } =
        await params;

    return response(eventId);
}

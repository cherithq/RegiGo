import {
    NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic =
    "force-dynamic";
export const revalidate = 0;

function moved() {
    return NextResponse.json(
        {
            success: false,
            moved: true,
            redirectTo:
                "/dashboard/users",
            error:
                "Team Access has moved to Users & Permissions so company users, invitations, roles and event assignments use one source of truth.",
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

export async function GET() {
    return moved();
}

export async function POST() {
    return moved();
}

export async function PATCH() {
    return moved();
}

export async function DELETE() {
    return moved();
}

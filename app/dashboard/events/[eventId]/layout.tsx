import { requireEventCompanyAccess } from "@/lib/company-access";

export const dynamic = "force-dynamic";

export default async function EventCompanyGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    await requireEventCompanyAccess(eventId);

    return children;
}

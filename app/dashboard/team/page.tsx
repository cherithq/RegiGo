import {
    redirect,
} from "next/navigation";

export const dynamic =
    "force-dynamic";
export const revalidate = 0;

export default function TeamAccessPage() {
    // Team Access and Users & Permissions previously used separate APIs and
    // could disagree about company membership. They now share one page.
    redirect(
        "/dashboard/users",
    );
}

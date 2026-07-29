import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

// Shared section wrapper (eyebrow badge + title + description + grid) used
// by the event overview page's module cards, and mirrored by the event
// creation and event settings pages' module pickers so all three surfaces
// group and label modules identically.
export default function WorkspaceSection({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5FF] px-4 py-2 text-sm font-black text-[#4F46E5]">
                    <Sparkles size={16} />
                    {eyebrow}
                </div>
                <h2 className="mt-4 text-2xl font-black">
                    {title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {children}
            </div>
        </section>
    );
}

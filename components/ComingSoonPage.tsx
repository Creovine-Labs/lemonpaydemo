"use client";

import { PageHeader } from "@/components/PageHeader";

interface ComingSoonPageProps {
  subtitle: string;
  title: string;
  body: string;
  /** When set, renders a back arrow in the header. */
  back?: string;
}

/**
 * Generic placeholder for screens that exist in the spec but get built in
 * later phases. Keeps the routes resolvable so nav and links don't 404.
 */
export function ComingSoonPage({ subtitle, title, body, back }: ComingSoonPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader subtitle={subtitle} title={title} back={back} />

      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
        <div className="max-w-md space-y-2 px-6 py-12 text-center">
          <p className="text-sm text-neutral-600">{body}</p>
          <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}

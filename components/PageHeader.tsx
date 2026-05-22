"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  subtitle?: string;
  title: string;
  /** When set, renders a back arrow that links to this href. */
  back?: string;
  /** Right-aligned content — buttons, badges, etc. */
  actions?: ReactNode;
}

/**
 * Page-level header rendered inside each route's main content area. Sits
 * above the page body, separate from the sidebar / mobile header chrome.
 */
export function PageHeader({ subtitle, title, back, actions }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-5">
      <div className="flex items-center gap-3">
        {back && (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div>
          {subtitle && (
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
              {subtitle}
            </p>
          )}
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {title}
          </h1>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

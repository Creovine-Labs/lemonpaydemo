"use client";

import { LiraWidget } from "@/components/LiraWidget";
import { PageHeader } from "@/components/PageHeader";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader subtitle="Help" title="Chat with Lira" />
      <LiraWidget />
    </div>
  );
}

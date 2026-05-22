"use client";

import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function HelpPage() {
  return (
    <ComingSoonPage
      subtitle="Help"
      title="Lira chat"
      body="The Lira chat widget anchors here. It's a separate Preact bundle that ships independently of this app and gets embedded via a script tag."
    />
  );
}

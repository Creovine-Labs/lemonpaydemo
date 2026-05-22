"use client";

import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function SecuritySettingsPage() {
  return (
    <ComingSoonPage
      subtitle="Settings"
      title="Security"
      body="Password, MFA, and active sessions aren't part of the demo scope."
      back="/app/settings"
    />
  );
}

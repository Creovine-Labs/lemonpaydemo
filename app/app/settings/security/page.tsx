"use client";

import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function SecuritySettingsPage() {
  return (
    <ComingSoonPage
      subtitle="Settings"
      title="Security"
      body="Password, MFA, and active sessions ship in a later phase."
      back="/app/settings"
    />
  );
}

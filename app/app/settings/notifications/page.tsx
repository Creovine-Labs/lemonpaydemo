"use client";

import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function NotificationsSettingsPage() {
  return (
    <ComingSoonPage
      subtitle="Settings"
      title="Notifications"
      body="Push, SMS, and email preferences aren't part of the demo scope."
      back="/app/settings"
    />
  );
}

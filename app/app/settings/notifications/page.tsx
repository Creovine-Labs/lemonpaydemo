"use client";

import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function NotificationsSettingsPage() {
  return (
    <ComingSoonPage
      subtitle="Settings"
      title="Notifications"
      body="Push, SMS, and email preferences are out of scope for the demo build."
      back="/app/settings"
    />
  );
}

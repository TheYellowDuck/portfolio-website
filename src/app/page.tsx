// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import SiteShell from "@/components/SiteShell";
import { currentRole } from "@/data/projects";
import transcript from "@/data/transcript.generated.json";

// The hero's "Currently:" line — the live role if employed (from the experience data), otherwise the
// current academic term (from the parsed transcript). Computed here on the server so the 16KB
// transcript never ships to the client; passed down as one string. Nothing hardcoded.
function heroStatus(): string {
  const role = currentRole();
  if (role?.title && role.subtitle) return `${role.subtitle} @ ${role.title}`;
  const t = transcript as { currentLevel?: string; currentTerm?: string };
  return [t.currentLevel, t.currentTerm].filter(Boolean).join(" · ");
}

export default function Home() {
  return <SiteShell currentStatus={heroStatus()} />;
}

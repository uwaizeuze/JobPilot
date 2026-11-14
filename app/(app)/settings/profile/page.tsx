"use client";

import { PageShell } from "@/components/layout/page-shell";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileSettingsPage() {
  return (
    <PageShell
      title="Profile Settings"
      description="Manage your verified professional profile, skills, work preferences, and appearance."
    >
      <div className="space-y-8 max-w-4xl">
        {/* Appearance Section */}
        <section className="space-y-4">
          <div className="border-b border-border/70 pb-3">
            <h2 className="text-base font-semibold text-foreground">Appearance & Theme</h2>
            <p className="text-xs text-muted-foreground">
              Select Light, Dark, or System mode. Stored in your browser and applied before first paint.
            </p>
          </div>
          <Card className="border-border/60">
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">Color Scheme</p>
                <p className="text-[11px] text-muted-foreground">
                  Choose your interface theme preference.
                </p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>
        </section>

        {/* Verified Professional Profile Section */}
        <section className="space-y-4">
          <div className="border-b border-border/70 pb-3">
            <h2 className="text-base font-semibold text-foreground">Verified Professional Profile</h2>
            <p className="text-xs text-muted-foreground">
              Your master profile grounds all AI operations. JobPilot will never invent qualifications or infer unverified claims.
            </p>
          </div>
          <ProfileEditor />
        </section>
      </div>
    </PageShell>
  );
}

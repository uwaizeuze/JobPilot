import { PageShell } from "@/components/layout/page-shell";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function ProfileSettingsPage() {
  return (
    <PageShell
      title="Profile settings"
      description="Manage your verified professional profile, skills, work preferences, and appearance."
    >
      <section className="space-y-3 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Light, Dark, or System. The choice is stored in this browser and
          applied before first paint.
        </p>
        <ThemeToggle />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Verified Professional Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your master profile grounds all AI operations. JobPilot will never invent
          qualifications or infer unverified claims.
        </p>
        <ProfileEditor />
      </section>
    </PageShell>
  );
}

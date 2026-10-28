import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  return (
    <PageShell
      title="Onboarding"
      description="Profile wizard UI only. Nothing is saved."
    >
      <form className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" name="headline" disabled placeholder="Phase 2+" />
        </div>
        <Button type="button" disabled>
          Continue (unavailable)
        </Button>
      </form>
    </PageShell>
  );
}

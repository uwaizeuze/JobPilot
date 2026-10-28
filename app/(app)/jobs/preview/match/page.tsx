import { PageShell } from "@/components/layout/page-shell";
import { ContrastChartPreview } from "@/components/ui/token-preview";

export default function MatchPage() {
  return (
    <PageShell
      title="Match analysis"
      description="Explainable scoring is Phase 5. Bars below check theme contrast only."
    >
      <ContrastChartPreview />
    </PageShell>
  );
}

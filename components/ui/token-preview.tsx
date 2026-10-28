import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatusTokenPreview() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="muted">Muted</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}

export function ContrastChartPreview() {
  const bars = [
    { label: "Match", value: 72, color: "bg-primary" },
    { label: "Skills", value: 64, color: "bg-success" },
    { label: "Risk", value: 28, color: "bg-warning" },
    { label: "Failed", value: 12, color: "bg-destructive" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Theme contrast sample</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Demonstration bars for token contrast only. Not live analytics.
        </p>
        {bars.map((bar) => (
          <div key={bar.label} className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{bar.label}</span>
              <span>{bar.value}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${bar.color}`}
                style={{ width: `${bar.value}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

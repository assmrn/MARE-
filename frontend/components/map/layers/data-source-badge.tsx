import { Radio, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DataSourceBadge({ live, label }: { live: boolean; label: string }) {
  return (
    <Badge variant={live ? "success" : "outline"} className="gap-1 bg-surface/90 backdrop-blur">
      {live ? <Radio className="size-3" /> : <FlaskConical className="size-3" />}
      {label} · {live ? "Live" : "Simulated"}
    </Badge>
  );
}

import { useMemo, useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/hooks/useMissionData";
import type { AlertItem, Severity } from "@/types/mission";

const SEVERITY_STYLES: Record<Severity, "destructive" | "warning" | "primary" | "success"> = {
  critical: "destructive",
  warning: "warning",
  info: "primary",
  resolved: "success",
};

const FILTERS: ("all" | Severity)[] = ["all", "critical", "warning", "info", "resolved"];

export function AlertsPanel({ compact = false }: { compact?: boolean }) {
  const { data: alerts, isLoading } = useAlerts();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let rows = alerts ?? [];
    if (filter !== "all") rows = rows.filter((a) => a.severity === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((a) => a.description.toLowerCase().includes(q) || a.source.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) =>
      sortDesc
        ? new Date(b.timestampISO).getTime() - new Date(a.timestampISO).getTime()
        : new Date(a.timestampISO).getTime() - new Date(b.timestampISO).getTime()
    );
    return compact ? rows.slice(0, 5) : rows;
  }, [alerts, filter, query, sortDesc, compact]);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Mission Alerts</CardTitle>
          <CardDescription>{alerts?.length ?? 0} total events this session</CardDescription>
        </div>
        {!compact && (
          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <div className="relative w-full max-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search alerts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="capitalize">
                  {filter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {FILTERS.map((f) => (
                  <DropdownMenuItem key={f} onSelect={() => setFilter(f)} className="capitalize">
                    {f}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>
      <CardContent className={compact ? "px-0" : undefined}>
        {isLoading ? (
          <div className="space-y-2 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">
                  <button className="flex items-center gap-1" onClick={() => setSortDesc((v) => !v)}>
                    Time <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead>Description</TableHead>
                {!compact && <TableHead className="w-24">Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((alert: AlertItem) => (
                <TableRow key={alert.id}>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {new Date(alert.timestampISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={SEVERITY_STYLES[alert.severity]} dot className="capitalize">
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{alert.source}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{alert.description}</TableCell>
                  {!compact && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {alert.status}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    No alerts match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


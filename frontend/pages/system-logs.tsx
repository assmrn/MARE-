import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLogs } from "@/hooks/useMissionData";
import type { LogEntry } from "@/types/mission";

const LEVEL_STYLES: Record<LogEntry["level"], "destructive" | "warning" | "primary" | "outline"> = {
  error: "destructive",
  warning: "warning",
  info: "primary",
  debug: "outline",
};

const LEVELS: ("all" | LogEntry["level"])[] = ["all", "error", "warning", "info", "debug"];

export default function SystemLogsPage() {
  const { data: logs, isLoading } = useLogs();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | LogEntry["level"]>("all");

  const filtered = useMemo(() => {
    let rows = logs ?? [];
    if (level !== "all") rows = rows.filter((l) => l.level === level);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((l) => l.message.toLowerCase().includes(q) || l.component.toLowerCase().includes(q));
    }
    return rows;
  }, [logs, level, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">System Logs</h1>
        <p className="text-xs text-muted-foreground">Flight controller, AI reasoning engine, and subsystem event log</p>
      </div>

      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle>Event Log</CardTitle>
            <CardDescription>{filtered.length} entries</CardDescription>
          </div>
          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <div className="relative w-full max-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search logs…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="capitalize">
                  {level}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LEVELS.map((l) => (
                  <DropdownMenuItem key={l} onSelect={() => setLevel(l)} className="capitalize">
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 font-mono">
                  <span className="mt-0.5 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {new Date(log.timestampISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <Badge variant={LEVEL_STYLES[log.level]} className="mt-0.5 shrink-0 uppercase">
                    {log.level}
                  </Badge>
                  <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-foreground">{log.component}</span>
                  <span className="text-[11px] text-muted-foreground">{log.message}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">No log entries match your filters.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

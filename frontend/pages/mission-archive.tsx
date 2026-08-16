import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchivedMissions } from "@/hooks/useMissionData";
import { formatDuration } from "@/lib/utils";

const OUTCOME_STYLES: Record<string, "success" | "destructive" | "warning"> = {
  completed: "success",
  aborted: "destructive",
  "anomaly-recovered": "warning",
};

export default function MissionArchivePage() {
  const { data: missions, isLoading } = useArchivedMissions();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Mission Archive</h1>
        <p className="text-xs text-muted-foreground">Completed and historical mission records</p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Past Missions</CardTitle>
            <CardDescription>{missions?.length ?? 0} records</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mission</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Anomalies</TableHead>
                  <TableHead>Pilot</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missions?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="text-xs font-medium">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.id}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.dateISO).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{formatDuration(m.durationSeconds)}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{m.distanceKm.toFixed(1)} km</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{m.anomalyCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.pilot}</TableCell>
                    <TableCell>
                      <Badge variant={OUTCOME_STYLES[m.outcome]} className="capitalize">
                        {m.outcome.replace("-", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

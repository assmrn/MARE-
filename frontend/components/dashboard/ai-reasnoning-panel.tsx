import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Sparkles, AlertTriangle, CheckCircle2, Activity, Clock, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAnomalies } from "@/hooks/useMissionData";
import { getReasoning } from "@/services/api";
import type { AnomalyEvent, ReasoningReport, RiskLevel } from "@/types/mission";

const RISK_STYLES: Record<RiskLevel, { badge: "success" | "warning" | "destructive"; label: string }> = {
  low: { badge: "success", label: "Low Risk" },
  moderate: { badge: "warning", label: "Moderate Risk" },
  elevated: { badge: "warning", label: "Elevated Risk" },
  critical: { badge: "destructive", label: "Critical Risk" },
};

function ConfidenceRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 16;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 90 ? "#10B981" : value >= 70 ? "#2563EB" : "#F59E0B";
  return (
    <div className="relative flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="size-11 -rotate-90">
        <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: AnomalyEvent }) {
  const [open, setOpen] = useState(anomaly.status === "active" || anomaly.status === "monitoring");
  const risk = RISK_STYLES[anomaly.riskLevel];
  const isResolved = anomaly.status === "resolved";

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        aria-expanded={open}
      >
        <ConfidenceRing value={anomaly.confidencePct} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={risk.badge} dot>
              {risk.label}
            </Badge>
            <Badge variant={isResolved ? "success" : "outline"}>
              {isResolved ? "Resolved" : anomaly.status === "monitoring" ? "Monitoring" : "Active"}
            </Badge>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {new Date(anomaly.timestampISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-foreground">{anomaly.scenario}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{anomaly.affectedSubsystem}</p>
        </div>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="animate-slide-up space-y-3 border-t border-border px-3 pb-3 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Root Cause</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{anomaly.rootCause}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recommended Action</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{anomaly.recommendedAction}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Suggested Mitigation</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{anomaly.suggestedMitigation}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Activity className="size-3.5" />
              Reasoning Chain
            </p>
            <ol className="space-y-2.5">
              {anomaly.reasoningChain.map((step, i) => (
                <li key={step.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-muted text-[10px] font-semibold text-primary">
                      {step.order}
                    </span>
                    {i < anomaly.reasoningChain.length - 1 && <span className="mt-0.5 w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{step.label}</p>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{step.confidencePct}%</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveReasoningCard({ report }: { report: ReasoningReport }) {
  const risk = RISK_STYLES[report.risk_level];

  return (
    <div className="animate-slide-up rounded-lg border border-primary/40 bg-primary-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="primary" dot>
          Live Gemini Diagnostic
        </Badge>
        <Badge variant={risk.badge}>{risk.label}</Badge>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          {new Date(report.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] font-medium leading-snug text-foreground">{report.scenario}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {report.affected_subsystem} &middot; {report.confidence_pct}% confidence
      </p>

      <Separator className="my-3" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Root Cause</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{report.root_cause}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recommended Action</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{report.recommended_action}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Suggested Mitigation</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{report.suggested_mitigation}</p>
        </div>
      </div>

      {report.reasoning_chain?.length > 0 && (
        <>
          <Separator className="my-3" />
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Activity className="size-3.5" />
            Reasoning Chain
          </p>
          <ol className="space-y-2.5">
            {report.reasoning_chain.map((step, i) => (
              <li key={step.step} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-muted text-[10px] font-semibold text-primary">
                    {step.step}
                  </span>
                  {i < report.reasoning_chain.length - 1 && <span className="mt-0.5 w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">{step.label}</p>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{step.confidence_pct}%</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export function AiReasoningPanel() {
  const { data: anomalies, isLoading } = useAnomalies();
  const activeCount = anomalies?.filter((a) => a.status !== "resolved").length ?? 0;

  const [report, setReport] = useState<ReasoningReport | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const result = await getReasoning();
      setReport(result);
      toast.success("AI diagnostic complete", { description: result.scenario });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error contacting the reasoning engine";
      setRunError(message);
      toast.error("AI diagnostic failed", { description: message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            AI Reasoning Engine
          </CardTitle>
          <CardDescription>Autonomous anomaly detection & root-cause diagnostics</CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          {activeCount > 0 ? (
            <Badge variant="warning" dot>
              {activeCount} active
            </Badge>
          ) : (
            <Badge variant="success" dot>
              <CheckCircle2 className="size-3" />
              All clear
            </Badge>
          )}
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={runDiagnostic} disabled={running}>
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {running ? "Analyzing…" : "Run AI Diagnostic"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2.5">
        {runError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive-muted/40 p-2.5 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>Couldn't reach the reasoning engine: {runError}</span>
          </div>
        )}
        {report && <LiveReasoningCard report={report} />}

        {isLoading && (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        )}
        {anomalies?.length === 0 && !isLoading && !report && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <AlertTriangle className="size-6" />
            <p className="text-xs">No anomalies detected this session.</p>
          </div>
        )}
        {anomalies?.map((a) => (
          <AnomalyCard key={a.id} anomaly={a} />
        ))}
      </CardContent>
    </Card>
  );
}

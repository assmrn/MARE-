import { KeyRound } from "lucide-react";

export function ProviderRequiredNote({ envVar, provider }: { envVar: string; provider: string }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex max-w-[260px] items-start gap-2 rounded-lg border border-border bg-popover/95 px-3 py-2 text-[11px] text-muted-foreground shadow-elevated backdrop-blur">
      <KeyRound className="mt-0.5 size-3.5 shrink-0 text-warning" />
      <span>
        Connect <span className="font-medium text-foreground">{provider}</span> by setting{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{envVar}</code> to enable this layer.
      </span>
    </div>
  );
}

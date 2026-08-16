import { toast } from "sonner";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCertifications } from "@/hooks/useMissionData";
import type { Certification } from "@/types/mission";

const STATUS_STYLES: Record<Certification["status"], "success" | "warning" | "destructive"> = {
  valid: "success",
  "expiring-soon": "warning",
  expired: "destructive",
};

const STATUS_LABEL: Record<Certification["status"], string> = {
  valid: "Valid",
  "expiring-soon": "Expiring Soon",
  expired: "Expired",
};

export function CertificationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: certifications, isLoading } = useCertifications();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Certifications
          </DialogTitle>
          <DialogDescription>FAA / DGCA licenses and training certificates on file</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2.5 overflow-y-auto">
          {isLoading || !certifications
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
            : certifications.map((cert) => (
                <div key={cert.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{cert.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {cert.authority} &middot; {cert.type}
                      </p>
                    </div>
                    <Badge variant={STATUS_STYLES[cert.status]} dot className="shrink-0">
                      {STATUS_LABEL[cert.status]}
                    </Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <span>Issued {new Date(cert.issuedISO).toLocaleDateString()}</span>
                    <span>Expires {new Date(cert.expiresISO).toLocaleDateString()}</span>
                    <span className="col-span-2">Issued by {cert.issuedBy}</span>
                  </div>

                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-[11px]"
                      onClick={() => toast.success(`Downloading ${cert.name}…`, { description: "PDF export will save to your downloads folder." })}
                    >
                      <Download className="size-3" />
                      Download
                    </Button>
                    {cert.status !== "valid" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-1.5 text-[11px]"
                        onClick={() => toast.success(`Renewal request submitted for ${cert.name}`)}
                      >
                        <RefreshCw className="size-3" />
                        Renew
                      </Button>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

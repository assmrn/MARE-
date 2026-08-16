import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  Plug,
  ShieldAlert,
  ShieldOff,
  ArrowUpCircle,
  ArrowDownCircle,
  Home,
  PauseCircle,
  OctagonX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLiveTelemetry } from "@/hooks/useMissionData";
import {
  armDrone,
  connectDrone,
  disarmDrone,
  emergencyStopDrone,
  holdDrone,
  landDrone,
  returnToLaunch,
  takeoffDrone,
} from "@/services/api";
import type { CommandResponse } from "@/types/mission";

type Command = "CONNECT" | "ARM" | "DISARM" | "TAKEOFF" | "LAND" | "RTL" | "HOLD" | "EMERGENCY_STOP";

// Maps each UI command to the matching FastAPI call from services/api.ts.
// TAKEOFF is called separately below since it needs an operator-chosen altitude.
const COMMAND_FN: Partial<Record<Command, () => Promise<CommandResponse>>> = {
  CONNECT: connectDrone,
  ARM: armDrone,
  DISARM: disarmDrone,
  LAND: landDrone,
  RTL: returnToLaunch,
  HOLD: holdDrone,
  EMERGENCY_STOP: emergencyStopDrone,
};

/** Real FastAPI error body is { detail: "..." } (see app.py's HTTPException usage). */
function describeCommandError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 503) return "PX4 is not connected — start PX4 SITL and Gazebo first.";
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.code === "ECONNABORTED") return "Request timed out reaching the MARE backend.";
    if (!err.response) return "Could not reach the MARE backend — is it running?";
  }
  return err instanceof Error ? err.message : "Unknown error contacting the flight controller";
}

const CONTROLS: {
  command: Command;
  label: string;
  icon: typeof ShieldAlert;
  variant: "default" | "secondary" | "destructive" | "outline";
  requiresConfirm: boolean;
  description: string;
}[] = [
  { command: "CONNECT", label: "Connect", icon: Plug, variant: "outline", requiresConfirm: false, description: "Establishes the MAVLink connection to the PX4 simulator." },
  { command: "ARM", label: "Arm", icon: ShieldAlert, variant: "secondary", requiresConfirm: true, description: "Arms motors. UAV will be flight-ready and props will spin at idle." },
  { command: "DISARM", label: "Disarm", icon: ShieldOff, variant: "outline", requiresConfirm: true, description: "Disarms motors immediately. Only use when landed." },
  { command: "TAKEOFF", label: "Takeoff", icon: ArrowUpCircle, variant: "default", requiresConfirm: true, description: "Commands autonomous takeoff to mission altitude." },
  { command: "LAND", label: "Land", icon: ArrowDownCircle, variant: "secondary", requiresConfirm: true, description: "Begins controlled descent and lands at current position." },
  { command: "RTL", label: "Return to Launch", icon: Home, variant: "secondary", requiresConfirm: true, description: "Aborts mission and returns autonomously to the launch point." },
  { command: "HOLD", label: "Hold", icon: PauseCircle, variant: "outline", requiresConfirm: false, description: "Holds current position and altitude." },
  { command: "EMERGENCY_STOP", label: "Emergency Stop", icon: OctagonX, variant: "destructive", requiresConfirm: true, description: "Immediately cuts all motor output. Use only in a genuine emergency — the UAV will fall." },
];

export function FlightControls() {
  const { telemetry, connected, backendError } = useLiveTelemetry();
  const [pending, setPending] = useState<Command | null>(null);
  const [sending, setSending] = useState<Command | null>(null);
  const [takeoffAltitude, setTakeoffAltitude] = useState("10");

  const runCommand = async (command: Command) => {
    setSending(command);
    try {
      const res =
        command === "TAKEOFF"
          ? await takeoffDrone(Number(takeoffAltitude) || 10)
          : await COMMAND_FN[command]!();
      toast[command === "EMERGENCY_STOP" ? "error" : "success"](`${res.action} acknowledged`, {
        description: `Backend reported status: ${res.status}`,
      });
    } catch (err) {
      // Network failure, backend 4xx/5xx, or PX4 not connected all land here.
      toast.error(`${command.replace("_", " ")} failed`, { description: describeCommandError(err) });
    } finally {
      setSending(null);
      setPending(null);
    }
  };

  const armed = telemetry?.armed ?? false;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Flight Controls</CardTitle>
          <CardDescription>Operator command console</CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={backendError ? "destructive" : connected ? "success" : "destructive"} dot>
            {backendError ? "Backend Unreachable" : connected ? "PX4 Connected" : "PX4 Offline"}
          </Badge>
          <Badge variant={armed ? "warning" : "outline"} dot>
            {armed ? "Armed" : "Disarmed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {CONTROLS.map(({ command, label, icon: Icon, variant, requiresConfirm, description }) => {
            const isDisabled = (command === "ARM" && armed) || (command === "DISARM" && !armed);

            if (!requiresConfirm) {
              return (
                <Button
                  key={command}
                  variant={variant}
                  className="h-auto flex-col gap-1.5 py-3"
                  disabled={isDisabled || sending === command}
                  onClick={() => runCommand(command)}
                >
                  <Icon className="size-4" />
                  <span className="text-xs">{sending === command ? "Sending…" : label}</span>
                </Button>
              );
            }

            return (
              <Dialog key={command} open={pending === command} onOpenChange={(v) => !v && setPending(null)}>
                <Button
                  variant={variant}
                  className="h-auto flex-col gap-1.5 py-3"
                  disabled={isDisabled}
                  onClick={() => setPending(command)}
                >
                  <Icon className="size-4" />
                  <span className="text-xs">{label}</span>
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {command === "EMERGENCY_STOP" && <OctagonX className="size-4 text-destructive" />}
                      Confirm {label}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                  </DialogHeader>
                  {command === "TAKEOFF" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Target Altitude (m)</label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={takeoffAltitude}
                        onChange={(e) => setTakeoffAltitude(e.target.value)}
                      />
                    </div>
                  )}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant={command === "EMERGENCY_STOP" ? "destructive" : "default"}
                      onClick={() => runCommand(command)}
                    >
                      Confirm {label}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

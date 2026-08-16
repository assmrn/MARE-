import { Bell, ChevronDown, Menu, Radio, Satellite, BatteryMedium } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "./theme-switcher";
import { LiveClock } from "./live-clock";
import { MobileNav } from "./mobile-nav";
import { OperatorProfileDialog } from "./operator-profile-dialog";
import { CertificationsDialog } from "./certifications-dialog";
import { SignOutDialog } from "./sign-out-dialog";
import { useMissionStatus, useLiveTelemetry } from "@/hooks/useMissionData";
import { useMissionStore } from "@/store/missionStore";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { data: mission } = useMissionStatus();
  const { telemetry, connected, mode, backendError } = useLiveTelemetry();
  const missionSyncStatus = useMissionStore((s) => s.status);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [certsOpen, setCertsOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const gpsHasFix = Boolean(telemetry && telemetry.gps.satellites > 0);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
        <Menu />
      </Button>
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex items-center gap-2 min-w-0">
        <span className="hidden sm:inline text-sm font-semibold tracking-tight truncate">
          {mission?.missionName ?? "MARE Mission Console"}
        </span>
        <Badge variant="outline" dot className="hidden sm:inline-flex capitalize">
          {missionSyncStatus.toLowerCase().replace("_", " ")}
        </Badge>
      </div>

      <Separator orientation="vertical" className="hidden md:block h-6" />

      <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Radio className={cn("size-3.5", backendError ? "text-destructive" : connected ? "text-success" : "text-warning")} />
          {backendError ? "Backend unreachable" : connected ? `PX4 connected (${mode})` : "PX4 offline"}
        </span>
        <span className="flex items-center gap-1.5">
          <Satellite className={cn("size-3.5", gpsHasFix ? "text-primary" : "text-muted-foreground")} />
          GPS {telemetry ? `${telemetry.gps.satellites} sats${gpsHasFix ? "" : " · no fix"}` : "—"}
        </span>
        <span className="flex items-center gap-1.5">
          <BatteryMedium className="size-3.5 text-success" />
          {telemetry ? `${telemetry.battery.percentage.toFixed(0)}%` : "—"}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <LiveClock />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="text-xs font-medium text-warning">Motor RR vibration elevated</span>
              <span className="text-[11px] text-muted-foreground">4 min ago · AI Reasoning Engine</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="text-xs font-medium">Waypoint 3 reached</span>
              <span className="text-[11px] text-muted-foreground">12 min ago · Mission Planner</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="text-xs font-medium">GPS HDOP spike auto-resolved</span>
              <span className="text-[11px] text-muted-foreground">22 min ago · Navigation</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-muted text-[11px] font-semibold text-primary">
                RO
              </span>
              <span className="hidden md:inline text-xs font-medium">R. Okafor</span>
              <ChevronDown className="hidden md:inline size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Signed in as R. Okafor</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setProfileOpen(true)}>Operator Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCertsOpen(true)}>Certifications</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSignOutOpen(true)} className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <OperatorProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <CertificationsDialog open={certsOpen} onOpenChange={setCertsOpen} />
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </header>
  );
}

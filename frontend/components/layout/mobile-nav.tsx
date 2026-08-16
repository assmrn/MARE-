import {
  LayoutDashboard,
  Route,
  Activity,
  Video,
  Sparkles,
  ScrollText,
  Settings,
  CloudSun,
  Archive,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/planner", label: "Mission Planner", icon: Route },
  { to: "/telemetry", label: "Telemetry", icon: Activity },
  { to: "/cameras", label: "Camera Streams", icon: Video },
  { to: "/copilot", label: "AI Copilot", icon: Sparkles },
  { to: "/logs", label: "System Logs", icon: ScrollText },
  { to: "/weather", label: "Weather", icon: CloudSun },
  { to: "/archive", label: "Mission Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-full max-w-[280px] -translate-x-0 -translate-y-0 rounded-none border-r border-l-0 border-y-0 data-[state=open]:slide-in-from-left">
        <DialogHeader>
          <DialogTitle className="text-sm">MARE Navigation</DialogTitle>
        </DialogHeader>
        <nav className="flex flex-col gap-0.5" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary-muted text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}

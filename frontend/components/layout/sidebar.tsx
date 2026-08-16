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
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { NavLink } from "react-router-dom";
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

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" className="size-4">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">MARE</p>
          <p className="text-[10px] text-muted-foreground">Mission Ops Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary-muted text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2.5 border-t border-border px-3 py-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            Mission Safety
          </span>
          <span className="font-medium text-success">Nominal</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Wifi className="size-3.5 text-primary" />
            Connection
          </span>
          <span className="font-medium text-foreground">Stable · 88%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Software</span>
          <span className="mono">v2.4.1-rc3</span>
        </div>
      </div>
    </aside>
  );
}

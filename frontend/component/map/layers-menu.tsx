import { useState } from "react";
import { Layers as LayersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MapLayerState, WeatherLayerMode } from "@/types/mission";

const SEEN_KEY = "mare-layers-menu-seen";

const WEATHER_MODES: { value: WeatherLayerMode; label: string }[] = [
  { value: "temperature", label: "Temperature" },
  { value: "rainfall", label: "Rainfall (radar)" },
  { value: "wind", label: "Wind (directional)" },
  { value: "clouds", label: "Cloud Cover" },
];

interface LayersMenuProps {
  state: MapLayerState;
  onToggle: (key: keyof Omit<MapLayerState, "weatherMode">) => void;
  onWeatherModeChange: (mode: WeatherLayerMode) => void;
}

export function LayersMenu({ state, onToggle, onWeatherModeChange }: LayersMenuProps) {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return true;
    }
  });

  const activeCount = [
    state.publicTransport,
    state.liveTraffic,
    state.bicycleRoutes,
    state.buildings3D,
    state.streetView,
    state.wildfires,
    state.airQuality,
    state.weatherZones,
  ].filter(Boolean).length;

  const markSeen = () => {
    if (seen) return;
    setSeen(true);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const item = (key: keyof Omit<MapLayerState, "weatherMode">, label: string) => (
    <DropdownMenuCheckboxItem
      checked={state[key]}
      onSelect={(e) => {
        e.preventDefault();
        onToggle(key);
      }}
    >
      {label}
    </DropdownMenuCheckboxItem>
  );

  return (
    <DropdownMenu onOpenChange={(open) => open && markSeen()}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="relative gap-1.5 bg-surface/90 backdrop-blur">
          <LayersIcon className="size-3.5" />
          Layers
          {activeCount > 0 && (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
          {!seen && (
            <span className="absolute -right-1 -top-1 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("w-64")}>
        <DropdownMenuLabel>Transportation</DropdownMenuLabel>
        {item("publicTransport", "Public Transport")}
        {item("liveTraffic", "Live Traffic")}
        {item("bicycleRoutes", "Bicycle Routes")}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Buildings</DropdownMenuLabel>
        {item("buildings3D", "3D / Raised Buildings")}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Navigation</DropdownMenuLabel>
        {item("streetView", "Street View")}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Environment</DropdownMenuLabel>
        {item("wildfires", "Wildfires")}
        {item("airQuality", "Air Quality")}
        {item("weatherZones", "Weather Zones")}

        {state.weatherZones && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Weather Visualization</DropdownMenuLabel>
            {WEATHER_MODES.map((m) => (
              <DropdownMenuCheckboxItem
                key={m.value}
                checked={state.weatherMode === m.value}
                onSelect={(e) => {
                  e.preventDefault();
                  onWeatherModeChange(m.value);
                }}
              >
                {m.label}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

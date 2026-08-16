import type { AqiCategory, WildfireRisk } from "@/types/mission";

export function temperatureColor(tempC: number): string {
  if (tempC < 10) return "#3B82F6"; // cold — blue
  if (tempC < 20) return "#10B981"; // mild — green
  if (tempC < 27) return "#EAB308"; // warm — yellow
  if (tempC < 33) return "#F97316"; // hot — orange
  return "#EF4444"; // extreme — red
}

export function aqiColor(aqi: number): { color: string; category: AqiCategory } {
  if (aqi <= 50) return { color: "#10B981", category: "Good" };
  if (aqi <= 100) return { color: "#EAB308", category: "Moderate" };
  if (aqi <= 150) return { color: "#F97316", category: "Unhealthy for Sensitive Groups" };
  if (aqi <= 200) return { color: "#EF4444", category: "Unhealthy" };
  if (aqi <= 300) return { color: "#8B5CF6", category: "Very Unhealthy" };
  return { color: "#7F1D1D", category: "Hazardous" };
}

export function wildfireColor(risk: WildfireRisk): string {
  switch (risk) {
    case "safe":
      return "#10B981";
    case "moderate":
      return "#EAB308";
    case "high":
      return "#F97316";
    case "active":
      return "#EF4444";
  }
}

export type TrafficLevel = "free" | "moderate" | "heavy" | "severe";
export function trafficColor(level: TrafficLevel): string {
  switch (level) {
    case "free":
      return "#10B981";
    case "moderate":
      return "#F97316";
    case "heavy":
      return "#EF4444";
    case "severe":
      return "#7F1D1D";
  }
}

/** Deterministic pseudo-random generator so simulated layers don't jitter between renders. */
export function seededValue(seedStr: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return min + normalized * (max - min);
}

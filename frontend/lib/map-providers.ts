// ---------------------------------------------------------------------------
// Third-party map & environmental data providers.
//
// Every provider below is optional. If its API key env var is not set, the
// corresponding map layer renders a clearly-labeled simulated/placeholder
// visualization instead of silently failing or faking a "live" data source.
//
// To go live, add the relevant key(s) to a `.env.local` file at the project
// root (see `.env.example`) and restart the dev server. No component code
// needs to change — everything reads through this module.
// ---------------------------------------------------------------------------

const env = import.meta.env;

export const providers = {
  openWeather: {
    key: env.VITE_OPENWEATHERMAP_API_KEY as string | undefined,
    get configured() {
      return Boolean(this.key);
    },
    /** OpenWeatherMap tile layer for temperature / precipitation / wind / clouds. */
    tileUrl(layer: "temp_new" | "precipitation_new" | "wind_new" | "clouds_new") {
      return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${this.key}`;
    },
  },
  thunderforest: {
    key: env.VITE_THUNDERFOREST_API_KEY as string | undefined,
    get configured() {
      return Boolean(this.key);
    },
    tileUrl(layer: "transport" | "cycle") {
      return `https://{s}.tile.thunderforest.com/${layer}/{z}/{x}/{y}.png?apikey=${this.key}`;
    },
  },
  tomtom: {
    key: env.VITE_TOMTOM_API_KEY as string | undefined,
    get configured() {
      return Boolean(this.key);
    },
    tileUrl() {
      return `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${this.key}`;
    },
  },
  mapbox: {
    token: env.VITE_MAPBOX_TOKEN as string | undefined,
    get configured() {
      return Boolean(this.token);
    },
  },
  google: {
    key: env.VITE_GOOGLE_MAPS_API_KEY as string | undefined,
    get configured() {
      return Boolean(this.key);
    },
    streetViewEmbedUrl(lat: number, lng: number) {
      return `https://www.google.com/maps/embed/v1/streetview?key=${this.key}&location=${lat},${lng}&fov=90&heading=0&pitch=0`;
    },
  },
  airQuality: {
    // TODO: wire to IQAir / AirNow / OpenAQ — none require a hardcoded key
    // to *design* against, so this is left unconfigured until a provider
    // is chosen. Swap `fetchAirQualityZones` in services/api.ts.
    key: env.VITE_AIRQUALITY_API_KEY as string | undefined,
    get configured() {
      return Boolean(this.key);
    },
  },
  wildfire: {
    // TODO: wire to NASA FIRMS (https://firms.modaps.eosdis.nasa.gov/api/)
    key: env.VITE_FIRMS_API_KEY as string | undefined,
    get configured() {
      return Boolean(this.key);
    },
  },
};

export type ProviderName = keyof typeof providers;

// ---------------------------------------------------------------------------
// Base map tile providers — no API key required. Used by mission-map.tsx's
// <LayersControl.BaseLayer> to switch between Street and Satellite views.
// ---------------------------------------------------------------------------

export interface BaseMapProvider {
  name: string;
  url: string;
  attribution: string;
}

export const streetMapProvider: BaseMapProvider = {
  name: "Street View",
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
};

export const satelliteMapProvider: BaseMapProvider = {
  name: "Satellite View",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution:
    "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
};

export const terrainMapProvider: BaseMapProvider = {
  name: "Terrain View",
  url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenTopoMap contributors",
};

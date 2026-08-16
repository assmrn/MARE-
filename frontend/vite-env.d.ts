/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_OPENWEATHERMAP_API_KEY?: string;
  readonly VITE_THUNDERFOREST_API_KEY?: string;
  readonly VITE_TOMTOM_API_KEY?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_AIRQUALITY_API_KEY?: string;
  readonly VITE_FIRMS_API_KEY?: string;
  readonly VITE_CAMERA_RGB_URL?: string;
  readonly VITE_CAMERA_RGB_TRANSPORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraConnectionStatus, CameraSourceConfig } from "@/types/mission";

interface UseCameraStreamResult {
  status: CameraConnectionStatus;
  lastFrameAt: number | null;
  fps: number | null;
  resolution: { width: number; height: number } | null;
  /** Attach to an <img> element for MJPEG sources. */
  imgProps: {
    src: string | undefined;
    onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    onError: () => void;
  };
}

const FPS_WINDOW_MS = 3000;

export function useCameraStream(source: CameraSourceConfig): UseCameraStreamResult {
  const [status, setStatus] = useState<CameraConnectionStatus>(source.url ? "connecting" : "unavailable");
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const frameTimestamps = useRef<number[]>([]);

  useEffect(() => {
    setStatus(source.url && source.transport === "mjpeg" ? "connecting" : source.url ? "error" : "unavailable");
    setLastFrameAt(null);
    setFps(null);
    setResolution(null);
    frameTimestamps.current = [];
  }, [source.url, source.transport]);

// MJPEG here means "periodic JPEG snapshot re-fetched on an interval via a
// cache-busted <img src>" — not true multipart/x-mixed-replace streaming.
// This is the same pattern many real IP cameras/bridges expose under an
// "MJPEG" label, and it's what's implemented and tested (see
// HANDOFF_STEP_04.md "test procedure"). If the real backend instead serves
// genuine multipart/x-mixed-replace, a plain <img src={url}> (no polling
// loop, no cache-busting) already works natively in most browsers — that
// would be a simplification, not a rewrite, once the real transport is confirmed.
  const [cacheBust, setCacheBust] = useState(0);
  useEffect(() => {
    if (!source.url || source.transport !== "mjpeg") return;
    const id = setInterval(() => setCacheBust((n) => n + 1), 200); // ~5fps refresh ceiling
    return () => clearInterval(id);
  }, [source.url, source.transport]);

  useEffect(() => {
    if (status !== "live" && status !== "connecting") return;
    const id = setInterval(() => {
      if (lastFrameAt && Date.now() - lastFrameAt > 2000) setStatus("error");
    }, 500);
    return () => clearInterval(id);
  }, [status, lastFrameAt]);

  const onLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const now = Date.now();
    setLastFrameAt(now);
    setStatus("live");

    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setResolution({ width: img.naturalWidth, height: img.naturalHeight });
    }

    frameTimestamps.current = [...frameTimestamps.current, now].filter((t) => now - t < FPS_WINDOW_MS);
    if (frameTimestamps.current.length >= 2) {
      const span = (frameTimestamps.current.at(-1)! - frameTimestamps.current[0]) / 1000;
      setFps(span > 0 ? (frameTimestamps.current.length - 1) / span : null);
    }
  }, []);

  const onError = useCallback(() => {
    setStatus("error");
  }, []);

  const src =
    source.url && source.transport === "mjpeg"
      ? `${source.url}${source.url.includes("?") ? "&" : "?"}_=${cacheBust}`
      : undefined;

  return { status, lastFrameAt, fps, resolution, imgProps: { src, onLoad, onError } };
}

// In-memory snapshot cache with pub/sub for MJPEG streaming
// ESP32 uploads frames, MJPEG stream endpoint pushes to clients

interface CachedSnapshot {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
  frameId: number;
}

type FrameListener = (snapshot: CachedSnapshot) => void;

const cache = new Map<string, CachedSnapshot>();
const listeners = new Map<string, Set<FrameListener>>();
const MAX_AGE_MS = 60_000;
let globalFrameId = 0;

export function setSnapshot(machineId: string, buffer: Buffer, contentType: string = 'image/jpeg') {
  globalFrameId++;
  const snapshot: CachedSnapshot = { buffer, contentType, timestamp: Date.now(), frameId: globalFrameId };
  cache.set(machineId, snapshot);

  // Notify MJPEG stream subscribers
  const subs = listeners.get(machineId);
  if (subs) {
    for (const cb of subs) {
      try { cb(snapshot); } catch { /* ignore */ }
    }
  }
}

export function getSnapshot(machineId: string): CachedSnapshot | null {
  const entry = cache.get(machineId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MAX_AGE_MS) {
    cache.delete(machineId);
    return null;
  }
  return entry;
}

export function subscribeFrames(machineId: string, cb: FrameListener): () => void {
  if (!listeners.has(machineId)) listeners.set(machineId, new Set());
  listeners.get(machineId)!.add(cb);
  return () => {
    const subs = listeners.get(machineId);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) listeners.delete(machineId);
    }
  };
}

// ============================================
// PILI_MAQ — Camera Proxy Service
// ============================================

const SNAPSHOT_TIMEOUT = parseInt(process.env.MACHINE_SNAPSHOT_TIMEOUT || '3', 10) * 1000;

/**
 * Fetch snapshot from ESP32-CAM and return as buffer
 */
export async function fetchCameraSnapshot(
  camIp: string,
  camPort: number = 80
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const url = `http://${camIp}:${camPort}/capture`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'image/jpeg' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return { buffer, contentType };
  } catch {
    return null;
  }
}

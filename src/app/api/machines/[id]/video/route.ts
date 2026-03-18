import { verificarAutenticacao } from '@/lib/auth';
import { getSnapshot, subscribeFrames } from '@/lib/machines/snapshot-cache';

export const dynamic = 'force-dynamic';

const BOUNDARY = 'pili-mjpeg-boundary';

// GET /api/machines/:id/video — MJPEG stream (video from ESP32 snapshots)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarAutenticacao();
  if (!auth.autenticado) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send current frame immediately if available
      const current = getSnapshot(id);
      if (current) {
        try {
          const header = `--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${current.buffer.length}\r\n\r\n`;
          controller.enqueue(encoder.encode(header));
          controller.enqueue(new Uint8Array(current.buffer));
          controller.enqueue(encoder.encode('\r\n'));
        } catch { /* ignore */ }
      }

      // Subscribe to new frames from ESP32
      unsubscribe = subscribeFrames(id, (snapshot) => {
        try {
          const header = `--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${snapshot.buffer.length}\r\n\r\n`;
          controller.enqueue(encoder.encode(header));
          controller.enqueue(new Uint8Array(snapshot.buffer));
          controller.enqueue(encoder.encode('\r\n'));
        } catch {
          // Client disconnected
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

import { verificarAutenticacao } from '@/lib/auth';
import { machineEventBus, type MachineEventData } from '@/lib/machines/event-bus';

export const dynamic = 'force-dynamic';

// GET /api/machines/:id/stream — SSE stream for single machine
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarAutenticacao();
  if (!auth.autenticado) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', machine_id: id })}\n\n`));

      unsubscribe = machineEventBus.subscribeMachine(id, (event: MachineEventData) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client disconnected
        }
      });

      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // Client disconnected
        }
      }, 30000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

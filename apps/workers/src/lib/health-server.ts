import { createServer, type Server } from 'node:http';

export interface HealthServerStatus {
  worker: string;
  syncing: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export function startHealthServer(
  port: number,
  getStatus: () => HealthServerStatus,
  onListen?: () => void,
): Server {
  const server = createServer((req, res) => {
    const path = req.url?.split('?')[0];
    if (path === '/health' || path === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...getStatus() }));
      return;
    }

    res.writeHead(404).end();
  });

  server.listen(port, onListen);
  return server;
}

export function resolveHealthServerPort(): number {
  const raw = process.env.PORT?.trim();
  if (!raw) {
    return 8080;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT environment variable: ${raw}`);
  }
  return parsed;
}

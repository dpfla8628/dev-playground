import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { saveRequest, getRequests, getRequest } from './db.js';

const app = express();
app.use(cors());
// ponytail: json() only on /api — express.raw() on /hooks needs the stream untouched
app.use('/api', express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// channelId -> Set<WebSocket>
const channels = new Map();

wss.on('connection', (ws, req) => {
  const channelId = new URL(req.url, 'http://localhost').searchParams.get('channel');
  if (!channelId) return ws.close();

  if (!channels.has(channelId)) channels.set(channelId, new Set());
  channels.get(channelId).add(ws);

  ws.on('close', () => channels.get(channelId)?.delete(ws));
});

function broadcast(channelId, data) {
  channels.get(channelId)?.forEach(ws => {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  });
}

// Receive any webhook (all methods)
app.all('/hooks/:channelId', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  const { channelId } = req.params;
  const id = randomUUID();
  const now = new Date().toISOString();
  const body = Buffer.isBuffer(req.body) ? req.body.toString() : '';

  const record = {
    id,
    channel_id: channelId,
    method: req.method,
    headers: JSON.stringify(req.headers),
    body,
    received_at: now,
  };

  saveRequest.run(id, channelId, req.method, record.headers, body, now);
  broadcast(channelId, { type: 'new_request', request: record });

  res.status(200).json({ ok: true, id });
});

// List history
app.get('/api/channels/:channelId/requests', (req, res) => {
  res.json(getRequests.all(req.params.channelId));
});

// Replay — re-insert with new id/timestamp and broadcast
app.post('/api/channels/:channelId/requests/:requestId/replay', (req, res) => {
  const row = getRequest.get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'not found' });

  const id = randomUUID();
  const now = new Date().toISOString();
  saveRequest.run(id, row.channel_id, row.method, row.headers, row.body, now);
  broadcast(row.channel_id, { type: 'new_request', request: { ...row, id, received_at: now } });

  res.json({ ok: true, id });
});

server.listen(3001, () => console.log('Server running on http://localhost:3001'));

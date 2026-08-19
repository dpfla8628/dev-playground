# 01 — Webhook Inspector

Receive, inspect, and replay webhooks in real time. A lightweight self-hosted alternative to RequestBin / Hookdeck.

## Stack

| Layer | Tech |
|-------|------|
| Server | Node.js, Express, `ws` (WebSocket), `better-sqlite3` |
| Client | React 18, Vite |

## Features

- **Real-time delivery** — incoming webhooks pushed instantly via WebSocket (no polling)
- **Persistent history** — stored in SQLite, survives server restarts
- **One-click replay** — re-fire any stored request into the live channel
- **Any HTTP method** — GET, POST, PUT, PATCH, DELETE all captured
- **JSON formatting** — bodies auto-pretty-printed when valid JSON

## Run

```bash
# Terminal 1 — server
cd server
npm install
npm run dev

# Terminal 2 — client
cd client
npm install
npm run dev
```

Open **http://localhost:5173**, copy the webhook URL, and send requests to it:

```bash
curl -X POST http://localhost:3001/hooks/<your-channel-id> \
  -H "Content-Type: application/json" \
  -d '{"event": "payment.completed", "amount": 9900}'
```

## Architecture

```
Browser ──WS──► Server ◄──POST── External service
                  │
              SQLite DB
```

The server runs a single HTTP+WebSocket listener on port 3001. Each channel is identified by a random ID stored in `sessionStorage`. WebSocket clients subscribe by `?channel=<id>`; the server fans out new requests to all connected clients in that channel.

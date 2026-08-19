import { useState, useEffect, useRef } from 'react';

const SERVER = 'http://localhost:3001';
const WS = SERVER.replace('http', 'ws');

function genChannelId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatBody(body) {
  if (!body) return '(empty)';
  try { return JSON.stringify(JSON.parse(body), null, 2); }
  catch { return body; }
}

function MethodBadge({ method }) {
  return <span className={`badge badge-${method.toLowerCase()}`}>{method}</span>;
}

export default function App() {
  const [channelId] = useState(() => {
    const saved = sessionStorage.getItem('whi-channel');
    if (saved) return saved;
    const id = genChannelId();
    sessionStorage.setItem('whi-channel', id);
    return id;
  });

  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [replayed, setReplayed] = useState(null);
  const wsRef = useRef(null);

  const hookUrl = `${SERVER}/hooks/${channelId}`;

  useEffect(() => {
    fetch(`/api/channels/${channelId}/requests`)
      .then(r => r.json())
      .then(setRequests)
      .catch(console.error);
  }, [channelId]);

  useEffect(() => {
    const ws = new WebSocket(`${WS}?channel=${channelId}`);
    wsRef.current = ws;
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'new_request') {
        setRequests(prev => [msg.request, ...prev]);
      }
    };
    return () => ws.close();
  }, [channelId]);

  const copyUrl = () => {
    navigator.clipboard.writeText(hookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const replay = async req => {
    await fetch(`/api/channels/${channelId}/requests/${req.id}/replay`, { method: 'POST' });
    setReplayed(req.id);
    setTimeout(() => setReplayed(null), 1500);
  };

  const newChannel = () => {
    sessionStorage.removeItem('whi-channel');
    window.location.reload();
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-title">
          <span className="logo">⚡</span>
          <h1>Webhook Inspector</h1>
        </div>
        <div className="url-bar">
          <MethodBadge method="POST" />
          <code className="url-text">{hookUrl}</code>
          <button className="btn" onClick={copyUrl}>
            {copied ? '✓ Copied' : 'Copy URL'}
          </button>
          <button className="btn btn-ghost" onClick={newChannel}>New Channel</button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span>Requests</span>
            <span className="count-badge">{requests.length}</span>
          </div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <p>Waiting for webhooks…</p>
              <p className="hint">Send a POST request to the URL above</p>
            </div>
          ) : (
            requests.map(r => (
              <button
                key={r.id}
                className={`request-row ${selected?.id === r.id ? 'active' : ''}`}
                onClick={() => setSelected(r)}
              >
                <MethodBadge method={r.method} />
                <span className="row-time">{new Date(r.received_at).toLocaleTimeString()}</span>
                <span className="row-preview">{r.body ? r.body.slice(0, 50) : '(empty)'}</span>
              </button>
            ))
          )}
        </aside>

        <main className="detail">
          {!selected ? (
            <div className="empty-state center">
              <p>← Select a request to inspect</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <MethodBadge method={selected.method} />
                <span className="detail-time">{new Date(selected.received_at).toLocaleString()}</span>
                <button className="btn btn-accent" onClick={() => replay(selected)}>
                  {replayed === selected.id ? '✓ Replayed' : '↺ Replay'}
                </button>
              </div>

              <section className="detail-section">
                <h2>Headers</h2>
                <pre>{JSON.stringify(JSON.parse(selected.headers), null, 2)}</pre>
              </section>

              <section className="detail-section">
                <h2>Body</h2>
                <pre>{formatBody(selected.body)}</pre>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

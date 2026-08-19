# 🔍 01 — Webhook Inspector

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-ws-010101?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

<br/>

## 🎯 왜 만들었나?

결제·배송·GitHub 이벤트 같은 외부 서비스가 **내 서버로 HTTP 요청을 보내는 구조(Webhook)** 는 실무에서 매우 흔합니다.  
문제는 개발 중에 "어떤 데이터가 실제로 날아오는지" 눈으로 확인하기 어렵다는 것입니다.

이 프로젝트는 [RequestBin](https://requestbin.com) / [Hookdeck](https://hookdeck.com) 같은 서비스를 직접 구현한 것입니다.  
**WebSocket 실시간 스트리밍** + **SQLite 영속성** 을 함께 다루는 패턴을 익히는 게 핵심 목적입니다.

<br/>

## 🔑 채널 시스템 원리

서버 하나를 여러 사람이 써도 서로의 웹훅이 섞이지 않게 하려면 **격리된 통신 공간**이 필요합니다.  
이를 위해 브라우저가 처음 접속할 때 **랜덤 채널 ID** 를 만들고, 그 ID를 "방 번호"처럼 사용합니다.

```
브라우저 접속
    │
    ▼
채널 ID 생성 (Math.random().toString(36).slice(2, 10))
    │  예: "lszxzxxi"
    │
    ├─ sessionStorage에 저장
    │      → 새로고침해도 같은 ID 유지 (히스토리 안 사라짐)
    │      → 탭 닫으면 초기화 (localStorage와의 차이)
    │
    ├─ 수신 URL 생성: POST http://localhost:3001/hooks/lszxzxxi
    │      → 외부에서 이 URL로 요청을 보내야 내 화면에 뜸
    │
    └─ WebSocket 연결: ws://localhost:3001?channel=lszxzxxi
           → 서버는 같은 channel ID에 연결된 클라이언트에만 broadcast
```

**왜 랜덤 ID인가?**  
서버가 별도 로그인·인증 없이 채널을 분리하는 가장 단순한 방법입니다.  
`/hooks/abc`로 오는 요청은 `abc` 채널 구독자에게만 전달되고, `/hooks/xyz`는 `xyz` 채널에만 전달됩니다.  
URL을 모르면 다른 사람의 채널에 접근할 수 없어 간단한 격리 효과도 생깁니다.

```js
// client: 채널 ID 생성 및 sessionStorage 관리
const [channelId] = useState(() => {
  const saved = sessionStorage.getItem('whi-channel');
  if (saved) return saved;
  const id = Math.random().toString(36).slice(2, 10);
  sessionStorage.setItem('whi-channel', id);
  return id;
});

// server: channel ID 별로 WebSocket 클라이언트를 분리해서 관리
const channels = new Map(); // { "lszxzxxi": Set<WebSocket>, "abc123": Set<WebSocket> }

wss.on('connection', (ws, req) => {
  const channelId = new URL(req.url, 'http://localhost').searchParams.get('channel');
  if (!channels.has(channelId)) channels.set(channelId, new Set());
  channels.get(channelId).add(ws); // 해당 채널 방에 입장
});
```

<br/>

## ⚙️ 기술 선택 이유

### `ws` — Socket.IO 대신 쓴 이유

Socket.IO는 자동 재연결·룸 관리 등을 제공하지만 내부가 추상화되어 있습니다.  
이 프로젝트의 목적이 WebSocket 동작 원리를 직접 이해하는 것이라 `ws`로 팬아웃을 직접 구현했습니다.

> **팬아웃(fan-out)** — 웹훅 하나가 수신되면 해당 채널에 연결된 모든 탭에 동시에 전달하는 패턴

```js
const channels = new Map(); // Map<channelId, Set<WebSocket>>

function broadcast(channelId, data) {
  channels.get(channelId)?.forEach(ws => {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  });
}
```

---

### `better-sqlite3` — PostgreSQL 대신 쓴 이유

웹훅 히스토리를 **서버 재시작 후에도 유지**하려면 영속성이 필요합니다.  
PostgreSQL은 별도 서버를 띄워야 하지만, SQLite는 파일 하나(`.db`)로 동작해 설치 없이 바로 쓸 수 있습니다.

---

### `express.raw()` — 미들웨어 순서 문제

`app.use(express.json())`을 전역에 등록하면 body stream을 먼저 소비해버려서  
`/hooks` 라우트에서 원본 body가 빈 값으로 옵니다.

```js
// ❌ 전역 json()이 /hooks의 body stream을 먼저 소비함
app.use(express.json());
app.all('/hooks/:channelId', express.raw({ type: '*/*' }), ...);

// ✅ 경로별로 분리
app.use('/api', express.json());
app.all('/hooks/:channelId', express.raw({ type: '*/*' }), ...);
```

---

### Vite — CRA 대신 쓴 이유

CRA는 코드 변경 시 전체를 다시 번들링합니다.  
Vite는 번들링 없이 ES 모듈을 브라우저에 직접 전달해 개발 서버 시작과 HMR이 즉각적입니다.  
현재 React 생태계의 표준 빌드 도구입니다.

<br/>

## 🏗️ 아키텍처

```
외부 서비스 (GitHub, 결제 등)
        │ POST /hooks/:channelId
        ▼
┌──────────────────────────────┐
│     Express 서버 (3001)       │
│                              │
│  1. SQLite에 요청 저장         │
│  2. 채널 구독자에게 broadcast   │
└──────┬───────────────────────┘
       │ WebSocket push
       ▼
┌──────────────────────────────┐
│     브라우저 (React, 5173)    │
│  - 실시간 목록 업데이트         │
│  - 클릭 시 헤더/바디 상세 보기  │
│  - Replay 버튼으로 재전송       │
└──────────────────────────────┘
```

<br/>

## 🚀 실행 방법

> Windows PowerShell 5.1은 `&&` 미지원. 명령어를 한 줄씩 실행하세요.

```powershell
# 터미널 1 — 서버
cd C:\Users\<이름>\Documents\dev-playground\01-webhook-inspector\server
npm install
npm run dev

# 터미널 2 (새 창) — 클라이언트
cd C:\Users\<이름>\Documents\dev-playground\01-webhook-inspector\client
npm install
npm run dev
```

**http://localhost:5173** 접속 → URL 복사 → 아래 명령으로 테스트

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/hooks/<채널-ID>" `
  -Method POST -ContentType "application/json" `
  -Body '{"event": "payment.completed", "amount": 9900}'
```

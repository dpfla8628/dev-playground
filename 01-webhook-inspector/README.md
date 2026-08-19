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

## ⚙️ 기술 스택

### 🟢 Node.js

JavaScript를 브라우저가 아닌 서버에서 실행할 수 있게 해주는 런타임입니다.  
싱글 스레드이지만 **논블로킹 I/O** 구조 덕분에 수많은 WebSocket 연결을 동시에 효율적으로 처리합니다.  
(Python/Go 대비) 서버·클라이언트를 JS 하나로 통일할 수 있어 이 프로젝트에 적합합니다.

---

### 🚂 Express

Node.js로 HTTP 서버를 만들 때 쓰는 프레임워크입니다.  
URL 라우팅, 요청/응답 처리, 미들웨어 체인을 직접 구현할 필요 없이 간결하게 작성할 수 있습니다.

```js
// 이렇게 URL 별로 처리 로직을 연결하는 게 Express의 핵심
app.all('/hooks/:channelId', express.raw({ type: '*/*' }), (req, res) => { ... });
app.get('/api/channels/:channelId/requests', (req, res) => { ... });
```

> **⚠️ 이 프로젝트에서 겪은 문제**  
> `app.use(express.json())`을 전역에 등록하면 body stream을 먼저 소비해버려서,  
> `/hooks` 라우트의 `express.raw()`가 빈 body를 받게 됩니다.  
> 해결: `/api`에만 `express.json()`을 적용하고, `/hooks`는 `raw()`를 직접 지정했습니다.
> ```js
> app.use('/api', express.json()); // /api 경로에만 JSON 파싱
> app.all('/hooks/:channelId', express.raw({ type: '*/*' }), ...); // raw body 유지
> ```

---

### 🔌 WebSocket (`ws`)

HTTP는 클라이언트가 요청해야만 서버가 응답합니다.  
**WebSocket은 한 번 연결하면 서버가 먼저 데이터를 밀어줄 수 있는(push) 양방향 프로토콜**입니다.  
웹훅이 들어오는 즉시 브라우저에 전달하려면 WebSocket이 필요합니다.

Socket.IO 대신 `ws`를 선택한 이유는, Socket.IO는 내부 동작이 추상화되어 있어 학습 목적에는 `ws`처럼 원시 프로토콜을 직접 다루는 게 낫기 때문입니다.

**팬아웃(fan-out)** — 웹훅 하나가 수신되면 그 채널에 연결된 모든 브라우저 탭에 동시에 전달하는 패턴입니다.

```js
// 채널 ID별로 연결된 WebSocket 클라이언트를 Map으로 관리
const channels = new Map(); // Map<channelId, Set<WebSocket>>

// 웹훅 수신 시 해당 채널 구독자 전원에게 broadcast
function broadcast(channelId, data) {
  channels.get(channelId)?.forEach(ws => {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  });
}
```

---

### 🗄️ SQLite (`better-sqlite3`)

별도 서버 프로세스 없이 **파일 하나(`.db`)로 동작하는 경량 관계형 DB**입니다.  
PostgreSQL·MySQL은 DB 서버를 따로 띄워야 하지만, SQLite는 앱 프로세스 안에서 직접 파일을 읽고 씁니다.  
서버를 재시작해도 데이터가 사라지지 않고, 설치 없이 바로 쓸 수 있습니다.

`better-sqlite3`는 async/await 없이 **동기로 쿼리**할 수 있어 코드가 단순합니다.

```js
// 한 번 prepare 해두면 반복 실행이 빠름
const saveRequest = db.prepare(
  `INSERT INTO requests (id, channel_id, method, headers, body, received_at) VALUES (?, ?, ?, ?, ?, ?)`
);
saveRequest.run(id, channelId, method, headers, body, now); // async 없이 즉시 저장
```

---

### ⚛️ React + Vite

**Vite**는 개발 서버 시작 시 번들링을 건너뛰고 브라우저에 ES 모듈을 그대로 전달합니다.  
CRA(Create React App)는 변경할 때마다 전체를 다시 번들링해서 느리지만, Vite는 변경된 파일만 교체해 반응이 즉각적입니다. 현재 React 생태계 표준 도구입니다.

클라이언트에서 WebSocket 연결과 상태 관리는 React Hook으로 처리합니다.

```js
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:3001?channel=${channelId}`);
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'new_request') setRequests(prev => [msg.request, ...prev]);
  };
  return () => ws.close(); // 컴포넌트 언마운트 시 연결 해제
}, [channelId]);
```

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

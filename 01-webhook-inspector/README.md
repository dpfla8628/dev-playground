# 🔍 01 — Webhook Inspector

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-ws-010101?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

<br/>

## 🎯 왜 만들었나?

실무에서는 결제, 배송, GitHub 이벤트 등 **외부 서비스가 내 서버로 HTTP 요청을 보내는 구조(Webhook)** 를 흔하게 사용합니다.  
문제는 개발 중에 "요청이 실제로 어떻게 날아오는지" 확인하기 어렵다는 것입니다.

이 프로젝트는 **RequestBin / Hookdeck 같은 서비스의 미니멀한 자체 구현**입니다.  
핵심 목적은 두 가지입니다.

1. **WebSocket 기반 실시간 스트리밍** 구조를 직접 구현하며 이해하기
2. **영속성(SQLite)** + **실시간성(WebSocket)** 을 함께 다루는 패턴 익히기

<br/>

## ⚙️ 기술 스택 & 선택 이유

### 🟢 Node.js — 서버 런타임

| 비교 대상 | 선택 이유 |
|-----------|----------|
| Python (FastAPI) | 이 프로젝트는 I/O 집약적(동시 WebSocket 연결). Node.js의 비동기 이벤트 루프가 더 적합 |
| Go | 성능은 더 좋지만 작은 프로젝트에서 장점이 드러나지 않음. JS로 서버·클라이언트 통일 |

> Node.js는 싱글 스레드지만 **논블로킹 I/O** 덕분에 수천 개의 WebSocket 연결을 효율적으로 처리합니다.

---

### 🚂 Express — HTTP 프레임워크

| 비교 대상 | 선택 이유 |
|-----------|----------|
| Fastify | 더 빠르지만 이 규모에서 차이 없음. Express는 생태계·레퍼런스가 압도적 |
| Hono | Edge Runtime 최적화. 현재는 표준 Node.js 환경이므로 불필요 |

> `express.json()` vs `express.raw()` 미들웨어 순서가 body 파싱에 영향을 준다는 것을 이 프로젝트에서 직접 경험했습니다.  
> `/hooks` 라우트에는 `raw()`를 먼저 적용해야 원본 바이트를 읽을 수 있습니다.

---

### 🔌 ws — WebSocket 라이브러리

| 비교 대상 | 선택 이유 |
|-----------|----------|
| Socket.IO | 자동 재연결·룸 등 고수준 기능 제공. 하지만 내부를 모르고 쓰면 블랙박스가 됨 |
| SSE (Server-Sent Events) | 서버→클라이언트 단방향. 이 프로젝트로는 충분하지만 확장성 제한 |
| `ws` | 표준 WebSocket 프로토콜 그대로 사용. 가장 가볍고, 내부 동작을 직접 이해할 수 있음 |

> 채널별 `Map<channelId, Set<WebSocket>>` 구조로 **팬아웃(fan-out)** 을 직접 구현했습니다.

---

### 🗄️ better-sqlite3 — 데이터베이스

| 비교 대상 | 선택 이유 |
|-----------|----------|
| PostgreSQL | 프로덕션 수준의 RDBMS. 설치·설정 비용이 있어 이 규모에 과함 |
| MongoDB | 문서형 DB. JSON 저장에 자연스럽지만 관계형 쿼리가 필요 없어 오버스펙 |
| `better-sqlite3` | 파일 하나(.db)로 동작. 설치 없음, 동기 API라 코드가 단순해짐 |

> 서버를 재시작해도 히스토리가 유지됩니다. 인메모리(Map 등)만 쓰면 서버 껐다 켤 때 데이터가 사라지는 문제가 있습니다.

---

### ⚛️ React + Vite — 클라이언트

| 비교 대상 | 선택 이유 |
|-----------|----------|
| Vue / Svelte | 국내 채용 시장 React 점유율이 압도적. 포트폴리오 가시성 고려 |
| CRA (Create React App) | 사실상 deprecated. Vite가 표준으로 자리잡음 |
| Next.js | SSR이 필요 없는 순수 SPA. 불필요한 복잡도 추가 |

<br/>

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트 (React)                        │
│                                                                 │
│   ① 채널 ID 생성 (sessionStorage)                                │
│   ② WebSocket 연결 → ws://localhost:3001?channel={id}           │
│   ③ 실시간으로 수신된 요청을 화면에 렌더링                           │
│   ④ Replay 버튼 → POST /api/channels/{id}/requests/{reqId}/replay│
└────────────────┬────────────────────────────────────────────────┘
                 │ WebSocket (양방향)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express 서버 (port 3001)                    │
│                                                                 │
│  POST /hooks/:channelId  ◄──────── 외부 서비스 (GitHub, 결제 등) │
│         │                                                       │
│         ├──► better-sqlite3 에 저장 (webhooks.db)               │
│         │                                                       │
│         └──► 해당 채널의 모든 WebSocket 클라이언트에 broadcast      │
│                                                                 │
│  GET  /api/channels/:id/requests  →  히스토리 조회               │
│  POST /api/channels/:id/requests/:reqId/replay  →  재전송        │
└─────────────────────────────────────────────────────────────────┘
                 │
                 ▼
         [ webhooks.db ]
         SQLite 파일 (영속 저장)
```

<br/>

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 실시간 수신 | WebSocket으로 폴링 없이 즉시 브라우저에 반영 |
| 히스토리 저장 | SQLite에 저장 — 서버 재시작 후에도 유지 |
| Replay | 저장된 요청을 한 번 더 채널에 발행 (디버깅용) |
| 모든 HTTP 메서드 | GET · POST · PUT · PATCH · DELETE 전부 수신 |
| JSON 자동 포맷 | body가 JSON이면 pretty-print로 표시 |

<br/>

## 🚀 실행 방법

```bash
# 터미널 1 — 서버
cd server
npm install
npm run dev    # node --watch 로 파일 변경 감지

# 터미널 2 — 클라이언트
cd client
npm install
npm run dev    # Vite dev server (http://localhost:5173)
```

브라우저에서 **http://localhost:5173** 를 열면 웹훅 수신 URL이 자동 생성됩니다.

```bash
# 테스트: 아래 URL에 POST 요청 보내보기
curl -X POST http://localhost:3001/hooks/<채널-ID> \
  -H "Content-Type: application/json" \
  -d '{"event": "payment.completed", "amount": 9900, "user": "alice"}'
```

<br/>

## 💡 이 프로젝트에서 배운 것

1. **Express 미들웨어 실행 순서** — `express.json()`이 전역에 있으면 `express.raw()`보다 먼저 body stream을 소비해버림. 미들웨어는 등록 순서대로 실행된다는 것을 몸으로 체득
2. **WebSocket 팬아웃 패턴** — `Map<channelId, Set<WebSocket>>` 으로 채널별 구독자 관리
3. **SQLite 동기 API의 장점** — `better-sqlite3`는 async/await 없이 동기로 쿼리 가능. 간단한 서버에서는 오히려 코드가 더 깔끔해짐
4. **sessionStorage vs localStorage** — 탭을 닫으면 채널이 초기화되어야 하므로 `sessionStorage` 선택 (localStorage는 탭을 닫아도 유지됨)

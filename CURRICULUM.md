# dev-playground 커리큘럼

> 새 세션을 시작할 때 이 파일을 먼저 읽어주세요.  
> Claude에게: "CURRICULUM.md 보고 다음 프로젝트 진행해줘" 라고 하면 됩니다.

---

## 목표

하루 한 개, 실무에서 쓰이는 패턴을 작은 스케일로 직접 구현.  
계산기·투두리스트 같은 튜토리얼 아님. 한국 채용 시장(잡코리아·Okky)에서 실제로 보이는 기술 스택 기준.

**각 프로젝트 원칙:**
- 실무 패턴 하나를 핵심으로 잡을 것
- README는 한국어, "왜 이 기술인가"만 설명 (자명한 것은 생략)
- 완성 후 `dev-playground` 루트 README 테이블에 추가
- GitHub에 push

---

## 전체 프로젝트 목록

| Day | 프로젝트 | 핵심 스택 | 왜 포트폴리오에 강한가 | 상태 |
|:---:|---------|---------|----------------------|------|
| 01 | **Webhook Inspector** | Node.js · Express · ws · SQLite · React | 실시간 이벤트 처리, 모든 회사가 웹훅 씀 | ✅ 완료 |
| 02 | **RAG Doc Chat** | FastAPI · ChromaDB · Claude/OpenAI | AI 통합 #1 수요, LLM 이해도 증명 | ✅ 완료 |
| 03 | **Feature Flag Service** | Go · Redis · React | 시니어가 쓰는 도구, 시스템 설계 이해도 | ⬜ |
| 04 | **LLM Prompt Manager** | FastAPI · SQLite · React | LLMOps 트렌드 직격 | ⬜ |
| 05 | **Background Job Dashboard** | BullMQ · Redis · React | 실무 백엔드 패턴 | ⬜ |
| 06 | **Type-safe API Mocker** | TypeScript · Zod · Express | TS 실력 + 개발 도구 감각 | ⬜ |
| 07 | **Git Commit Analyzer** | Python · GitPython · LLM | AI DevTools 조합 | ⬜ |

---

## 완료 프로젝트 상세

### Day 01 — Webhook Inspector
**핵심 학습 포인트:**
- `express.raw()` vs `express.json()` 미들웨어 순서 문제
- `Map<channelId, Set<WebSocket>>` 으로 채널 격리 구현 (팬아웃 패턴)
- sessionStorage로 탭 단위 채널 ID 유지
- PowerShell 5.1에서 `&&` 미지원 → 명령 분리 필요

---

## 세션 시작 방법

```
"CURRICULUM.md 읽고 Day 02 RAG Doc Chat 만들어줘"
```

또는:
```
"다음 프로젝트 진행해줘"
```

---

## 작업 규칙 (Claude용)

- 각 프로젝트 디렉토리: `NN-project-name/`
- 완성 시 루트 `README.md` 테이블에 행 추가
- 완성 시 이 파일 상태 `⬜` → `✅ 완료` 로 변경
- git commit + push (`.claude/settings.json`에 허용 설정됨)
- 커밋 메시지: 영어, 한 줄

---

## 환경 메모

- OS: Windows 11, PowerShell 5.1 (`&&` 미지원)
- dev-playground 경로: `C:\Users\testuser123\Documents\dev-playground`
- GitHub 레포: `dev-playground` (dpfla8628)
- `.claude/settings.json`: git commit/push 자동 허용

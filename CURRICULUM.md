# 📚 AI 스터디 커리큘럼

> 새 세션을 시작할 때 이 파일을 먼저 읽어주세요.  
> Claude에게: "CURRICULUM.md 보고 다음 프로젝트 진행해줘"

---

## 🎯 목표

하루 한 개, 실무에서 쓰이는 패턴을 작은 스케일로 직접 구현하며 **LLM 애플리케이션 개발**을 공부한다.  
RAG → 평가 → 에이전트 → 하네스 → 배포 순으로, "만들고 → 측정하고 → 개선하는" 흐름을 반복한다.

**각 프로젝트 원칙**
- 실무 패턴 하나를 핵심으로 잡는다
- README는 한국어, "왜 이 기술인가"만 설명 (자명한 것은 생략)
- 완성 후 루트 `README.md` 테이블에 추가
- GitHub에 push

**공통 산출물** (모든 프로젝트)

| 파일 | 내용 |
|------|------|
| `eval/` | 골든셋(20~50문항, JSONL) 또는 테스트 |
| `COST.md` | 요청당 토큰·비용, p50/p95 지연, 캐시 히트율 |
| `FAILURES.md` | 실패 사례 3개 이상 (원인 · 재현 · 조치) |

---

## 🗺️ 전체 로드맵

범례: ✅ 완료 · ⬜ 예정 · ★ 난이도(1~5)

### Phase 0. 기초

| Day | 프로젝트 | 핵심 스택 | 상태 |
|:---:|---------|---------|:---:|
| 01 | **Webhook Inspector** | Node.js · Express · ws · SQLite · React | ✅ |
| 02 | **RAG Doc Chat** | FastAPI · ChromaDB · LLM API · React | ✅ |

### Phase A. RAG · 평가 · 관측성

| Day | 프로젝트 | 핵심 스택 | 핵심 학습 | ★ | 상태 |
|:---:|---------|---------|---------|:-:|:---:|
| 03 | **RAG Eval Harness** | pytest · RAGAS/DeepEval · JSONL 골든셋 · GitHub Actions | 골든셋 + LLM judge를 회귀 게이트로 | 3 | ⬜ |
| 04 | **Hybrid Search & Rerank Ablation** | BM25 + 벡터(RRF) · reranker · Contextual Retrieval | 단계별 ablation을 수치로 비교 | 3 | ⬜ |
| 05 | **LLM Prompt Manager + Tracing** | FastAPI · SQLite · React · Langfuse/OTel | 프롬프트 버전 · 토큰/비용/지연 추적 | 3 | ⬜ |
| 06 | **Streaming Tool-use Chat** | FastAPI SSE · tool use · React | 도구 스키마 설계 + 스트리밍 | 2 | ⬜ |
| 07 | **ReAct Agent from Scratch → LangGraph** | Python 순수 루프 → LangGraph | 프레임워크 없이 먼저 구현한 뒤 포팅 | 3 | ⬜ |

### Phase B. 에이전트 · MCP · 가드레일

| Day | 프로젝트 | 핵심 스택 | 핵심 학습 | ★ | 상태 |
|:---:|---------|---------|---------|:-:|:---:|
| 08 | **HITL Approval Agent** | LangGraph interrupt · checkpointer | 중단 후 재개 · idempotency | 3 | ⬜ |
| 09 | **MCP Server (자작)** | MCP SDK · Streamable HTTP | tools/resources/prompts · stateless 설계 | 3 | ⬜ |
| 10 | **Orchestrator-Worker Research Agent** | LangGraph/Agent SDK · asyncio | 병렬 서브에이전트 vs 단일 에이전트 비교 | 4 | ⬜ |
| 11 | **Agent Guardrails & Injection Suite** | Pydantic · Presidio · Docker 샌드박스 | 도구 allowlist · 프롬프트 인젝션 테스트 | 3 | ⬜ |
| 12 | **LLM Gateway & Cost Guard** | FastAPI · 프로바이더 어댑터 · Redis | 폴백 라우팅 · 예산 상한 · 캐시 | 3 | ⬜ |

### Phase C. 하네스 엔지니어링 · Claude Code 워크플로

| Day | 프로젝트 | 핵심 스택 | 핵심 학습 | ★ | 상태 |
|:---:|---------|---------|---------|:-:|:---:|
| 13 | **Long-running Agent Harness** | Agent SDK · `feature_list.json` · git | initializer/coding 분리 · 증분 진행 | 4 | ⬜ |
| 14 | **Generator-Evaluator Loop** | 두 에이전트 · 루브릭 JSON | 생성/평가 분리 · 종료 조건 | 3 | ⬜ |
| 15 | **Claude Code Toolkit** | CLAUDE.md · 슬래시 커맨드 · Skill · Hooks | 위험 명령 차단 · 스킬 패키징 | 2 | ⬜ |
| 16 | **PR Review Bot** | GitHub Actions · Claude Code 헤드리스 | CI diff 리뷰 + 정확도 측정 | 3 | ⬜ |
| 17 | **Git Commit Analyzer** | Python · GitPython · Pydantic | structured output + 재시도 | 2 | ⬜ |
| 18 | **Agent Memory & Context Compaction** | 파일 메모리 · 요약 압축 | 압축 전략 3종 비교 | 3 | ⬜ |

### Phase D. 백엔드 · 배포 · 서빙 · 캡스톤

| Day | 프로젝트 | 핵심 스택 | 핵심 학습 | ★ | 상태 |
|:---:|---------|---------|---------|:-:|:---:|
| 19 | **LLM Job Queue Dashboard** | BullMQ · Redis · React | 재시도 · 백오프 · idempotency · DLQ | 3 | ⬜ |
| 20 | **Korean Doc Parsing → pgvector** | Docling · PostgreSQL + pgvector | 파싱 품질이 검색에 미치는 영향 | 4 | ⬜ |
| 21 | **Dockerized Deploy + CI Eval Gate** | Docker Compose · GitHub Actions | 한 줄 실행 · PR마다 평가 게이트 | 3 | ⬜ |
| 22 | **Local Model Serving & QLoRA Compare** | Ollama · vLLM · QLoRA | 파인튜닝 전/후 같은 평가셋으로 비교 | 5 | ⬜ |
| 23 | **Capstone: Domain Workflow Agent** | FastAPI SSE · Docker · 자작 MCP · 평가/트레이싱 | 한 도메인 end-to-end | 5 | ⬜ |

### 🎁 선택 프로젝트 (α)

| ID | 프로젝트 | 핵심 스택 |
|:--:|---------|---------|
| α1 | A2A Two-Agent Handshake | A2A SDK · Agent Card |
| α2 | Feature Flag Service | Go · Redis · React |
| α3 | Type-safe API Mocker | TypeScript · Zod · Express |
| α4 | Browser E2E Test Agent | Playwright MCP |
| α5 | Embedding Fine-tune on Golden Pairs | sentence-transformers |
| α6 | Feedback Loop & Dataset Synthesis | 피드백 → 골든셋 확장 |
| α7 | Semantic Cache | Redis · 임베딩 유사도 |
| α8 | Remote Agent | Claude Code Loop · Remote Control |

---

## 🔗 의존 관계

```
02 ─► 03 ─► 04 · 05
      03 ─► 14 · 20 · 21 · 22
06 ─► 07 ─► 08 · 13
07 · 09 ─► 10
13 ─► 14 · 18
15 ─► 16
08 · 09 · 11 · 21 ─► 23 (캡스톤)
```

Day 15(Claude Code Toolkit)는 의존이 없어 Day 03 이후 아무 때나 끼워 넣어도 된다.

---

## 📖 참고한 학습 자료

- Chip Huyen, *AI Engineering* — 평가 · RAG · 에이전트 · 파인튜닝
- 『하네스 엔지니어링 백과사전』 — 컨텍스트 · 평가 하네스 · 장시간 에이전트
- 『클로드 코드 마스터』, 『요즘 바이브 코딩 클로드 코드 완벽 가이드』 — CLAUDE.md · Skill · Hook · MCP
- Anthropic Engineering — Building effective agents / Multi-agent research system / Effective harnesses for long-running agents

---

## 🧭 작업 규칙 (Claude용)

- 각 프로젝트 디렉토리: `NN-project-name/`
- 완성 시 루트 `README.md` 테이블에 행 추가, 이 파일 상태 `⬜` → `✅`
- git commit + push (`.claude/settings.json`에 허용 설정됨)
- 커밋 메시지: 영어, 한 줄

## 🖥️ 환경 메모

- OS: Windows 11, PowerShell 5.1 (`&&` 미지원)
- 경로: `C:\Users\testuser123\Documents\dev-playground`
- GitHub 레포: `dev-playground` (dpfla8628)

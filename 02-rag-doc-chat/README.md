# 📄 02 — RAG Doc Chat

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=flat-square)
![Claude](https://img.shields.io/badge/Claude-191919?style=flat-square&logo=anthropic&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)

<br/>

## 🎯 왜 만들었나?

PDF나 TXT 파일을 업로드하면 그 문서에 대해 AI와 대화할 수 있는 챗봇.  
"RAG(Retrieval-Augmented Generation)" 는 2026년 채용 공고에서 가장 자주 보이는 키워드 중 하나입니다.

기업들은 자사 내부 문서(사규, 매뉴얼, 계약서)를 AI에 연결하고 싶어하는데, ChatGPT에 통째로 보내면 세 가지 문제가 생깁니다.

- 문서가 너무 크면 LLM이 한 번에 못 읽음 (컨텍스트 한계)
- 사내 기밀을 외부 서버에 통째로 전송 → 보안 문제
- 매번 전체 문서를 보내면 API 비용 폭발

RAG는 이 세 가지를 한 번에 해결하는 실무 표준 패턴입니다.

<br/>

## 🔑 RAG 동작 원리

### 핵심 개념: 임베딩 (Embedding)

문장의 의미를 숫자 배열(벡터)로 변환합니다.

```
"강아지가 공원을 뛴다"  →  [0.23, -0.81, 0.45, ...]
"개가 잔디밭을 달린다"  →  [0.21, -0.79, 0.44, ...]  ← 숫자가 비슷 = 의미가 비슷
"오늘 날씨가 맑다"      →  [0.91,  0.12, -0.33, ...]  ← 숫자가 다름 = 의미가 다름
```

키워드가 일치하지 않아도 **의미가 비슷하면** 찾을 수 있습니다.

### 전체 흐름

```
[문서 업로드 시]
PDF
  → 500자씩 조각(chunk)으로 쪼갬
  → 각 조각을 임베딩 (OpenAI text-embedding-3-small)
  → ChromaDB에 벡터로 저장

[질문 시]
"해지 조항이 뭐야?"
  → 질문도 임베딩
  → ChromaDB: 가장 유사한 조각 3개 꺼냄
  → Claude: "이 3개 조각을 참고해서 답해줘"
  → 답변
```

LLM은 문서 전체가 아닌 **관련 부분만** 읽습니다.

```python
# server/main.py — 핵심 로직

# 1. 업로드: 조각 내서 벡터 DB에 저장
chunks = chunk_text(text)            # 500자씩
collection.add(documents=chunks, ...)  # 자동 임베딩 후 저장

# 2. 질문: 유사 조각 꺼내서 Claude에 전달
results = collection.query(query_texts=[question], n_results=3)
context = "\n\n---\n\n".join(results["documents"][0])
response = claude.messages.create(
    messages=[{"role": "user", "content": f"[문서]\n{context}\n\n[질문]\n{question}"}]
)
```

<br/>

## ⚙️ 기술 선택 이유

### FastAPI — Node.js 대신 쓴 이유

임베딩·벡터 DB·LLM 라이브러리가 Python 생태계에 집중되어 있습니다.  
`chromadb`, `pdfplumber`, `anthropic`, `openai` SDK 모두 Python 우선입니다.  
Node.js로 구현하면 매번 한 박자 늦거나 기능이 부족합니다.

---

### ChromaDB — Pinecone·Weaviate 대신 쓴 이유

Pinecone, Weaviate 같은 벡터 DB는 별도 서버나 클라우드 계정이 필요합니다.  
ChromaDB는 로컬 파일(`.chroma_db/`) 하나로 동작해 설치 없이 바로 쓸 수 있습니다.

---

### OpenAI `text-embedding-3-small` — 임베딩에 쓴 이유

Anthropic(Claude)은 임베딩 API를 제공하지 않습니다.  
로컬 임베딩 모델(sentence-transformers)은 PyTorch 설치가 필요해 1~2GB가 추가됩니다.  
`text-embedding-3-small`은 API 호출로 처리되고 품질이 안정적입니다 (1M 토큰당 $0.02).

---

### Claude — 생성(Generation)에 쓴 이유

긴 문서 처리 시 컨텍스트 창이 넓고, 한국어 답변 품질이 좋습니다.

<br/>

## 🏗️ 아키텍처

```
브라우저 (React, 5173)
        │
        │ POST /upload  (파일)
        │ POST /chat    (질문)
        ▼
┌────────────────────────────────┐  ← SERVER (server/main.py)
│      FastAPI (8000)            │     uvicorn으로 실행
│                                │
│  /upload:                      │
│    PDF → 조각 → 임베딩 → ChromaDB│
│                                │
│  /chat:                        │
│    질문 → 유사 조각 검색         │
│         → Claude API 호출      │
│         → 답변 반환             │
└────────────────────────────────┘
        │
        ├─ ChromaDB (./chroma_db/)   ← 로컬 벡터 DB
        └─ OpenAI API (임베딩)
           Claude API  (생성)
```

<br/>

## 🚀 실행 방법

### API 키 설정

```powershell
cd C:\Users\<이름>\Documents\dev-playground\02-rag-doc-chat\server
copy .env.example .env
# .env 파일 열어서 키 입력
```

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 터미널 1 — 서버

```powershell
cd C:\Users\<이름>\Documents\dev-playground\02-rag-doc-chat\server
pip install -r requirements.txt
uvicorn main:app --reload
```

### 터미널 2 — 클라이언트

```powershell
cd C:\Users\<이름>\Documents\dev-playground\02-rag-doc-chat\client
npm install
npm run dev
```

**http://localhost:5173** 접속 → PDF 또는 TXT 업로드 → 질문

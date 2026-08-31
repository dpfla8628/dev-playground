from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
from anthropic import Anthropic
import pdfplumber
import tempfile
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ef = OpenAIEmbeddingFunction(
    api_key=os.getenv("OPENAI_API_KEY"),
    model_name="text-embedding-3-small",
)
# ponytail: PersistentClient — 서버 재시작해도 업로드한 문서 유지
chroma = chromadb.PersistentClient(path="./chroma_db")
collection = chroma.get_or_create_collection("docs", embedding_function=ef)
claude = Anthropic()


def chunk_text(text: str, size: int = 500, overlap: int = 50) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + size])
        start += size - overlap
    return [c for c in chunks if c.strip()]


def extract_text(path: str, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        with pdfplumber.open(path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    with open(path, encoding="utf-8") as f:
        return f.read()


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    name = file.filename
    if not (name.endswith(".pdf") or name.endswith(".txt")):
        raise HTTPException(400, "PDF 또는 TXT만 지원합니다")

    doc_id = str(uuid.uuid4())
    suffix = os.path.splitext(name)[1]

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text = extract_text(tmp_path, name)
        if not text.strip():
            raise HTTPException(400, "텍스트를 추출할 수 없습니다")
        chunks = chunk_text(text)
        collection.add(
            documents=chunks,
            ids=[f"{doc_id}_{i}" for i in range(len(chunks))],
            metadatas=[{"doc_id": doc_id, "filename": name} for _ in chunks],
        )
    finally:
        os.unlink(tmp_path)

    return {"doc_id": doc_id, "filename": name, "chunks": len(chunks)}


class ChatRequest(BaseModel):
    doc_id: str
    question: str


@app.post("/chat")
async def chat(body: ChatRequest):
    results = collection.query(
        query_texts=[body.question],
        n_results=3,
        where={"doc_id": body.doc_id},
    )
    docs = results["documents"][0]
    if not docs:
        return {"answer": "문서에서 관련 내용을 찾을 수 없습니다."}

    context = "\n\n---\n\n".join(docs)
    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "아래 문서 내용을 참고해서 질문에 답해줘. "
                "문서에 없는 내용이면 '문서에서 찾을 수 없습니다'라고 해.\n\n"
                f"[문서]\n{context}\n\n"
                f"[질문]\n{body.question}"
            ),
        }],
    )
    return {"answer": response.content[0].text}

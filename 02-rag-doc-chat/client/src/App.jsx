import { useState, useRef, useEffect } from 'react'
import './App.css'

export default function App() {
  const [doc, setDoc] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
      alert('PDF 또는 TXT 파일만 지원합니다.')
      return
    }
    setUploading(true)
    setDoc(null)
    setMessages([])

    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail)
      }
      const data = await res.json()
      setDoc(data)
      setMessages([{
        role: 'ai',
        text: `📄 ${data.filename} 분석 완료 (${data.chunks}개 조각)\n\n문서에 대해 무엇이든 질문해보세요.`,
      }])
    } catch (e) {
      alert(`업로드 실패: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function send() {
    const question = input.trim()
    if (!question || !doc || thinking) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setThinking(true)
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: doc.doc_id, question }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.answer }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '오류가 발생했습니다. 다시 시도해주세요.' }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <span className="logo">📄</span>
        <h1>RAG Doc Chat</h1>
        {doc && (
          <button className="btn btn-ghost" onClick={() => fileRef.current.click()}>
            새 문서
          </button>
        )}
      </header>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${doc ? 'uploaded' : ''}`}
        onClick={() => !uploading && fileRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          hidden
          onChange={e => handleFile(e.target.files[0])}
        />
        {uploading
          ? '⏳ 문서 분석 중...'
          : doc
          ? `✅ ${doc.filename} · ${doc.chunks}개 조각`
          : '📂 PDF 또는 TXT 파일을 드래그하거나 클릭하세요'}
      </div>

      <div className="chat">
        {!doc && !uploading && (
          <div className="empty">문서를 업로드하면 AI와 대화할 수 있습니다</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <pre>{m.text}</pre>
          </div>
        ))}
        {thinking && (
          <div className="bubble ai">
            <span className="thinking">생각 중...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={doc ? '질문을 입력하세요...' : '먼저 문서를 업로드하세요'}
          disabled={!doc || thinking}
        />
        <button
          className="btn btn-accent"
          onClick={send}
          disabled={!doc || thinking || !input.trim()}
        >
          전송
        </button>
      </div>
    </div>
  )
}

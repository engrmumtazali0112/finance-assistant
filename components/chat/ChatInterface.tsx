'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Loader, User, Bot, X, CheckCircle } from 'lucide-react'
import { ChatMessage } from '@/types'

const SUGGESTIONS = [
  'How much did I spend on food last month?',
  'What are my recurring subscriptions?',
  'Am I over budget anywhere?',
  'What was my biggest purchase this month?',
  'Summarize my finances',
  'Any unusual charges recently?',
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your finance assistant. Ask me anything about your spending, upload a receipt, or set a budget. I can see your transaction history and remember your preferences.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (messageText?: string) => {
    const text = messageText ?? input.trim()
    if (!text && !pendingFile) return

    // Handle file upload first
    if (pendingFile) {
      setLoading(true)
      const isCSV = pendingFile.name.endsWith('.csv') || pendingFile.type === 'text/csv'
      const fd = new FormData()
      fd.append('file', pendingFile)

      const userMsg: ChatMessage = {
        role: 'user',
        content: `[Uploaded: ${pendingFile.name}]${text ? `\n${text}` : ''}`,
      }
      setMessages(prev => [...prev, userMsg])
      setPendingFile(null)
      setInput('')

      try {
        const endpoint = isCSV ? '/api/transactions' : '/api/upload'
        const res = await fetch(endpoint, { method: 'POST', body: fd })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error ?? 'Upload failed')

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: data.message ?? 'File processed successfully.',
        }
        setMessages(prev => [...prev, assistantMsg])

        // If there was also a text message, send it
        if (text) {
          await sendTextMessage(text, [...messages, userMsg, assistantMsg])
        }
      } catch (e: unknown) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I couldn't process that file: ${e instanceof Error ? e.message : 'unknown error'}`,
        }])
      }
      setLoading(false)
      return
    }

    // Text-only message
    setInput('')
    await sendTextMessage(text, messages)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, pendingFile, messages])

  async function sendTextMessage(text: string, history: ChatMessage[]) {
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newHistory = [...history, userMsg]
    setMessages(newHistory)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.slice(-10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (e: unknown) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I ran into an issue: ${e instanceof Error ? e.message : 'please try again'}`,
      }])
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function handleFileSelect(file: File) {
    setPendingFile(file)
    setUploadStatus(null)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        {pendingFile && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4 text-indigo-500" />
            <span className="text-indigo-700 dark:text-indigo-300 truncate">{pendingFile.name}</span>
            <button onClick={() => setPendingFile(null)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Upload CSV or receipt image"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your spending, or upload a receipt…"
            rows={1}
            className="flex-1 resize-none bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
            style={{ minHeight: '44px' }}
          />

          <button
            onClick={() => send()}
            disabled={loading || (!input.trim() && !pendingFile)}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {uploadStatus && (
          <p className="text-xs text-center mt-2 text-slate-400">{uploadStatus}</p>
        )}
      </div>
    </div>
  )
}

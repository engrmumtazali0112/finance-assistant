'use client'
import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function QuickUpload() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(file: File) {
    setStatus('loading')
    const fd = new FormData()
    fd.append('file', file)

    const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv'
    const endpoint = isCSV ? '/api/transactions' : '/api/upload'

    try {
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setStatus('success')
      setMessage(data.message ?? 'Uploaded successfully')
      setTimeout(() => { setStatus('idle'); router.refresh() }, 3000)
    } catch (e: unknown) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Upload failed')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const icons = {
    idle: <Upload className="w-4 h-4" />,
    loading: <Loader className="w-4 h-4 animate-spin" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === 'loading'}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
      >
        {icons[status]}
        {status === 'idle' ? 'Import CSV / Receipt' : status === 'loading' ? 'Uploading…' : message.slice(0, 30)}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500 mt-1 max-w-xs">{message}</p>
      )}
    </div>
  )
}

import ChatInterface from '@/components/chat/ChatInterface'

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Ask your assistant</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ask questions about your spending, upload receipts, or set budgets</p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  )
}

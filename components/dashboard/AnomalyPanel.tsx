'use client'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { AnomalyResult } from '@/types'

interface Props {
  anomalies: AnomalyResult[]
  subscriptions: { name: string; amount: number; occurrences: number; lastSeen: string }[]
}

export default function AnomalyPanel({ anomalies, subscriptions }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {anomalies.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Unusual activity</h2>
          </div>
          <div className="space-y-3">
            {anomalies.map((a, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium text-slate-800 dark:text-slate-200">{a.transaction.description}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recurring charges</h2>
          </div>
          <div className="space-y-2.5">
            {subscriptions.slice(0, 6).map((s, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-slate-700 dark:text-slate-300 capitalize">{s.name}</span>
                <span className="font-medium text-slate-900 dark:text-white">${s.amount.toFixed(2)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

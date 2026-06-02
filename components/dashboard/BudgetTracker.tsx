'use client'
import { Budget } from '@/types'

interface Props {
  budgets: Budget[]
  summary: { byCategory: Record<string, number> }
}

export default function BudgetTracker({ budgets, summary }: Props) {
  if (budgets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Budgets</h2>
        <p className="text-sm text-slate-400">No budgets set. Tell the assistant "Set a $500 budget for Food".</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Budgets</h2>
      <div className="space-y-4">
        {budgets.map((budget) => {
          const spent = summary.byCategory[budget.category] ?? 0
          const pct = Math.min((spent / budget.limit_amount) * 100, 100)
          const over = spent > budget.limit_amount
          return (
            <div key={budget.id}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">{budget.category}</span>
                <span className={over ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                  ${spent.toFixed(0)} / ${budget.limit_amount.toFixed(0)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    over ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {over && (
                <p className="text-xs text-red-500 mt-1">
                  ${(spent - budget.limit_amount).toFixed(0)} over budget
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

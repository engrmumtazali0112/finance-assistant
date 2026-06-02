'use client'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react'

interface Props {
  summary: {
    totalThisMonth: number
    avgMonthly: number
    topCategories: [string, number][]
  }
}

export default function OverviewCards({ summary }: Props) {
  const diff = summary.totalThisMonth - summary.avgMonthly
  const pct = summary.avgMonthly > 0 ? ((diff / summary.avgMonthly) * 100).toFixed(1) : '0'
  const overBudget = diff > 0

  const cards = [
    {
      label: 'Spent this month',
      value: `$${summary.totalThisMonth.toFixed(2)}`,
      sub: 'current month total',
      icon: DollarSign,
      color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'vs. monthly average',
      value: `${overBudget ? '+' : ''}${pct}%`,
      sub: `avg $${summary.avgMonthly.toFixed(2)}/mo`,
      icon: overBudget ? TrendingUp : TrendingDown,
      color: overBudget
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    },
    {
      label: 'Top category',
      value: summary.topCategories[0]?.[0] ?? '—',
      sub: summary.topCategories[0] ? `$${summary.topCategories[0][1].toFixed(2)}` : 'no data',
      icon: AlertTriangle,
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 flex items-start gap-4"
        >
          <div className={`p-2.5 rounded-lg ${card.color}`}>
            <card.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MonthlyAggregate } from '@/types'

interface Props {
  aggregates: MonthlyAggregate[]
}

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa']

export default function SpendingChart({ aggregates }: Props) {
  // Pivot: group by month, categories as keys
  const byMonth: Record<string, Record<string, number>> = {}
  const categorySet = new Set<string>()

  for (const agg of aggregates) {
    const key = `${agg.year}-${String(agg.month).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = {}
    byMonth[key][agg.category] = agg.total
    categorySet.add(agg.category)
  }

  const data = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cats]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      ...cats,
    }))

  const categories = Array.from(categorySet).slice(0, 6)

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Spending by month</h2>
        <div className="h-48 flex items-center justify-center text-slate-400">
          <p>No transaction data yet. Import a CSV to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Spending by month</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
          <Legend />
          {categories.map((cat, i) => (
            <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

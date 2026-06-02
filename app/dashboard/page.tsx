import { auth } from '@clerk/nextjs/server'
import { getSpendingSummary, getBudgets, detectAnomalies, detectRecurringSubscriptions } from '@/lib/db/queries'
import OverviewCards from '@/components/dashboard/OverviewCards'
import SpendingChart from '@/components/dashboard/SpendingChart'
import BudgetTracker from '@/components/dashboard/BudgetTracker'
import AnomalyPanel from '@/components/dashboard/AnomalyPanel'
import QuickUpload from '@/components/dashboard/QuickUpload'
import { getMonthlyAggregates } from '@/lib/db/queries'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return null

  const [summary, budgets, anomalies, subscriptions, aggregates] = await Promise.all([
    getSpendingSummary(userId),
    getBudgets(userId),
    detectAnomalies(userId),
    detectRecurringSubscriptions(userId),
    getMonthlyAggregates(userId, 6),
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <QuickUpload />
      </div>

      <OverviewCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpendingChart aggregates={aggregates} />
        </div>
        <div className="space-y-4">
          <BudgetTracker budgets={budgets} summary={summary} />
        </div>
      </div>

      {(anomalies.length > 0 || subscriptions.length > 0) && (
        <AnomalyPanel anomalies={anomalies} subscriptions={subscriptions} />
      )}
    </div>
  )
}

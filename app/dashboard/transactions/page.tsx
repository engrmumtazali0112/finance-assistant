import { auth } from '@clerk/nextjs/server'
import { getRecentTransactions } from '@/lib/db/queries'
import QuickUpload from '@/components/dashboard/QuickUpload'

export default async function TransactionsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const transactions = await getRecentTransactions(userId, 100)

  const categoryColors: Record<string, string> = {
    Food: 'bg-orange-100 text-orange-700',
    Transport: 'bg-blue-100 text-blue-700',
    Shopping: 'bg-purple-100 text-purple-700',
    Healthcare: 'bg-green-100 text-green-700',
    Entertainment: 'bg-pink-100 text-pink-700',
    Utilities: 'bg-slate-100 text-slate-700',
    Other: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">{transactions.length} most recent</p>
        </div>
        <QuickUpload />
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg">No transactions yet</p>
          <p className="text-sm mt-2">Import a CSV file to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                    <div className="font-medium">{tx.description}</div>
                    {tx.merchant && tx.merchant !== tx.description && (
                      <div className="text-xs text-slate-400">{tx.merchant}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[tx.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono text-right font-medium ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

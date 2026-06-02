import { supabaseAdmin } from './client'
import { Transaction, MonthlyAggregate, Budget, UserContext, AnomalyResult } from '@/types'

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getRecentTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getTransactionsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<Transaction[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTransactionsByCategory(
  userId: string,
  category: string,
  months = 3
): Promise<Transaction[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .ilike('category', `%${category}%`)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert(tx)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function bulkInsertTransactions(txs: Omit<Transaction, 'id' | 'created_at'>[]): Promise<number> {
  // Deduplicate by (user_id, date, description, amount)
  const { data: existing } = await supabaseAdmin
    .from('transactions')
    .select('date, description, amount')
    .eq('user_id', txs[0]?.user_id)

  const existingSet = new Set(
    (existing ?? []).map(t => `${t.date}|${t.description}|${t.amount}`)
  )
  const deduped = txs.filter(
    t => !existingSet.has(`${t.date}|${t.description}|${t.amount}`)
  )
  if (deduped.length === 0) return 0

  const { error } = await supabaseAdmin.from('transactions').insert(deduped)
  if (error) throw error
  return deduped.length
}

// ── Aggregates ────────────────────────────────────────────────────────────────

export async function getMonthlyAggregates(
  userId: string,
  months = 12
): Promise<MonthlyAggregate[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const { data, error } = await supabaseAdmin
    .from('monthly_aggregates')
    .select('*')
    .eq('user_id', userId)
    .gte('year', since.getFullYear())
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function refreshAggregates(userId: string): Promise<void> {
  await supabaseAdmin.rpc('refresh_monthly_aggregates', { p_user_id: userId })
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

export async function detectAnomalies(userId: string): Promise<AnomalyResult[]> {
  const aggs = await getMonthlyAggregates(userId, 12)
  const current = await getTransactionsByMonth(
    userId,
    new Date().getFullYear(),
    new Date().getMonth() + 1
  )

  // Group historical by category
  const histByCategory: Record<string, number[]> = {}
  for (const agg of aggs) {
    if (!histByCategory[agg.category]) histByCategory[agg.category] = []
    histByCategory[agg.category].push(agg.total)
  }

  const results: AnomalyResult[] = []

  for (const tx of current) {
    const history = histByCategory[tx.category] ?? []
    if (history.length < 3) continue

    const mean = history.reduce((a, b) => a + b, 0) / history.length
    const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length
    const stddev = Math.sqrt(variance)
    if (stddev === 0) continue

    const zscore = Math.abs((tx.amount - mean) / stddev)
    if (zscore > 2) {
      results.push({
        transaction: tx,
        zscore,
        mean,
        stddev,
        message: `${tx.description} (${tx.category}) is ${zscore.toFixed(1)}σ above your usual spending in this category`,
      })
    }
  }

  return results.sort((a, b) => b.zscore - a.zscore).slice(0, 5)
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function detectRecurringSubscriptions(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('description, amount, date')
    .eq('user_id', userId)
    .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) throw error

  // Group by (description, amount) — same merchant + same amount = subscription candidate
  const groups: Record<string, { count: number; dates: string[]; amount: number }> = {}
  for (const tx of data ?? []) {
    const key = `${tx.description.toLowerCase().trim()}|${Math.abs(tx.amount)}`
    if (!groups[key]) groups[key] = { count: 0, dates: [], amount: Math.abs(tx.amount) }
    groups[key].count++
    groups[key].dates.push(tx.date)
  }

  return Object.entries(groups)
    .filter(([, v]) => v.count >= 2)
    .map(([key, v]) => ({
      name: key.split('|')[0],
      amount: v.amount,
      occurrences: v.count,
      lastSeen: v.dates[0],
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function getBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabaseAdmin
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function upsertBudget(budget: Omit<Budget, 'id' | 'created_at'>): Promise<Budget> {
  const { data, error } = await supabaseAdmin
    .from('budgets')
    .upsert(budget, { onConflict: 'user_id,category' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── User context ──────────────────────────────────────────────────────────────

export async function getUserContext(userId: string): Promise<UserContext[]> {
  const { data, error } = await supabaseAdmin
    .from('user_context')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function upsertUserContext(userId: string, key: string, value: string): Promise<void> {
  await supabaseAdmin
    .from('user_context')
    .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, {
      onConflict: 'user_id,key',
    })
}

// ── Spending summary ──────────────────────────────────────────────────────────

export async function getSpendingSummary(userId: string) {
  const now = new Date()
  const [thisMonth, aggs] = await Promise.all([
    getTransactionsByMonth(userId, now.getFullYear(), now.getMonth() + 1),
    getMonthlyAggregates(userId, 12),
  ])

  const byCategory: Record<string, number> = {}
  for (const tx of thisMonth) {
    byCategory[tx.category] = (byCategory[tx.category] ?? 0) + Math.abs(tx.amount)
  }

  const totalThisMonth = Object.values(byCategory).reduce((a, b) => a + b, 0)
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Compare to avg of last 3 months
  const last3 = aggs.slice(0, 15) // rough slice
  const avgMonthly =
    last3.length > 0
      ? last3.reduce((a, b) => a + b.total, 0) / Math.max(last3.length / 5, 1)
      : 0

  return { totalThisMonth, topCategories, avgMonthly, byCategory }
}

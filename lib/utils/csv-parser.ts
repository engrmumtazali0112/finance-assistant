import Papa from 'papaparse'
import { Transaction } from '@/types'

type RawRow = Record<string, string>

const CATEGORY_MAP: Record<string, string> = {
  grocery: 'Food',
  groceries: 'Food',
  supermarket: 'Food',
  restaurant: 'Food',
  cafe: 'Food',
  coffee: 'Food',
  uber: 'Transport',
  lyft: 'Transport',
  gas: 'Transport',
  fuel: 'Transport',
  netflix: 'Entertainment',
  spotify: 'Entertainment',
  amazon: 'Shopping',
  walmart: 'Shopping',
  pharmacy: 'Healthcare',
  hospital: 'Healthcare',
  electric: 'Utilities',
  water: 'Utilities',
  internet: 'Utilities',
}

function guessCategory(description: string): string {
  const lower = description.toLowerCase()
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category
  }
  return 'Other'
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.\-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(raw: string): string {
  // Try common formats: MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const parts = raw.trim().split(/[\/\-\.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (c.length === 4) {
      // MM/DD/YYYY or DD/MM/YYYY → assume MM/DD/YYYY
      const d = new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    if (a.length === 4) {
      // YYYY-MM-DD
      const d = new Date(raw.trim())
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
  }
  // Fallback
  const d = new Date(raw)
  return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0]
}

function normalizeHeaders(row: RawRow): {
  date?: string; description?: string; amount?: string; category?: string; merchant?: string
} {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]))

  const date = lower.date ?? lower.transaction_date ?? lower.txn_date ?? lower['transaction date']
  const description = lower.description ?? lower.memo ?? lower.name ?? lower.merchant ?? lower.details
  const amount = lower.amount ?? lower.debit ?? lower.credit ?? lower.sum ?? lower.value
  const category = lower.category ?? lower.type ?? lower.tag
  const merchant = lower.merchant ?? lower.payee ?? lower.vendor

  return { date, description, amount, category, merchant }
}

export function parseTransactionCSV(
  csvText: string,
  userId: string
): { transactions: Omit<Transaction, 'id' | 'created_at'>[]; errors: string[] } {
  const errors: string[] = []
  const transactions: Omit<Transaction, 'id' | 'created_at'>[] = []

  const result = Papa.parse<RawRow>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  for (let i = 0; i < result.data.length; i++) {
    const raw = result.data[i]
    const { date, description, amount, category, merchant } = normalizeHeaders(raw)

    if (!date || !amount) {
      errors.push(`Row ${i + 2}: missing date or amount — skipped`)
      continue
    }

    const parsedAmount = parseAmount(amount)
    if (parsedAmount === 0 && amount !== '0') {
      errors.push(`Row ${i + 2}: invalid amount "${amount}" — skipped`)
      continue
    }

    const parsedDate = parseDate(date)
    const desc = description?.trim() || merchant?.trim() || 'Unknown'

    transactions.push({
      user_id: userId,
      date: parsedDate,
      description: desc,
      amount: parsedAmount,
      category: category?.trim() || guessCategory(desc),
      merchant: merchant?.trim(),
      source: 'csv',
    })
  }

  return { transactions, errors }
}

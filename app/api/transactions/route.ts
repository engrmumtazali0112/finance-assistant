import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { bulkInsertTransactions, getRecentTransactions, refreshAggregates } from '@/lib/db/queries'
import { parseTransactionCSV } from '@/lib/utils/csv-parser'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50')
  const transactions = await getRecentTransactions(userId, Math.min(limit, 200))
  return NextResponse.json({ transactions })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return NextResponse.json({ error: 'Only CSV files are accepted' }, { status: 400 })
  }

  const text = await file.text()
  const { transactions, errors } = parseTransactionCSV(text, userId)

  if (transactions.length === 0) {
    return NextResponse.json({
      error: 'No valid transactions found in CSV',
      errors,
    }, { status: 422 })
  }

  const inserted = await bulkInsertTransactions(transactions)

  // Refresh materialized aggregates in background (non-blocking)
  refreshAggregates(userId).catch(console.error)

  return NextResponse.json({
    inserted,
    skippedDuplicates: transactions.length - inserted,
    errors: errors.slice(0, 10), // cap error list
    message: `Imported ${inserted} transactions${errors.length > 0 ? ` (${errors.length} rows had issues)` : ''}`,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getBudgets, upsertBudget } from '@/lib/db/queries'
import { z } from 'zod'

const BudgetSchema = z.object({
  category: z.string().min(1),
  limit_amount: z.number().positive(),
  period: z.enum(['monthly', 'weekly']).default('monthly'),
})

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const budgets = await getBudgets(userId)
  return NextResponse.json({ budgets })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = BudgetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const budget = await upsertBudget({ user_id: userId, ...parsed.data })
  return NextResponse.json({ budget })
}

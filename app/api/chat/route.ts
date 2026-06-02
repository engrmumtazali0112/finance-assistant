import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  classifyIntent,
  fastQuery,
  agentQuery,
  buildFinancialContext,
  extractUserContext,
} from '@/lib/ai/orchestrator'
import {
  getRecentTransactions,
  getBudgets,
  getUserContext,
  upsertUserContext,
  getSpendingSummary,
  detectAnomalies,
  detectRecurringSubscriptions,
} from '@/lib/db/queries'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { message, history = [] } = body

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  try {
    // 1. Extract and save any user preferences mentioned
    const newContext = await extractUserContext(message)
    if (newContext) {
      await upsertUserContext(userId, newContext.key, newContext.value)
    }

    // 2. Classify intent (fast, rule-based first)
    const intent = await classifyIntent(message, false)

    // 3. Load data in parallel — only what we need
    const [summary, recentTxns, budgets, userCtx, anomalies, subscriptions] = await Promise.all([
      getSpendingSummary(userId),
      getRecentTransactions(userId, 30),
      getBudgets(userId),
      getUserContext(userId),
      intent.intent === 'anomaly' ? detectAnomalies(userId) : Promise.resolve([]),
      intent.intent === 'simple_query' ? detectRecurringSubscriptions(userId) : Promise.resolve([]),
    ])

    // 4. Build compact context string
    const financialContext = buildFinancialContext({
      summary,
      recentTransactions: recentTxns,
      budgets,
      userContextItems: userCtx,
      anomalies,
      subscriptions,
    })

    // 5. Route to fast (haiku) or agent (sonnet) path
    let response: string
    if (intent.requiresAgent) {
      response = await agentQuery(message, financialContext, history)
    } else {
      response = await fastQuery(message, financialContext, history)
    }

    return NextResponse.json({ response, intent: intent.intent })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

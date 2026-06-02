import Anthropic from '@anthropic-ai/sdk'
import { IntentClassification, ChatMessage } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Intent classification (fast, cheap — haiku) ───────────────────────────────

export async function classifyIntent(
  userMessage: string,
  hasImage: boolean
): Promise<IntentClassification> {
  if (hasImage) {
    return { intent: 'receipt_ocr', requiresAgent: true }
  }

  const msg = userMessage.toLowerCase()

  // Rule-based fast classification before hitting the API
  if (/subscri|recurring|repeat/.test(msg))
    return { intent: 'simple_query', requiresAgent: false }
  if (/budget|limit|track/.test(msg))
    return { intent: 'budget_check', requiresAgent: false }
  if (/unusual|weird|strange|anomal/.test(msg))
    return { intent: 'anomaly', requiresAgent: false }
  if (/what is|who is|look up|find out/.test(msg))
    return { intent: 'web_lookup', requiresAgent: true }
  if (/compare|vs|more than usual|last month|trend/.test(msg))
    return { intent: 'comparison', timeRange: 'historical', requiresAgent: false }
  if (/summar|overview|breakdown/.test(msg))
    return { intent: 'summary', requiresAgent: false }
  if (/cut back|save|suggest|recommend/.test(msg))
    return { intent: 'suggestion', requiresAgent: false }

  // Default: simple aggregation query
  return { intent: 'aggregation', timeRange: 'recent', requiresAgent: false }
}

// ── Fast path: simple queries with haiku ─────────────────────────────────────

export async function fastQuery(
  userMessage: string,
  context: string,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    ...history.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system: `You are a personal finance assistant. Be concise and friendly. Answer in 1-3 sentences unless a list/table is needed.
    
Current user financial context:
${context}

Rules:
- Use actual numbers from the context
- If data is insufficient, say so clearly
- Format currency as PKR X,XXX or $ X,XXX depending on context
- Never make up numbers`,
    messages,
  })

  return response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process that.'
}

// ── Receipt OCR ───────────────────────────────────────────────────────────────

export async function extractReceiptData(
  imageBase64: string,
  mediaType: string
): Promise<{ merchant: string; amount: number; date: string; category: string; items: string[] } | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: imageBase64 },
            },
            {
              type: 'text',
              text: `Extract receipt data. Return ONLY valid JSON with keys: merchant (string), amount (number, total), date (YYYY-MM-DD or today if unclear), category (one of: Food, Shopping, Transport, Healthcare, Entertainment, Utilities, Other), items (array of strings). If this is not a receipt, return null.`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

// ── Agent path: complex queries with sonnet + tools ──────────────────────────

export async function agentQuery(
  userMessage: string,
  context: string,
  history: ChatMessage[],
  onChunk?: (text: string) => void
): Promise<string> {
  const tools: Anthropic.Tool[] = [
    {
      name: 'search_merchant',
      description: 'Look up what a merchant or company does when the user does not recognize a charge',
      input_schema: {
        type: 'object' as const,
        properties: {
          merchant_name: { type: 'string', description: 'The merchant name to look up' },
        },
        required: ['merchant_name'],
      },
    },
    {
      name: 'get_spending_breakdown',
      description: 'Get detailed spending breakdown for a category or time period from the database',
      input_schema: {
        type: 'object' as const,
        properties: {
          category: { type: 'string', description: 'Spending category (optional)' },
          months_back: { type: 'number', description: 'How many months back to look (default 3)' },
        },
        required: [],
      },
    },
  ]

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  let fullResponse = ''
  let currentMessages = [...messages]

  // Agentic loop — max 3 tool calls
  for (let i = 0; i < 3; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are a personal finance assistant with access to tools. Be helpful, specific, and use real numbers.

User's financial context:
${context}`,
      tools,
      messages: currentMessages,
    })

    const textBlocks = response.content.filter(b => b.type === 'text')
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

    for (const block of textBlocks) {
      if (block.type === 'text') {
        fullResponse += block.text
        onChunk?.(block.text)
      }
    }

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) break

    // Execute tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      if (toolUse.type !== 'tool_use') continue
      let result = ''

      if (toolUse.name === 'search_merchant') {
        const input = toolUse.input as { merchant_name: string }
        result = await searchMerchant(input.merchant_name)
      } else if (toolUse.name === 'get_spending_breakdown') {
        result = `Spending data available in context above. Please analyze from there.`
      }

      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result })
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ]
  }

  return fullResponse || 'I was unable to complete that request. Please try again.'
}

// ── Merchant web search ───────────────────────────────────────────────────────

async function searchMerchant(merchantName: string): Promise<string> {
  // Use Tavily if key is available, otherwise graceful fallback
  const tavilyKey = process.env.TAVILY_API_KEY
  if (!tavilyKey) {
    return `${merchantName} appears to be a merchant. Without web search configured, I cannot provide more details.`
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `What is ${merchantName} company service`,
        search_depth: 'basic',
        max_results: 3,
      }),
    })
    const data = await res.json()
    const results = (data.results ?? []).slice(0, 2)
    return results.map((r: { title: string; content: string }) => `${r.title}: ${r.content}`).join('\n')
  } catch {
    return `Could not fetch information about ${merchantName} at this time.`
  }
}

// ── Context builder ───────────────────────────────────────────────────────────
// Builds a compact text summary of user's finances to pass to the LLM
// This avoids sending raw transaction rows and keeps token usage low

export function buildFinancialContext(opts: {
  summary: { totalThisMonth: number; topCategories: [string, number][]; avgMonthly: number }
  recentTransactions: { date: string; description: string; amount: number; category: string }[]
  budgets: { category: string; limit_amount: number }[]
  userContextItems: { key: string; value: string }[]
  anomalies?: { message: string }[]
  subscriptions?: { name: string; amount: number; occurrences: number }[]
}): string {
  const { summary, recentTransactions, budgets, userContextItems, anomalies, subscriptions } = opts

  const lines: string[] = []
  lines.push(`## This month's spending`)
  lines.push(`Total: $${summary.totalThisMonth.toFixed(2)} (avg last 12mo: $${summary.avgMonthly.toFixed(2)})`)
  lines.push(`Top categories: ${summary.topCategories.map(([c, a]) => `${c} $${a.toFixed(2)}`).join(', ')}`)

  if (budgets.length > 0) {
    lines.push(`\n## Budgets`)
    for (const b of budgets) {
      const spent = summary.topCategories.find(([c]) => c === b.category)?.[1] ?? 0
      const pct = ((spent / b.limit_amount) * 100).toFixed(0)
      lines.push(`${b.category}: $${spent.toFixed(2)} / $${b.limit_amount} (${pct}%)`)
    }
  }

  if (userContextItems.length > 0) {
    lines.push(`\n## User preferences & context`)
    for (const c of userContextItems) {
      lines.push(`${c.key}: ${c.value}`)
    }
  }

  if (anomalies && anomalies.length > 0) {
    lines.push(`\n## Unusual activity`)
    anomalies.forEach(a => lines.push(`- ${a.message}`))
  }

  if (subscriptions && subscriptions.length > 0) {
    lines.push(`\n## Recurring subscriptions detected`)
    subscriptions.slice(0, 5).forEach(s =>
      lines.push(`- ${s.name}: $${s.amount}/mo (seen ${s.occurrences}x)`)
    )
  }

  lines.push(`\n## Recent transactions (last 20)`)
  recentTransactions.slice(0, 20).forEach(t => {
    lines.push(`${t.date} | ${t.description} | $${Math.abs(t.amount).toFixed(2)} | ${t.category}`)
  })

  return lines.join('\n')
}

// ── Memory extraction ─────────────────────────────────────────────────────────
// Detects if the user stated a preference or fact about themselves

export async function extractUserContext(message: string): Promise<{ key: string; value: string } | null> {
  const patterns = [
    { regex: /i get paid on the (\w+)/i, key: 'payday', extract: (m: RegExpMatchArray) => m[1] },
    { regex: /my salary is \$?([\d,]+)/i, key: 'salary', extract: (m: RegExpMatchArray) => m[1] },
    { regex: /don'?t count (.+?) in my (.+?) budget/i, key: 'budget_exclusion', extract: (m: RegExpMatchArray) => `exclude ${m[1]} from ${m[2]}` },
    { regex: /my name is (\w+)/i, key: 'name', extract: (m: RegExpMatchArray) => m[1] },
    { regex: /i (live|am) in (.+)/i, key: 'location', extract: (m: RegExpMatchArray) => m[2] },
    { regex: /my (?:monthly )?income is \$?([\d,]+)/i, key: 'monthly_income', extract: (m: RegExpMatchArray) => m[1] },
  ]

  for (const { regex, key, extract } of patterns) {
    const match = message.match(regex)
    if (match) return { key, value: extract(match) }
  }

  return null
}

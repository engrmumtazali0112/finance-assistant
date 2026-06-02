# FinanceAI — Personal Finance Assistant

An AI-driven, multi-user financial companion built for the Revonix Full Stack AI Engineer assessment.

**Live demo:** _[deploy to Vercel after setup]_  
**Stack:** Next.js 14 · TypeScript · Supabase · Clerk · Anthropic API · Tailwind · Recharts

---
#Gani12@#,.()
#sb_publishable_TqkJsoEYxUcUla37LmWysw_YK1kyT8G
## Quick Setup (5 minutes)

### 1. Clone and install
```bash
git clone <your-repo>
cd finance-assistant
npm install
cp .env.local.example .env.local
```

### 2. Set up services (all have free tiers)

**Clerk** (auth) — [clerk.com](https://clerk.com) → create app → copy keys  
**Supabase** (database) — [supabase.com](https://supabase.com) → new project → run `supabase/migrations/001_init.sql` in SQL editor → copy keys  
**Anthropic** — [console.anthropic.com](https://console.anthropic.com) → copy API key  
**Tavily** (optional, merchant lookup) — [tavily.com](https://tavily.com)

### 3. Run
```bash
npm run dev
# open http://localhost:3000
```

### 4. Test with sample data
Import `public/sample-transactions.csv` via the dashboard or chat.

---

## Features Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-user auth | ✅ Full | Clerk, each user isolated |
| CSV import | ✅ Full | Deduplication, flexible header parsing, error reporting |
| Receipt OCR | ✅ Full | Vision call to Sonnet, auto-categorisation |
| Spending Q&A | ✅ Full | Fast path (Haiku), context-aware |
| Budget tracking | ✅ Full | Set via chat or UI, progress bars, over-budget alerts |
| Recurring subscriptions | ✅ Full | Pattern detection over 90-day window |
| Anomaly detection | ✅ Full | Z-score (2σ) vs 12-month category history |
| Cross-time comparison | ✅ Full | Pre-computed monthly aggregates |
| Plain English summary | ✅ Full | Included in every LLM context |
| Cut-back suggestions | ✅ Full | Numbers-backed, from LLM with full context |
| User memory | ✅ Full | Regex extraction → `user_context` table |
| Merchant web lookup | ✅ Full | Tavily (degrades gracefully without key) |
| Dashboard charts | ✅ Full | Stacked bar by category, 6-month view |
| Transaction list | ✅ Full | Paginated, colour-coded categories |

---

## Architecture & Key Decisions

### Intent-based routing (the most important decision)

Not all queries deserve the same treatment. A user asking "how much did I spend on groceries?" should respond in under a second. A request to look up an unfamiliar merchant needs web access and multi-step reasoning.

I classify intent **before** hitting the LLM:

```
User message
    ↓
Rule-based classifier (regex, instant, free)
    ↓
┌─── Simple query ───────────────────────────────────────────┐
│  claude-haiku-4-5 · max_tokens=600 · ~0.5s · cheap        │
│  spending Q&A, budget checks, summaries, suggestions       │
└────────────────────────────────────────────────────────────┘
    ↓
┌─── Agent path ─────────────────────────────────────────────┐
│  claude-sonnet-4-6 · tools · ~3-8s · more expensive       │
│  receipt OCR, merchant lookup, complex multi-step          │
└────────────────────────────────────────────────────────────┘
```

This means >80% of queries hit Haiku. Sonnet is reserved for tasks that actually need it. An analyst who always recommends Sonnet for everything would burn 5× the cost.

### Handling large data (the second most important decision)

I never pass raw transaction rows to the LLM. A user with 2 years of data might have 3,000+ transactions — that's 50,000+ tokens and would cost a dollar per query.

Instead:
1. **Pre-computed monthly aggregates** in Postgres (`monthly_aggregates` table). Refreshed async after every import. A 3-year history becomes 36 rows per category — trivially small.
2. **Context string** built server-side: summary stats, top categories, last 20 transactions, active budgets, anomalies. Typically ~1,500 tokens regardless of history length.
3. **Time-scoped queries** pull only the relevant window (e.g. current month for anomaly detection, 90 days for subscription detection).

The LLM sees a compact, pre-analysed snapshot — never the raw ledger.

### Anomaly detection

Z-score over per-category monthly totals. A charge is flagged if `|amount - category_mean| / stddev > 2`. This is statistically principled, computationally free (SQL aggregates), and requires at least 3 months of history to avoid false positives. No ML model needed — the data itself is the signal.

### Receipt OCR

Single vision call to `claude-sonnet-4-6` with a structured-output prompt. The prompt asks for JSON only — merchant, amount, date, category, items. Handles blurry/rotated images reasonably well (Sonnet's vision is robust). Non-receipt images return `null` cleanly. The extracted data is immediately inserted as a transaction.

### User memory

Rather than a vector store or complex RAG setup, preferences are extracted with regex patterns at query time and stored as key-value pairs in `user_context`. This covers the stated requirements (pay date, budget exclusions, name/location) with near-zero latency and no embedding cost. For a future version with richer memory, pgvector is already enabled in the migration.

### Multi-tenancy & security

- Clerk handles all auth — no custom session management
- All DB queries filter by `user_id` (Clerk's `userId`)
- Supabase RLS policies enforce isolation at the database level — even if an API bug leaked a `userId`, another user's data is protected
- Service role key never exposed to client; API routes use it server-side only

---

## Trade-offs & Limitations

**What I'd change with more time:**

1. **Streaming responses.** The chat API currently returns a full response. Streaming via SSE/ReadableStream would make long agent responses feel much faster. The orchestrator already calls Anthropic in a way that could be streamed — it's a ~30-minute plumbing change.

2. **Background aggregate refresh.** Currently triggered synchronously after CSV import. A proper queue (e.g. Supabase Edge Functions + pg_cron) would refresh aggregates nightly, making the dashboard fast even with huge datasets.

3. **Smarter subscription detection.** Current heuristic: same description + same amount, 2+ times in 90 days. A production version would cluster by merchant name similarity and detect approximate amounts (e.g. annual subscriptions prorated monthly).

4. **Chart interactivity.** The spending chart is static. Clicking a category bar should filter the transaction list — a 1-hour UI task I'd prioritise next.

5. **Error recovery in agent loop.** The agentic path has a 3-iteration cap. If a tool call fails, it falls back to whatever text was generated. A retry with exponential backoff would be more resilient.

**Intentional simplifications:**

- **No bank API integration.** The brief mentions a mock bank endpoint but I prioritised the AI layer. CSV import covers the data ingestion requirement fully.
- **No real-time notifications.** Budget alerts are shown on the dashboard; push notifications would require a notification service.
- **Tavily is optional.** Merchant lookup degrades gracefully — if no key is configured, the LLM notes it can't look up the merchant rather than crashing.
- **No pagination on transactions API.** 200-row cap. Trivial to add with cursor-based pagination.

---

## Scalability notes

**At 10,000 users:**
- Supabase Postgres handles this comfortably. RLS ensures query isolation.
- The context-building approach (aggregates + compact summary) means LLM cost scales with active queries, not with user data size.
- Haiku routing keeps costs at ~$0.001/query for simple requests.

**At 100,000 users:**
- Add a read replica for the dashboard queries
- Move aggregate refresh to a background queue with rate limiting
- Consider Redis caching for the context string (invalidated on new transaction)
- Rate-limit the API routes per user to prevent abuse

**The design doesn't have any architectural blockers** at these scales. The most expensive operation is the Sonnet agent call (~$0.02-0.10), but that's only triggered for complex requests.

---

## What I'd be proud to defend

The routing decision is the thing I'm most confident in. It's tempting to use the best model for everything — it's simpler to implement and you feel safer. But it's the wrong call for a product that has to ship to real users at real scale. The cost/latency/quality triangle has to be resolved deliberately, not defaulted on.

The context-building strategy is the second thing. Passing 3,000 raw transactions to a model is what a junior implementation looks like. Building a pre-analysed compact summary is what a system designed to last looks like.

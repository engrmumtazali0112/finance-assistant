export interface Transaction {
  id: string
  user_id: string
  date: string
  description: string
  amount: number
  category: string
  merchant?: string
  source: 'csv' | 'receipt' | 'manual'
  created_at: string
}

export interface MonthlyAggregate {
  user_id: string
  year: number
  month: number
  category: string
  total: number
  count: number
  avg: number
}

export interface Budget {
  id: string
  user_id: string
  category: string
  limit_amount: number
  period: 'monthly' | 'weekly'
  created_at: string
}

export interface UserContext {
  id: string
  user_id: string
  key: string
  value: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface IntentClassification {
  intent: 'simple_query' | 'aggregation' | 'anomaly' | 'receipt_ocr' | 'web_lookup' | 'budget_check' | 'comparison' | 'suggestion' | 'summary'
  timeRange?: 'recent' | 'monthly' | 'historical'
  category?: string
  requiresAgent: boolean
}

export interface AnomalyResult {
  transaction: Transaction
  zscore: number
  mean: number
  stddev: number
  message: string
}

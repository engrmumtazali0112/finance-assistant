import { supabaseAdmin } from "./client";

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  merchant?: string;
  source: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  period: string;
  created_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  key: string;
  value: string;
  updated_at: string;
}

// Get recent transactions
export async function getRecentTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  if (!supabaseAdmin) return [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Supabase error:", error);
    return [];
  }
}

// Get monthly aggregates
export async function getMonthlyAggregates(userId: string, months = 12) {
  if (!supabaseAdmin) return [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from("monthly_aggregates")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    return [];
  }
}

// Get budgets
export async function getBudgets(userId: string): Promise<Budget[]> {
  if (!supabaseAdmin) return [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    return [];
  }
}

// Get user context
export async function getUserContext(userId: string): Promise<UserContext[]> {
  if (!supabaseAdmin) return [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from("user_context")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    return [];
  }
}

// Upsert user context
export async function upsertUserContext(userId: string, key: string, value: string) {
  if (!supabaseAdmin) return null;
  
  try {
    const { data, error } = await supabaseAdmin
      .from("user_context")
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() })
      .select();
    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
}

// Get spending summary
export async function getSpendingSummary(userId: string) {
  const transactions = await getRecentTransactions(userId, 100);
  
  const byCategory: Record<string, number> = {};
  let total = 0;
  
  for (const tx of transactions) {
    const amount = Math.abs(tx.amount);
    byCategory[tx.category] = (byCategory[tx.category] ?? 0) + amount;
    total += amount;
  }
  
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return {
    totalThisMonth: total,
    topCategories,
    avgMonthly: total,
    byCategory
  };
}

// Detect anomalies
export async function detectAnomalies(userId: string) {
  return [];
}

// Detect recurring subscriptions
export async function detectRecurringSubscriptions(userId: string) {
  if (!supabaseAdmin) return [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("description, amount, date")
      .eq("user_id", userId)
      .gte("date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    
    if (error) throw error;
    
    const groups: Record<string, { count: number; dates: string[]; amount: number }> = {};
    for (const tx of data ?? []) {
      const key = `${tx.description.toLowerCase().trim()}|${Math.abs(tx.amount)}`;
      if (!groups[key]) groups[key] = { count: 0, dates: [], amount: Math.abs(tx.amount) };
      groups[key].count++;
      groups[key].dates.push(tx.date);
    }
    
    return Object.entries(groups)
      .filter(([, v]) => v.count >= 2)
      .map(([key, v]) => ({
        name: key.split("|")[0],
        amount: v.amount,
        occurrences: v.count,
        lastSeen: v.dates[0],
      }));
  } catch (error) {
    return [];
  }
}
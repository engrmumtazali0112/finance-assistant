import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">FinanceAI</h1>
            <p className="text-slate-500 mt-1">Welcome to your personal finance assistant</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/chat">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Ask Assistant
              </button>
            </Link>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <p className="text-green-700 font-medium">✅ App is running!</p>
          <p className="text-sm text-green-600 mt-1">User ID: {userId.substring(0, 20)}...</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/transactions">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 hover:shadow-lg transition">
              <h2 className="text-xl font-semibold text-slate-900">Transactions</h2>
              <p className="text-slate-500 text-sm mt-2">View and manage your transactions</p>
            </div>
          </Link>
          
          <Link href="/dashboard/chat">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 hover:shadow-lg transition">
              <h2 className="text-xl font-semibold text-slate-900">AI Assistant</h2>
              <p className="text-slate-500 text-sm mt-2">Chat with your finance assistant</p>
            </div>
          </Link>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Next Steps</h2>
            <p className="text-slate-500 text-sm mt-2">Add Supabase keys to enable database features</p>
          </div>
        </div>

        {/* Note about Supabase */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            ⚠️ Supabase is not configured. To enable full features, add your Supabase keys to .env.local
          </p>
        </div>
      </div>
    </div>
  );
}
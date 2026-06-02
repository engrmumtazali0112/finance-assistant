import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function TrendsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Spending Trends</h1>
      <p className="text-slate-500 mt-2">Analyze your spending patterns over time</p>
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">⚠️ Add your Supabase API key to enable trend analysis</p>
      </div>
    </div>
  );
}